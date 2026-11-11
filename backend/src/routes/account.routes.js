
const express = require('express')
const { authenticateToken } = require('../middleware/auth.middleware')
const pool = require('../config/db')

const router = express.Router()

// ============================================
// ACCOUNT ACCESS AUTHORIZATION
// ============================================

async function canViewAccount(user, accountId) {
  // Administrators can view all customer accounts.
  if (user.role === 'admin') {
    return true
  }

  // Account holders and auditors need explicit permissions.
  if (
    user.role !== 'account_holder' &&
    user.role !== 'auditor'
  ) {
    return false
  }

  const permissionResult = await pool.query(
    `SELECT permission
     FROM account_permissions
     WHERE user_id = $1
       AND account_id = $2`,
    [user.id, accountId]
  )

  const permissions = permissionResult.rows.map(
    row => row.permission
  )

  // Auditors have read-only access.
  if (user.role === 'auditor') {
    return permissions.includes('view')
  }

  // Account holder permissions.
  return permissions.some(permission =>
    ['view', 'transact', 'manage'].includes(permission)
  )
}

// ============================================
// GET ACCOUNTS ACCESSIBLE TO LOGGED-IN USER
// ============================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user
    let result

    // Administrators can view all customer accounts.
    if (user.role === 'admin') {
      result = await pool.query(
        `SELECT
           id,
           account_number,
           account_name,
           account_type,
           balance_paise::text AS balance_paise,
           currency,
           is_active,
           created_at
         FROM accounts
         WHERE account_type = 'customer'
         ORDER BY id`
      )
    }

    // Account holders and auditors see only assigned accounts.
    else if (
      user.role === 'account_holder' ||
      user.role === 'auditor'
    ) {
      const permissionFilter =
        user.role === 'auditor'
          ? "ap.permission = 'view'"
          : "ap.permission IN ('view', 'transact', 'manage')"

      result = await pool.query(
        `SELECT DISTINCT
           a.id,
           a.account_number,
           a.account_name,
           a.account_type,
           a.balance_paise::text AS balance_paise,
           a.currency,
           a.is_active,
           a.created_at
         FROM accounts a
         INNER JOIN account_permissions ap
           ON ap.account_id = a.id
         WHERE ap.user_id = $1
           AND ${permissionFilter}
           AND a.account_type = 'customer'
         ORDER BY a.id`,
        [user.id]
      )
    }

    else {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view accounts',
      })
    }

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      accounts: result.rows,
    })

  } catch (error) {
    console.error('Account overview API error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve accounts',
    })
  }
})

// ============================================
// GET ACCOUNT STATEMENT
// Includes successful and refused attempts.
// ============================================

router.get('/:id/statement', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const user = req.user

    // Validate account ID.
    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid account ID',
      })
    }

    // Find customer account.
    const accountResult = await pool.query(
      `SELECT
         id,
         account_number,
         account_name,
         balance_paise::text AS balance_paise,
         currency,
         is_active
       FROM accounts
       WHERE id = $1
         AND account_type = 'customer'`,
      [id]
    )

    if (accountResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      })
    }

    const account = accountResult.rows[0]

    // Verify account-level authorization.
    const permitted = await canViewAccount(user, id)

    if (!permitted) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this account statement',
      })
    }

    // Fetch successful debit and credit entries.
    const ledgerResult = await pool.query(
      `SELECT
         le.id,
         le.transaction_id,
         le.entry_type,
         le.amount_paise::text AS amount_paise,
         le.created_at,
         t.transaction_type,
         t.initiated_by,
         u.full_name AS initiated_by_name,
         u.email AS initiated_by_email
       FROM ledger_entries le
       INNER JOIN transactions t
         ON t.id = le.transaction_id
       INNER JOIN users u
         ON u.id = t.initiated_by
       WHERE le.account_id = $1
       ORDER BY le.created_at ASC, le.id ASC`,
      [id]
    )

    // Fetch refused transaction attempts.
    const auditResult = await pool.query(
      `SELECT
         ae.id,
         ae.event_type,
         ae.outcome,
         ae.details,
         ae.actor_user_id,
         u.full_name AS initiated_by_name,
         u.email AS initiated_by_email,
         ae.created_at
       FROM audit_events ae
       LEFT JOIN users u
         ON u.id = ae.actor_user_id
       WHERE ae.outcome = 'refused'
         AND ae.event_type = 'transaction.refused'
         AND (
           ae.details ->> 'sourceAccountId' = $1
           OR ae.details ->> 'destinationAccountId' = $1
         )
       ORDER BY ae.created_at ASC, ae.id ASC`,
      [id]
    )

    // Prepare successful statement entries.
    const ledgerEntries = ledgerResult.rows.map(entry => ({
      id: entry.id,
      transactionId: entry.transaction_id,
      transactionType: entry.transaction_type,
      entryType: entry.entry_type,
      amountPaise: entry.amount_paise,
      initiatedBy: entry.initiated_by,
      initiatedByName: entry.initiated_by_name,
      initiatedByEmail: entry.initiated_by_email,
      status: 'success',
      reason: null,
      createdAt: entry.created_at,
      sortOrder: 0,
    }))

    // Prepare refused attempts.
    const refusedEntries = auditResult.rows.map(event => ({
      id: event.id,
      transactionId: null,
      transactionType: event.details.type || 'unknown',
      entryType: 'refused',
      amountPaise: event.details.amountPaise || null,
      initiatedBy: event.actor_user_id,
      initiatedByName: event.initiated_by_name,
      initiatedByEmail: event.initiated_by_email,
      status: 'refused',
      reason: event.details.reason || 'Transaction refused',
      createdAt: event.created_at,
      sortOrder: 1,
    }))

    // Combine entries chronologically.
    const statementEntries = [
      ...ledgerEntries,
      ...refusedEntries,
    ].sort((a, b) => {
      const timeDifference =
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()

      if (timeDifference !== 0) {
        return timeDifference
      }

      return a.sortOrder - b.sortOrder
    })

    // Calculate running balance using integer paise.
    let runningBalance = 0n

    const entries = statementEntries.map(entry => {
      if (entry.status === 'success') {
        const amount = BigInt(entry.amountPaise)

        if (entry.entryType === 'credit') {
          runningBalance += amount
        } else if (entry.entryType === 'debit') {
          runningBalance -= amount
        }
      }

      return {
        id: entry.id,
        transactionId: entry.transactionId,
        transactionType: entry.transactionType,
        entryType: entry.entryType,
        amountPaise: entry.amountPaise,
        runningBalancePaise: runningBalance.toString(),
        initiatedBy: entry.initiatedBy,
        initiatedByName: entry.initiatedByName,
        initiatedByEmail: entry.initiatedByEmail,
        status: entry.status,
        reason: entry.reason,
        createdAt: entry.createdAt,
      }
    })

    return res.status(200).json({
      success: true,
      account: {
        id: account.id,
        accountNumber: account.account_number,
        accountName: account.account_name,
        balancePaise: account.balance_paise,
        currency: account.currency,
        isActive: account.is_active,
      },
      count: entries.length,
      statement: entries,
    })

  } catch (error) {
    console.error('Account statement API error:', error.message)

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve account statement',
    })
  }
})

module.exports = router
