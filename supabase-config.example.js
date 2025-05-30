// Copy this file to 'supabase-config.js' and fill in your Supabase connection details
// You can find these in your Supabase project settings under "Database" > "Connection info"

module.exports = {
  host: 'YOUR_SUPABASE_HOST', // IMPORTANT: Remove 'https://' - just use the hostname like 'db.abcdefghijklmnop.supabase.co'
  port: 5432,
  database: 'postgres',
  user: 'postgres', // Usually 'postgres'
  password: 'YOUR_SUPABASE_PASSWORD', // Your database password
  ssl: {
    rejectUnauthorized: false
  }
};

// Example filled in (notice NO https:// in the host):
// module.exports = {
//   host: 'db.zwtkroeaamchwmilkgpr.supabase.co',  // ← NO 'https://' prefix!
//   port: 5432,
//   database: 'postgres',
//   user: 'postgres',
//   password: 'your-super-secret-password',
//   ssl: {
//     rejectUnauthorized: false
//   }
// };

// ❌ WRONG: host: 'https://db.zwtkroeaamchwmilkgpr.supabase.co'
// ✅ CORRECT: host: 'db.zwtkroeaamchwmilkgpr.supabase.co'