
const jwt = require('jsonwebtoken')
const pool = require('../config/db')

// Verify the user's JWT token.
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      })
    }

    const token = authHeader.split(' ')[1]

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    // Confirm that the user still exists and is active.
    const result = await pool.query(
      `SELECT id, full_name, email, role, is_active
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    )

    const user = result.rows[0]

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or unavailable',
      })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token',
    })
  }
}

// Restrict access based on user roles.
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      })
    }

    next()
  }
}

module.exports = {
  authenticateToken,
  authorizeRoles,
}
