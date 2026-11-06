// Load local environment variables first.
require('dotenv').config()

// Force automated tests to use the isolated test database.
process.env.DB_NAME = 'ledgerline_test'

// Test-only JWT secret.
process.env.JWT_SECRET =
  'ledgerline_test_secret_only_do_not_use_in_production'