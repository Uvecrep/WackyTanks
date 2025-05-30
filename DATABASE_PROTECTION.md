# 🛡️ WackyTanks Database Protection System

A comprehensive database protection system that automatically manages row limits, performs cleanup operations, and prevents database bloat.

## 🚀 Features

### Automatic Protection
- **Row Limit Enforcement**: Configurable limits for each table
- **Automatic Cleanup**: Scheduled deletion of old records when limits are exceeded
- **Preemptive Cleanup**: Triggers cleanup at 90% capacity during user creation
- **Background Monitoring**: Runs every 10 minutes (configurable)

### Management & Monitoring
- **Real-time Status**: Live database statistics and usage percentages
- **Admin Panel**: Beautiful web interface for monitoring and control
- **Manual Cleanup**: On-demand cleanup operations
- **Dynamic Limits**: Update table limits without restarting the server

### Safety Features
- **Oldest-First Deletion**: Removes oldest records first (based on `created_at`)
- **Detailed Logging**: Comprehensive logs of all cleanup operations
- **Error Handling**: Graceful handling of database errors
- **Connection Management**: Proper connection pooling and cleanup

## 📊 Default Limits

| Table | Default Limit | Purpose |
|-------|---------------|---------|
| `users` | 10,000 | User accounts |
| `game_sessions` | 5,000 | Game session logs (future) |
| `chat_logs` | 50,000 | Chat message logs (future) |
| `player_stats` | 20,000 | Player statistics (future) |

## 🎮 Quick Start

### 1. Start Your Server
```bash
npm start
```

The database protection system will automatically start and begin monitoring your database.

### 2. Access Admin Panel
Navigate to: `http://localhost:2000/admin`

### 3. Monitor Status
The admin panel shows:
- Current row counts for each table
- Usage percentages with color-coded progress bars
- Last cleanup timestamp
- Real-time logs of operations

## 🔧 Configuration

### Updating Table Limits

**Via Admin Panel:**
1. Go to `http://localhost:2000/admin`
2. Use the "Update Table Limit" form
3. Select table and enter new limit
4. Click "Update Limit"

**Via API:**
```javascript
// POST to /db-update-limit
{
  "tableName": "users",
  "newLimit": 15000
}
```

**Via Code:**
```javascript
// In your application
dbManager.updateTableLimit('users', 15000);
```

### Changing Cleanup Interval

Edit `database-manager.js`:
```javascript
// Change cleanup interval (in milliseconds)
this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
```

## 📡 API Endpoints

### GET `/db-status`
Returns current database status and statistics.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "database_status": {
    "last_cleanup": "2024-01-01T11:50:00.000Z",
    "cleanup_interval_minutes": 10,
    "tables": {
      "users": {
        "current_rows": 1250,
        "max_rows": 10000,
        "usage_percentage": 13,
        "needs_cleanup": false
      }
    }
  }
}
```

### POST `/db-cleanup`
Triggers manual cleanup of all tables.

**Response:**
```json
{
  "success": true,
  "message": "Manual cleanup completed successfully",
  "database_status": { /* ... */ }
}
```

### POST `/db-update-limit`
Updates the row limit for a specific table.

**Request:**
```json
{
  "tableName": "users",
  "newLimit": 15000
}
```

## 🔍 Monitoring & Logs

### Server Console Logs
```
🕐 Database cleanup scheduler started (interval: 10 minutes)
✅ Table users: 1250/10000 rows (OK)
⚠️  Table users: 10500/10000 rows (LIMIT EXCEEDED)
🗑️  Deleting 500 oldest entries...
✅ Successfully deleted 500 rows from users
```

### Admin Panel Logs
The admin panel provides real-time logs with timestamps and categorized messages:
- **INFO**: General information
- **WARN**: Warnings and manual operations
- **ERROR**: Error messages

## ⚙️ How It Works

### 1. Automatic Monitoring
The system runs a background scheduler that:
- Checks each table's row count every 10 minutes
- Compares against configured limits
- Triggers cleanup when limits are exceeded

### 2. Smart Cleanup Strategy
When cleanup is needed:
- Calculates how many rows to delete (current - limit)
- Deletes oldest records first (ORDER BY created_at ASC)
- Logs the operation with detailed statistics
- Updates the last cleanup timestamp

### 3. Preemptive Protection
During user creation:
- Checks if users table is at 90% capacity
- Performs cleanup before creating new user
- Ensures new users can always be created

### 4. Connection Management
- Creates fresh connections for each operation
- Properly closes connections to prevent leaks
- Handles connection errors gracefully

## 🛠 Customization

### Adding New Tables

1. **Update limits in `database-manager.js`:**
```javascript
this.tableLimits = {
  users: 10000,
  your_new_table: 5000  // Add your table here
};
```

2. **Add to admin panel dropdown:**
Edit `client/admin.html`:
```html
<option value="your_new_table">Your New Table</option>
```

### Custom Cleanup Strategies

Edit the `enforceTableLimit` method in `database-manager.js`:
```javascript
switch (tableName) {
  case 'your_table':
    // Custom deletion logic for your table
    deleteQuery = `
      DELETE FROM ${tableName} 
      WHERE some_condition = true
      ORDER BY your_timestamp ASC 
      LIMIT $1
    `;
    break;
}
```

## 🔒 Security Considerations

- **Admin Panel Access**: Consider adding authentication for production use
- **Rate Limiting**: The cleanup operations are throttled to prevent database overload
- **Data Integrity**: Only deletes complete records, never partial data
- **Backup Strategy**: Consider backing up data before large cleanup operations

## 🐛 Troubleshooting

### Common Issues

**"Table doesn't exist" errors:**
- Make sure your tables are created in the database
- Check table names match exactly (case-sensitive)

**Connection timeouts:**
- Verify your Supabase configuration is correct
- Check if your database is active and accessible

**Cleanup not working:**
- Ensure tables have a `created_at` timestamp column
- Check server console for detailed error messages

### Debug Mode
Enable detailed logging by modifying the log statements in `database-manager.js`.

## 📈 Performance Tips

1. **Index Creation**: Add indexes on `created_at` columns for faster cleanup
```sql
CREATE INDEX idx_users_created_at ON users(created_at);
```

2. **Batch Operations**: For very large tables, consider implementing batch deletion

3. **Monitoring**: Use the admin panel to monitor database performance and adjust limits accordingly

---

**🎯 Your database is now protected!** The system will automatically maintain optimal performance while preventing unlimited growth. 