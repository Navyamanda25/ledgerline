
const fs = require('fs')
const path = require('path')
const pool = require('../src/config/db')
const { createTransaction } = require('../src/services/transaction.service')

const seedDirectory = path.join(__dirname, '../../database/seeds')

async function resetTestDatabase() {
  await pool.query(`
    TRUNCATE TABLE
      audit_events,
      ledger_entries,
      transactions,
      account_permissions,
      accounts,
      users
    RESTART IDENTITY CASCADE
  `)

  await pool.query(
    fs.readFileSync(path.join(seedDirectory, '001_test_users.sql'), 'utf8')
  )

  await pool.query(
    fs.readFileSync(path.join(seedDirectory, '002_test_accounts.sql'), 'utf8')
  )

  await pool.query(
    fs.readFileSync(path.join(seedDirectory, '003_opening_balances.sql'), 'utf8')
  )

  await pool.query(`
    UPDATE accounts
    SET balance_paise = -1500000
    WHERE account_number = 'LLSYSTEM001'
  `)
}

describe('LedgerLine money transfer', () => {
  beforeAll(async () => {
    await resetTestDatabase()
  })

  afterAll(async () => {
    await pool.end()
  })

  test('should transfer money and keep customer balances correct', async () => {
    const result = await createTransaction({
      type: 'transfer',
      sourceAccountId: '1',
      destinationAccountId: '2',
      amountPaise: '10000',
      idempotencyKey: 'TEST-TRANSFER-001',
      userId: 2,
    })

    expect(result.success).toBe(true)

    const balances = await pool.query(`
      SELECT account_number, balance_paise
      FROM accounts
      WHERE id IN (1, 2)
      ORDER BY id
    `)

    expect(balances.rows).toEqual([
      { account_number: 'LL10000001', balance_paise: '990000' },
      { account_number: 'LL10000002', balance_paise: '510000' },
    ])

    const entries = await pool.query(
      `SELECT account_id, entry_type, amount_paise
       FROM ledger_entries
       WHERE transaction_id = $1
       ORDER BY account_id`,
      [result.transactionId]
    )

    expect(entries.rows).toHaveLength(2)
    expect(entries.rows.map(entry => entry.entry_type).sort())
      .toEqual(['credit', 'debit'])
  })

  test('should not transfer money twice when the same request is retried', async () => {
    const request = {
      type: 'transfer',
      sourceAccountId: '1',
      destinationAccountId: '2',
      amountPaise: '5000',
      idempotencyKey: 'TEST-IDEMPOTENCY-001',
      userId: 2,
    }

    const firstResult = await createTransaction(request)
    const secondResult = await createTransaction(request)

    expect(firstResult.success).toBe(true)
    expect(secondResult.success).toBe(true)
    expect(secondResult.replayed).toBe(true)
    expect(secondResult.transactionId).toBe(firstResult.transactionId)

    const count = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM transactions
       WHERE idempotency_key = $1`,
      [request.idempotencyKey]
    )

    expect(count.rows[0].total).toBe(1)
  })

  test('should refuse a withdrawal when the account has insufficient funds', async () => {
    const before = await pool.query(`
      SELECT balance_paise FROM accounts WHERE id = 1
    `)

    let error

    try {
      await createTransaction({
        type: 'withdrawal',
        sourceAccountId: '1',
        destinationAccountId: '3',
        amountPaise: '2000000',
        idempotencyKey: 'TEST-INSUFFICIENT-001',
        userId: 2,
      })
    } catch (err) {
      error = err
    }

    expect(error).toBeDefined()
    expect(error.message.toLowerCase()).toContain('insufficient')

    const after = await pool.query(`
      SELECT balance_paise FROM accounts WHERE id = 1
    `)

    expect(after.rows[0].balance_paise)
      .toBe(before.rows[0].balance_paise)
  })

  test('should prevent two simultaneous withdrawals from overspending an account', async () => {
    const results = await Promise.allSettled([
      createTransaction({
        type: 'withdrawal',
        sourceAccountId: '1',
        destinationAccountId: '3',
        amountPaise: '700000',
        idempotencyKey: 'TEST-CONCURRENT-001',
        userId: 2,
      }),
      createTransaction({
        type: 'withdrawal',
        sourceAccountId: '1',
        destinationAccountId: '3',
        amountPaise: '700000',
        idempotencyKey: 'TEST-CONCURRENT-002',
        userId: 2,
      }),
    ])

    const successful = results.filter(r => r.status === 'fulfilled')
    const refused = results.filter(r => r.status === 'rejected')

    expect(successful).toHaveLength(1)
    expect(refused).toHaveLength(1)
    expect(refused[0].reason.message).toContain('Insufficient funds')

    const balance = await pool.query(`
      SELECT balance_paise FROM accounts WHERE id = 1
    `)

    expect(balance.rows[0].balance_paise).toBe('285000')
  })

  test('should prevent updating or deleting ledger entries', async () => {
    const entry = await pool.query(`
      SELECT id FROM ledger_entries ORDER BY id LIMIT 1
    `)

    const entryId = entry.rows[0].id

    await expect(
      pool.query(
        `UPDATE ledger_entries SET amount_paise = 1 WHERE id = $1`,
        [entryId]
      )
    ).rejects.toThrow('append-only')

    await expect(
      pool.query(
        `DELETE FROM ledger_entries WHERE id = $1`,
        [entryId]
      )
    ).rejects.toThrow('append-only')
  })
})
