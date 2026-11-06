
const request = require('supertest')
const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')

const app = require('../src/server')
const pool = require('../src/config/db')

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

  await pool.query(`
    UPDATE accounts
    SET balance_paise = -1500000
    WHERE account_type = 'system'
  `)
}

describe('LedgerLine API tests', () => {
  let holderToken
  let auditorToken

  beforeAll(async () => {
    await resetTestDatabase()

    const holderLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'holder@ledgerline.local',
        password: 'Holder@12345',
      })

    expect(holderLogin.statusCode).toBe(200)
    holderToken = holderLogin.body.token

    const auditorLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'auditor@ledgerline.local',
        password: 'Auditor@12345',
      })

    expect(auditorLogin.statusCode).toBe(200)
    auditorToken = auditorLogin.body.token
  })

  afterAll(async () => {
    await pool.end()
  })

  test('should return backend health status', async () => {
    const response = await request(app)
      .get('/api/health')

    expect(response.statusCode).toBe(200)
    expect(response.body.success).toBe(true)
  })

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
})
