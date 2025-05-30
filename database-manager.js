const { Client } = require('pg');
const dbConfig = require('./supabase-config');

class DatabaseManager {
  constructor() {
    // Configure table limits - configurable via environment variables
    this.tableLimits = {
      users: parseInt(process.env.DB_USERS_LIMIT) || 1000,
    };
    
    // Cleanup intervals (in milliseconds) - configurable via environment
    this.cleanupInterval = (parseInt(process.env.DB_CLEANUP_INTERVAL_MINUTES) || 10) * 60 * 1000;
    this.lastCleanup = new Date();
    
    console.log('🛡️ Database Manager initialized with environment configuration');
    console.log(`   - Users limit: ${this.tableLimits.users}`);
    console.log(`   - Cleanup interval: ${this.cleanupInterval / 1000 / 60} minutes`);
    
    this.startCleanupScheduler();
  }

  async createConnection() {
    const client = new Client(dbConfig);
    await client.connect();
    return client;
  }

  async checkTableRowCount(tableName) {
    const client = await this.createConnection();
    try {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error(`Error checking row count for table ${tableName}:`, error.message);
      return 0;
    } finally {
      await client.end();
    }
  }

  async enforceTableLimit(tableName, limit = null) {
    const maxRows = limit || this.tableLimits[tableName];
    if (!maxRows) {
      console.warn(`No limit configured for table: ${tableName}`);
      return;
    }

    const currentCount = await this.checkTableRowCount(tableName);
    
    if (currentCount <= maxRows) {
      console.log(`✅ Table ${tableName}: ${currentCount}/${maxRows} rows (OK)`);
      return;
    }

    const rowsToDelete = currentCount - maxRows;
    console.log(`⚠️  Table ${tableName}: ${currentCount}/${maxRows} rows (LIMIT EXCEEDED)`);
    console.log(`🗑️  Deleting ${rowsToDelete} oldest entries...`);

    const client = await this.createConnection();
    try {
      let deleteQuery;
      
      // Different cleanup strategies for different tables
      switch (tableName) {
        case 'users':
          // For users table, delete oldest inactive users first
          deleteQuery = `
            DELETE FROM ${tableName} 
            WHERE id IN (
              SELECT id FROM ${tableName} 
              ORDER BY created_at ASC 
              LIMIT $1
            )
          `;
          break;
        
        default:
          // Generic cleanup: delete oldest entries
          deleteQuery = `
            DELETE FROM ${tableName} 
            WHERE id IN (
              SELECT id FROM ${tableName} 
              ORDER BY created_at ASC 
              LIMIT $1
            )
          `;
      }

      const result = await client.query(deleteQuery, [rowsToDelete]);
      console.log(`✅ Successfully deleted ${result.rowCount} rows from ${tableName}`);
      
      // Log the cleanup
      await this.logCleanupActivity(tableName, result.rowCount, currentCount, maxRows);
      
    } catch (error) {
      console.error(`❌ Error enforcing limit for table ${tableName}:`, error.message);
    } finally {
      await client.end();
    }
  }

  async logCleanupActivity(tableName, deletedRows, previousCount, limit) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      table: tableName,
      deleted_rows: deletedRows,
      previous_count: previousCount,
      limit: limit,
      new_count: previousCount - deletedRows
    };
    
    console.log(`📊 CLEANUP LOG:`, logEntry);
    
    // Optionally store cleanup logs in database (you can enable this later)
    // await this.storeCleanupLog(logEntry);
  }

  async performFullCleanup() {
    console.log('🧹 Starting database cleanup process...');
    const startTime = Date.now();
    
    for (const [tableName, limit] of Object.entries(this.tableLimits)) {
      try {
        await this.enforceTableLimit(tableName, limit);
      } catch (error) {
        console.error(`Error cleaning table ${tableName}:`, error.message);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Database cleanup completed in ${duration}ms`);
    this.lastCleanup = new Date();
  }

  startCleanupScheduler() {
    console.log(`🕐 Database cleanup scheduler started (interval: ${this.cleanupInterval/1000/60} minutes)`);
    
    setInterval(async () => {
      await this.performFullCleanup();
    }, this.cleanupInterval);
  }

  // Method to manually trigger cleanup
  async manualCleanup() {
    console.log('🔧 Manual cleanup triggered');
    await this.performFullCleanup();
  }

  // Method to check database health
  async getDatabaseStatus() {
    const status = {};
    
    for (const [tableName, limit] of Object.entries(this.tableLimits)) {
      const count = await this.checkTableRowCount(tableName);
      status[tableName] = {
        current_rows: count,
        max_rows: limit,
        usage_percentage: Math.round((count / limit) * 100),
        needs_cleanup: count > limit
      };
    }
    
    return {
      last_cleanup: this.lastCleanup,
      cleanup_interval_minutes: this.cleanupInterval / 1000 / 60,
      tables: status
    };
  }

  // Method to update table limits dynamically
  updateTableLimit(tableName, newLimit) {
    const oldLimit = this.tableLimits[tableName];
    this.tableLimits[tableName] = newLimit;
    console.log(`📝 Updated limit for ${tableName}: ${oldLimit} → ${newLimit}`);
  }

  // Enhanced user creation with automatic cleanup
  async createUserWithProtection(username, password) {
    // Check if we're near the limit and cleanup if needed
    const currentCount = await this.checkTableRowCount('users');
    if (currentCount >= this.tableLimits.users * 0.9) { // Cleanup at 90% capacity
      console.log('🔄 Approaching user limit, performing preemptive cleanup...');
      await this.enforceTableLimit('users');
    }

    // Proceed with normal user creation
    const client = await this.createConnection();
    try {
      const result = await client.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
        [username, password]
      );
      return result.rows[0];
    } finally {
      await client.end();
    }
  }
}

module.exports = DatabaseManager; 