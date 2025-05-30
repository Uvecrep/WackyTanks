# Supabase Setup for WackyTanks

This project has been migrated from MongoDB to Supabase (PostgreSQL) for better reliability and modern database features.

## 🚀 Setup Steps

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for the project to be ready (usually takes 1-2 minutes)

### 2. Create Database Table
1. In your Supabase dashboard, go to the **SQL Editor**
2. Run this SQL command to create the users table:

```sql
-- Create the users table for WackyTanks
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

### 3. Get Connection Details
1. In your Supabase dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection info**
3. You'll need these details:
   - Host (e.g., `db.abcdefghijklmnop.supabase.co`) - **⚠️ IMPORTANT: Remove `https://` if it's included!**
   - Database name: `postgres`
   - Username: `postgres`
   - Password: Your project's database password
   - Port: `5432`

### 4. Configure WackyTanks
1. Copy the example config file:
   ```bash
   cp supabase-config.example.js supabase-config.js
   ```

2. Edit `supabase-config.js` with your Supabase connection details:
   ```javascript
   module.exports = {
     host: 'db.your-project-ref.supabase.co', // NO 'https://' prefix!
     port: 5432,
     database: 'postgres',
     user: 'postgres',
     password: 'your-database-password',
     ssl: {
       rejectUnauthorized: false
     }
   };
   ```

### 5. Test the Connection
Run the application:
```bash
npm start
```

If configured correctly, you should see "Server started." without any database connection errors.

## 🔒 Security Notes

- The `supabase-config.js` file is automatically added to `.gitignore` to prevent committing sensitive credentials
- Always use strong passwords for your database
- Consider using environment variables in production

## 🛠 Troubleshooting

**"ENOTFOUND https://..." errors**: This means you included `https://` in your host field. Remove the `https://` prefix and use only the hostname.

**Connection timeout errors**: Check your Supabase project is active and the connection details are correct.

**SSL/TLS errors**: Make sure the `ssl: { rejectUnauthorized: false }` setting is included in your config.

**"relation does not exist" errors**: Make sure you've run the SQL commands to create the `users` table.

## 📋 Features Migrated

- ✅ User registration (signup)
- ✅ User login authentication
- ✅ Username uniqueness validation
- ✅ Password storage (Note: Consider adding password hashing for production use)

## 🔄 Migration Changes

- Replaced MongoDB driver with PostgreSQL (`pg`) driver
- Updated queries from NoSQL (MongoDB) to SQL (PostgreSQL)
- Improved error handling and connection management
- Added configuration file system for better security 