
const request = require('supertest')
const fs = require('fs')
const path = require('path')

const app = require('../src/server')
const pool = require('../src/config/db')

// ============================================
// RESET ISOLATED TEST DATABASE - SAFELY
// ============================================

async function resetTestDatabase() {
  // Verify the actual database before any destructive operation.
  const dbCheck = await pool.query(
    'SELECT current_database() AS database'
  )

  const currentDatabase = dbCheck.rows[0].database

  if (currentDatabase !== 'ledgerline_test') {
    throw new Error(
      `SAFETY ERROR: Refusing to reset database "${currentDatabase}". Only ledgerline_test is allowed.`
    )
  }

  console.log(
    'Safety check passed: connected to ledgerline_test'
  )

  // Reset only the isolated test database.
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

  const seedFiles = [
    '../../database/seeds/001_test_users.sql',
    '../../database/seeds/002_test_accounts.sql',
    '../../database/seeds/003_opening_balances.sql',
  ]

  for (const file of seedFiles) {
    const filePath = path.join(__dirname, file)
    const sql = fs.readFileSync(filePath, 'utf8')
    await pool.query(sql)
  }

  // Reconcile the system account's opening balance.
  await pool.query(`
    UPDATE accounts
    SET balance_paise = -1500000
    WHERE account_type = 'system'
  `)

  // Create a third customer account without holder permission.
  await pool.query(`
    INSERT INTO accounts (
      account_number,
      account_name,
      account_type,
      balance_paise
    )
    VALUES (
      'LL10000003',
      'Restricted Test Account',
      'customer',
      250000
    )
  `)

  // Give the auditor read-only permission for account 1.
  await pool.query(`
    INSERT INTO account_permissions (
      user_id,
      account_id,
      permission
    )
    VALUES (3, 1, 'view')
  `)
}

// ============================================
// API TESTS
// ============================================

describe('LedgerLine API tests', () => {
  let holderToken
  let auditorToken
  let adminToken

  beforeAll(async () => {
    await resetTestDatabase()

    // Account holder login.
    const holderLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'holder@ledgerline.local',
        password: 'Holder@12345',
      })

    expect(holderLogin.statusCode).toBe(200)
    holderToken = holderLogin.body.token

    // Auditor login.
    const auditorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'auditor@ledgerline.local',
        password: 'Auditor@12345',
      })

    expect(auditorLogin.statusCode).toBe(200)
    auditorToken = auditorLogin.body.token

    // Administrator login.
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@ledgerline.local',
        password: 'Admin@12345',
      })

    expect(adminLogin.statusCode).toBe(200)
    adminToken = adminLogin.body.token
  })

  afterAll(async () => {
    await pool.end()
  })

  // ============================================
  // HEALTH CHECK
  // ============================================

  test('should return backend health status', async () => {
    const response = await request(app)
      .get('/api/health')

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
  })

  // ============================================
  // AUTHENTICATION TESTS
  // ============================================

  test('should reject a request without an authentication token', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .send({})

    expect(response.statusCode).toBe(401)
  })

  test('should reject an invalid authentication token', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', 'Bearer invalid-token')
      .send({})

    expect(response.statusCode).toBe(401)
  })

  // ============================================
  // ACCOUNT OVERVIEW TESTS
  // ============================================

  test('should reject account access without authentication', async () => {
    const response = await request(app)
      .get('/api/accounts')

    expect(response.statusCode).toBe(401)
  })

  test('should allow an account holder to view permitted accounts only', async () => {
    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${holderToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.count).toBe(2)

    const accountNumbers = response.body.accounts.map(
      account => account.account_number
    )

    expect(accountNumbers).toContain('LL10000001')
    expect(accountNumbers).toContain('LL10000002')
    expect(accountNumbers).not.toContain('LL10000003')

    expect(response.body.accounts[0].balance_paise).toBe('1000000')
  })

  test('should allow administrators to view all customer accounts', async () => {
    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.count).toBe(3)

    const accountNumbers = response.body.accounts.map(
      account => account.account_number
    )

    expect(accountNumbers).toContain('LL10000001')
    expect(accountNumbers).toContain('LL10000002')
    expect(accountNumbers).toContain('LL10000003')
  })

  test('should allow auditors to view explicitly assigned accounts only', async () => {
    const response = await request(app)
      .get('/api/accounts')
      .set('Authorization', `Bearer ${auditorToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.count).toBe(1)

    expect(response.body.accounts[0].account_number)
      .toBe('LL10000001')
  })

  // ============================================
  // TRANSACTION AUTHORIZATION TESTS
  // ============================================

  test('should allow an account holder to make a permitted transfer', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${holderToken}`)
      .send({
        type: 'transfer',
        sourceAccountId: '1',
        destinationAccountId: '2',
        amountPaise: '1000',
        idempotencyKey: 'API-TEST-TRANSFER-001',
      })

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
  })

  test('should prevent an auditor from creating a withdrawal', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({
        type: 'withdrawal',
        sourceAccountId: '1',
        destinationAccountId: '3',
        amountPaise: '1000',
        idempotencyKey: 'API-TEST-AUDITOR-001',
      })

    expect(response.statusCode).toBe(403)
  })

  test('should prevent an account holder from creating a deposit', async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Authorization', `Bearer ${holderToken}`)
      .send({
        type: 'deposit',
        sourceAccountId: '3',
        destinationAccountId: '1',
        amountPaise: '1000',
        idempotencyKey: 'API-TEST-DEPOSIT-001',
      })

    expect(response.statusCode).toBe(403)
  })

  // ============================================
  // ACCOUNT STATEMENT TESTS
  // ============================================

  test('should allow an account holder to view a permitted account statement', async () => {
    const response = await request(app)
      .get('/api/accounts/1/statement')
      .set('Authorization', `Bearer ${holderToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.account.accountNumber).toBe('LL10000001')
    expect(Array.isArray(response.body.statement)).toBe(true)
  })

  test('should prevent an account holder from viewing a restricted account statement', async () => {
    const response = await request(app)
      .get('/api/accounts/4/statement')
      .set('Authorization', `Bearer ${holderToken}`)

    expect(response.statusCode).toBe(403)
  })

  test('should allow an auditor to view an explicitly assigned account statement', async () => {
    const response = await request(app)
      .get('/api/accounts/1/statement')
      .set('Authorization', `Bearer ${auditorToken}`)

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.account.accountNumber).toBe('LL10000001')
  })

  test('should show successful debit and credit entries with correct running balances', async () => {
    const response = await request(app)
      .get('/api/accounts/1/statement')
      .set('Authorization', `Bearer ${holderToken}`)

    expect(response.statusCode).toBe(200)

    const successfulEntries = response.body.statement.filter(
      entry => entry.status === 'success'
    )

    const debitEntry = successfulEntries.find(
      entry => entry.entryType === 'debit'
    )

    expect(debitEntry).toBeDefined()
    expect(debitEntry.amountPaise).toBe('1000')
    expect(debitEntry.runningBalancePaise).toBe('999000')

    const finalSuccessfulEntry =
      successfulEntries[successfulEntries.length - 1]

    expect(finalSuccessfulEntry.runningBalancePaise).toBe('999000')
  })

  test('should include refused attempts without changing the running balance', async () => {
    const response = await request(app)
      .get('/api/accounts/1/statement')
      .set('Authorization', `Bearer ${holderToken}`)

    expect(response.statusCode).toBe(200)

    const refusedEntries = response.body.statement.filter(
      entry => entry.status === 'refused'
    )

    expect(refusedEntries.length).toBeGreaterThanOrEqual(2)

    refusedEntries.forEach(entry => {
      expect(entry.entryType).toBe('refused')
      expect(entry.runningBalancePaise).toBe('999000')
    })
  })
})
