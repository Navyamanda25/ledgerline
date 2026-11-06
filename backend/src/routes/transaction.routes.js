
const express = require('express')
const { z } = require('zod')

const { authenticateToken } = require('../middleware/auth.middleware')
const { createTransaction } = require('../services/transaction.service')

const router = express.Router()

// Validate transaction request data.
const transactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'transfer']),
  sourceAccountId: z.string().regex(/^[1-9]\d*$/),
  destinationAccountId: z.string().regex(/^[1-9]\d*$/),
  amountPaise: z.string().regex(/^[1-9]\d*$/),
  idempotencyKey: z.string().trim().min(1).max(255),
})

// POST /api/transactions
router.post('/', authenticateToken, async (req, res) => {
  try {
    const validation = transactionSchema.safeParse(req.body)

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction request',
        errors: validation.error.issues,
      })
    }

    // Never accept userId from the client.
    // Use the identity verified by JWT middleware.
    const result = await createTransaction({
      ...validation.data,
      userId: req.user.id,
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Transaction API error:', error.message)

    const message = error.message.toLowerCase()

    let statusCode = 500

    if (
      message.includes('authorized') ||
      message.includes('permission') ||
      message.includes('administrator') ||
      message.includes('inactive') ||
      message.includes('does not exist')
    ) {
      statusCode = 403
    } else if (message.includes('insufficient funds')) {
      statusCode = 422
    } else if (message.includes('idempotency key')) {
      statusCode = 409
    } else if (
      message.includes('invalid') ||
      message.includes('must differ') ||
      message.includes('required') ||
      message.includes('active') ||
      message.includes('exist') ||
      message.includes('accounts for')
    ) {
      statusCode = 400
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message,
    })
  }
})

module.exports = router
