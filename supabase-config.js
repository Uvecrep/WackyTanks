// Load environment variables
require('dotenv').config();

// Supabase connection configuration using environment variables
// Create a '.env' file based on 'env-template.txt' and fill in your actual connection details
// You can find these in your Supabase project settings under "Database" > "Connection info"

module.exports = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
  },
  // Add connection timeout and retry settings
  connectionTimeoutMillis: 10000, // 10 seconds
  idleTimeoutMillis: 30000, // 30 seconds
  query_timeout: 20000, // 20 seconds for queries
  // Force IPv4 if IPv6 is causing issues
  family: 4
};

// Validate that required environment variables are set
if (!process.env.DB_PASSWORD) {
  console.error('❌ ERROR: DB_PASSWORD environment variable is required!');
  console.error('Please create a .env file based on env-template.txt');
  process.exit(1);
}

if (!process.env.DB_HOST) {
  console.error('❌ ERROR: DB_HOST environment variable is required!');
  console.error('Please create a .env file based on env-template.txt');
  process.exit(1);
}