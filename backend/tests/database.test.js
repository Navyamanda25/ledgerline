
const pool = require('../src/config/db')

describe('LedgerLine database connection', () => {
  afterAll(async () => {
    await pool.end()
  })

  test('should connect to the isolated test database', async () => {
    const result = await pool.query(
      'SELECT current_database() AS database'
    )

    expect(result.rows[0].database).toBe('ledgerline_test')
  })

  test('should contain all six required tables', async () => {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    const tables = result.rows.map(row => row.table_name)

    expect(tables).toEqual(
      expect.arrayContaining([
        'users',
        'accounts',
        'account_permissions',
        'transactions',
        'ledger_entries',
        'audit_events',
      ])
    )
  })
})
