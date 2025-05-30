// Copy this file to 'supabase-config.js' and fill in your Supabase connection details
// You can find these in your Supabase project settings under "Database" > "Connection info"

module.exports = {
  host: 'YOUR_SUPABASE_HOST',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'YOUR_SUPABASE_PASSWORD',
  ssl: {
    rejectUnauthorized: false
  }
};