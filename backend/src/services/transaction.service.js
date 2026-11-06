
const pool = require('../config/db')
const crypto = require('crypto')

// ============================================
// VALIDATION
// ============================================

function validateAmount(amountPaise) {
  if (
    typeof amountPaise !== 'string' ||
    !/^[1-9]\d*$/.test(amountPaise)
  ) {
    throw new Error('Amount must be a positive integer in paise')
  }

  return BigInt(amountPaise)
}

function createRequestHash(data) {
  const canonicalRequest = JSON.stringify({
    type: data.type,
    sourceAccountId: String(data.sourceAccountId),
    destinationAccountId: String(data.destinationAccountId),
    amountPaise: String(data.amountPaise),
    initiatedBy: String(data.userId),
  })

  return crypto
    .createHash('sha256')
    .update(canonicalRequest)
    .digest('hex')
}

// ============================================
// AUDIT REFUSED OPERATIONS
// ============================================

async function recordAuditFailure(userId, eventType, details) {
  try {
    await pool.query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, outcome, details)
       VALUES ($1, $2, 'refused', $3)`,
      [
        userId || null,
        eventType,
        JSON.stringify(details),
      ]
    )
  } catch (error) {
    console.error('Audit recording failed:', error.message)
  }
}

// ============================================
// CREATE TRANSACTION
// ============================================

async function createTransaction(data) {
  const {
    type,
    sourceAccountId,
    destinationAccountId,
    amountPaise,
    userId,
    idempotencyKey,
  } = data

  let client
  let auditDetails = {}

  try {
    // 1. Validate transaction type.
    if (!['deposit', 'withdrawal', 'transfer'].includes(type)) {
      throw new Error('Invalid transaction type')
    }

    // 2. Validate idempotency key.
    if (
      typeof idempotencyKey !== 'string' ||
      !idempotencyKey.trim() ||
      idempotencyKey.length > 255
    ) {
      throw new Error('A valid idempotency key is required')
    }

    // 3. Validate IDs.
    if (
      !/^[1-9]\d*$/.test(String(sourceAccountId)) ||
      !/^[1-9]\d*$/.test(String(destinationAccountId)) ||
      !/^[1-9]\d*$/.test(String(userId))
    ) {
      throw new Error('Invalid account or user ID')
    }

    // 4. Validate amount.
    const amount = validateAmount(String(amountPaise))

    if (String(sourceAccountId) === String(destinationAccountId)) {
      throw new Error('Source and destination accounts must differ')
    }

    auditDetails = {
      type,
      sourceAccountId: String(sourceAccountId),
      destinationAccountId: String(destinationAccountId),
      amountPaise: String(amountPaise),
    }

    const requestHash = createRequestHash({
      type,
      sourceAccountId,
      destinationAccountId,
      amountPaise,
      userId,
    })

    // 5. Start database transaction.
    client = await pool.connect()
    await client.query('BEGIN')

    // 6. Verify user.
    const userResult = await client.query(
      `SELECT id, role, is_active
       FROM users
       WHERE id = $1`,
      [userId]
    )

    const user = userResult.rows[0]

    if (!user || !user.is_active) {
      throw new Error('User is inactive or does not exist')
    }

    // 7. Role-based authorization.
    if (type === 'deposit' && user.role !== 'admin') {
      throw new Error('Only administrators can initiate deposits')
    }

    if (
      ['withdrawal', 'transfer'].includes(type) &&
      user.role !== 'account_holder'
    ) {
      throw new Error('You are not authorized to perform this transaction')
    }

    if (!['admin', 'account_holder'].includes(user.role)) {
      throw new Error('You are not authorized to perform transactions')
    }

    // 8. Serialize requests using the same idempotency key.
    // The lock is automatically released at COMMIT or ROLLBACK.
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [idempotencyKey]
    )

    // 9. Check for an existing request.
    const existingResult = await client.query(
      `SELECT id, request_hash
       FROM transactions
       WHERE idempotency_key = $1`,
      [idempotencyKey]
    )

    if (existingResult.rowCount > 0) {
      const existing = existingResult.rows[0]

      if (existing.request_hash !== requestHash) {
        throw new Error(
          'Idempotency key has already been used for a different request'
        )
      }

      await client.query('COMMIT')

      return {
        success: true,
        replayed: true,
        transactionId: existing.id,
        message: 'Original transaction result returned',
      }
    }

    // 10. Lock both accounts in a consistent order.
    // BigInt avoids JavaScript Number precision issues with large IDs.
    const accountIds = [
      String(sourceAccountId),
      String(destinationAccountId),
    ].sort((a, b) => {
      const first = BigInt(a)
      const second = BigInt(b)

      return first < second ? -1 : first > second ? 1 : 0
    })

    const lockedAccounts = await client.query(
      `SELECT id, account_type, balance_paise, is_active
       FROM accounts
       WHERE id = ANY($1::bigint[])
       ORDER BY id
       FOR UPDATE`,
      [accountIds]
    )

    if (lockedAccounts.rowCount !== 2) {
      throw new Error('One or both accounts do not exist')
    }

    const accounts = new Map(
      lockedAccounts.rows.map(account => [
        String(account.id),
        account,
      ])
    )

    const source = accounts.get(String(sourceAccountId))
    const destination = accounts.get(String(destinationAccountId))

    // 11. Validate account status.
    if (!source.is_active || !destination.is_active) {
      throw new Error('Both accounts must be active')
    }

    // 12. Validate account types.
    if (type === 'deposit') {
      if (
        source.account_type !== 'system' ||
        destination.account_type !== 'customer'
      ) {
        throw new Error('Invalid accounts for deposit')
      }
    }

    if (type === 'withdrawal') {
      if (
        source.account_type !== 'customer' ||
        destination.account_type !== 'system'
      ) {
        throw new Error('Invalid accounts for withdrawal')
      }
    }

    if (type === 'transfer') {
      if (
        source.account_type !== 'customer' ||
        destination.account_type !== 'customer'
      ) {
        throw new Error('Transfers require two customer accounts')
      }
    }

    // 13. Check customer account permissions.
    const customerAccountIds = [
      source.account_type === 'customer' ? sourceAccountId : null,
      destination.account_type === 'customer' ? destinationAccountId : null,
    ].filter(Boolean)

    if (user.role === 'account_holder') {
      for (const accountId of customerAccountIds) {
        const permissionResult = await client.query(
          `SELECT 1
           FROM account_permissions
           WHERE user_id = $1
             AND account_id = $2
             AND permission IN ('transact', 'manage')`,
          [userId, accountId]
        )

        if (permissionResult.rowCount === 0) {
          throw new Error('You do not have permission for this account')
        }
      }
    }

    // 14. Check customer balance.
    const sourceBalance = BigInt(source.balance_paise)

    if (
      source.account_type === 'customer' &&
      sourceBalance < amount
    ) {
      throw new Error('Insufficient funds')
    }

    // 15. Reserve the idempotency key.
    // Account locks are already acquired before this insert.
    const inserted = await client.query(
      `INSERT INTO transactions (
        idempotency_key,
        request_hash,
        transaction_type,
        source_account_id,
        destination_account_id,
        amount_paise,
        initiated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        idempotencyKey,
        requestHash,
        type,
        sourceAccountId,
        destinationAccountId,
        amountPaise,
        userId,
      ]
    )

    const transactionId = inserted.rows[0].id

    // 16. Update source account.
    await client.query(
      `UPDATE accounts
       SET balance_paise = balance_paise - $1::bigint
       WHERE id = $2`,
      [amountPaise, sourceAccountId]
    )

    // 17. Update destination account.
    await client.query(
      `UPDATE accounts
       SET balance_paise = balance_paise + $1::bigint
       WHERE id = $2`,
      [amountPaise, destinationAccountId]
    )

    // 18. Insert matching debit and credit ledger entries.
    await client.query(
      `INSERT INTO ledger_entries (
        transaction_id,
        account_id,
        entry_type,
        amount_paise
      )
      VALUES
        ($1, $2, 'debit', $3),
        ($1, $4, 'credit', $3)`,
      [
        transactionId,
        sourceAccountId,
        amountPaise,
        destinationAccountId,
      ]
    )

    // 19. Record successful audit event.
    await client.query(
      `INSERT INTO audit_events (
        actor_user_id,
        event_type,
        outcome,
        details
      )
      VALUES ($1, $2, 'success', $3)`,
      [
        userId,
        `transaction.${type}`,
        JSON.stringify({
          transactionId,
          amountPaise: String(amountPaise),
          sourceAccountId: String(sourceAccountId),
          destinationAccountId: String(destinationAccountId),
        }),
      ]
    )

    // 20. Commit everything atomically.
    await client.query('COMMIT')

    return {
      success: true,
      replayed: false,
      transactionId,
      message: 'Transaction completed successfully',
    }

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {})
    }

    // Record refused attempts outside the rolled-back transaction.
    await recordAuditFailure(
      userId,
      'transaction.refused',
      {
        ...auditDetails,
        reason: error.message,
      }
    )

    throw error

  } finally {
    if (client) {
      client.release()
    }
  }
}

module.exports = {
  createTransaction,
}
