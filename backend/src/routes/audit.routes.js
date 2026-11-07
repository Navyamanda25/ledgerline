
const express = require('express')
const pool = require('../config/db')

const {
  authenticateToken,
  authorizeRoles,
} = require('../middleware/auth.middleware')

const router = express.Router()

// GET /api/audit
// Only administrators and auditors can view the global audit trail.
router.get(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'auditor'),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           ae.id,
           ae.actor_user_id,
           u.full_name AS actor_name,
           u.email AS actor_email,
           ae.event_type,
           ae.outcome,
           ae.details,
           ae.created_at
         FROM audit_events ae
         LEFT JOIN users u
           ON u.id = ae.actor_user_id
         ORDER BY ae.created_at DESC, ae.id DESC
         LIMIT 200`
      )

      return res.status(200).json({
        success: true,
        count: result.rows.length,
        events: result.rows,
      })
    } catch (error) {
      console.error('Audit trail API error:', error.message)

      return res.status(500).json({
        success: false,
        message: 'Unable to retrieve audit events',
      })
    }
  }
)

module.exports = router
