const bcrypt = require('bcrypt');
const { Client } = require('pg');
const dbConfig = require('./supabase-config');

class SecurityManager {
  constructor() {
    // Rate limiting for authentication attempts
    this.authAttempts = new Map(); // IP -> { count, lastAttempt }
    this.MAX_AUTH_ATTEMPTS = parseInt(process.env.MAX_AUTH_ATTEMPTS) || 5;
    this.AUTH_LOCKOUT_TIME = (parseInt(process.env.AUTH_LOCKOUT_TIME_MINUTES) || 15) * 60 * 1000;
    
    // Rate limiting for admin operations
    this.adminAttempts = new Map();
    this.MAX_ADMIN_ATTEMPTS = parseInt(process.env.MAX_ADMIN_ATTEMPTS) || 10;
    this.ADMIN_LOCKOUT_TIME = (parseInt(process.env.ADMIN_LOCKOUT_TIME_MINUTES) || 5) * 60 * 1000;
    
    // Suspicious activity tracking
    this.suspiciousIPs = new Set();
    this.blockedIPs = new Set();
    
    // Password requirements (configurable via environment)
    this.PASSWORD_MIN_LENGTH = parseInt(process.env.PASSWORD_MIN_LENGTH) || 8;
    this.PASSWORD_REQUIRE_SPECIAL = process.env.PASSWORD_REQUIRE_SPECIAL !== 'false';
    this.PASSWORD_REQUIRE_NUMBER = process.env.PASSWORD_REQUIRE_NUMBER !== 'false';
    this.PASSWORD_REQUIRE_UPPERCASE = process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false';
    
    // Cleanup interval for rate limiting maps
    setInterval(() => this.cleanupOldAttempts(), 5 * 60 * 1000); // Every 5 minutes
    
    console.log('🔒 Security Manager initialized with environment configuration');
    console.log(`   - Max auth attempts: ${this.MAX_AUTH_ATTEMPTS}`);
    console.log(`   - Auth lockout time: ${this.AUTH_LOCKOUT_TIME / 1000 / 60} minutes`);
    console.log(`   - Password min length: ${this.PASSWORD_MIN_LENGTH}`);
  }

  // Password Security
  async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  validatePassword(password) {
    const errors = [];
    
    if (password.length < this.PASSWORD_MIN_LENGTH) {
      errors.push(`Password must be at least ${this.PASSWORD_MIN_LENGTH} characters long`);
    }
    
    if (this.PASSWORD_REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.PASSWORD_REQUIRE_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.PASSWORD_REQUIRE_SPECIAL && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'password123', 'admin', 'user'];
    if (weakPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and weak');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Rate Limiting
  checkAuthRateLimit(ip) {
    const now = Date.now();
    const attempts = this.authAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    // Reset if lockout period has passed
    if (now - attempts.lastAttempt > this.AUTH_LOCKOUT_TIME) {
      attempts.count = 0;
    }
    
    if (attempts.count >= this.MAX_AUTH_ATTEMPTS) {
      const timeRemaining = Math.ceil((this.AUTH_LOCKOUT_TIME - (now - attempts.lastAttempt)) / 1000 / 60);
      return {
        allowed: false,
        message: `Too many failed attempts. Try again in ${timeRemaining} minutes.`,
        timeRemaining: timeRemaining
      };
    }
    
    return { allowed: true };
  }

  recordAuthAttempt(ip, success) {
    const now = Date.now();
    const attempts = this.authAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    if (success) {
      // Reset on successful login
      attempts.count = 0;
    } else {
      // Increment failed attempts
      attempts.count++;
      attempts.lastAttempt = now;
      
      // Track suspicious activity
      if (attempts.count >= 3) {
        this.suspiciousIPs.add(ip);
        console.log(`🚨 Suspicious authentication activity from IP: ${ip}`);
      }
      
      if (attempts.count >= this.MAX_AUTH_ATTEMPTS) {
        this.blockedIPs.add(ip);
        console.log(`🚫 IP blocked due to too many failed attempts: ${ip}`);
      }
    }
    
    this.authAttempts.set(ip, attempts);
  }

  // Input Validation
  validateUsername(username) {
    const errors = [];
    
    if (!username || username.trim().length === 0) {
      errors.push('Username is required');
    }
    
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    
    if (username.length > 20) {
      errors.push('Username must be less than 20 characters long');
    }
    
    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }
    
    // Prevent problematic usernames
    const forbidden = ['admin', 'administrator', 'root', 'system', 'null', 'undefined', 'test'];
    if (forbidden.includes(username.toLowerCase())) {
      errors.push('Username is not allowed');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
      .trim()
      .replace(/[<>'"]/g, '') // Remove HTML/SQL injection characters
      .substring(0, 255); // Limit length
  }

  // Database Security
  async createConnection() {
    const client = new Client({
      ...dbConfig,
      statement_timeout: 30000, // 30 second timeout
      query_timeout: 30000,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    });
    
    await client.connect();
    return client;
  }

  // Secure user creation with all protections
  async createSecureUser(username, password, ip) {
    // Check rate limiting
    const rateLimitCheck = this.checkAuthRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message);
    }

    // Validate inputs
    const usernameValidation = this.validateUsername(username);
    if (!usernameValidation.isValid) {
      this.recordAuthAttempt(ip, false);
      throw new Error('Username validation failed: ' + usernameValidation.errors.join(', '));
    }

    const passwordValidation = this.validatePassword(password);
    if (!passwordValidation.isValid) {
      this.recordAuthAttempt(ip, false);
      throw new Error('Password validation failed: ' + passwordValidation.errors.join(', '));
    }

    // Sanitize inputs
    const cleanUsername = this.sanitizeInput(username);
    
    // Hash password
    const hashedPassword = await this.hashPassword(password);
    
    const client = await this.createConnection();
    try {
      // Check if username exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [cleanUsername]
      );
      
      if (existingUser.rows.length > 0) {
        this.recordAuthAttempt(ip, false);
        throw new Error('Username already exists');
      }
      
      // Create user with hashed password
      const result = await client.query(
        'INSERT INTO users (username, password, created_at) VALUES ($1, $2, NOW()) RETURNING id',
        [cleanUsername, hashedPassword]
      );
      
      this.recordAuthAttempt(ip, true);
      console.log(`✅ Secure user created: ${cleanUsername} from IP: ${ip}`);
      
      return result.rows[0];
    } finally {
      await client.end();
    }
  }

  // Secure authentication
  async authenticateUser(username, password, ip) {
    // Check rate limiting
    const rateLimitCheck = this.checkAuthRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      throw new Error(rateLimitCheck.message);
    }

    // Check if IP is blocked
    if (this.blockedIPs.has(ip)) {
      throw new Error('IP address is temporarily blocked');
    }

    const cleanUsername = this.sanitizeInput(username);
    
    const client = await this.createConnection();
    try {
      const result = await client.query(
        'SELECT id, username, password FROM users WHERE username = $1',
        [cleanUsername]
      );
      
      if (result.rows.length === 0) {
        this.recordAuthAttempt(ip, false);
        throw new Error('Invalid username or password');
      }
      
      const user = result.rows[0];
      const isValidPassword = await this.verifyPassword(password, user.password);
      
      if (!isValidPassword) {
        this.recordAuthAttempt(ip, false);
        throw new Error('Invalid username or password');
      }
      
      this.recordAuthAttempt(ip, true);
      console.log(`✅ Successful authentication: ${cleanUsername} from IP: ${ip}`);
      
      return {
        id: user.id,
        username: user.username
      };
    } finally {
      await client.end();
    }
  }

  // Admin panel protection
  checkAdminAccess(ip) {
    const now = Date.now();
    const attempts = this.adminAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    
    // Reset if lockout period has passed
    if (now - attempts.lastAttempt > this.ADMIN_LOCKOUT_TIME) {
      attempts.count = 0;
    }
    
    if (attempts.count >= this.MAX_ADMIN_ATTEMPTS) {
      const timeRemaining = Math.ceil((this.ADMIN_LOCKOUT_TIME - (now - attempts.lastAttempt)) / 1000 / 60);
      return {
        allowed: false,
        message: `Admin access temporarily blocked. Try again in ${timeRemaining} minutes.`
      };
    }
    
    return { allowed: true };
  }

  recordAdminAccess(ip) {
    const now = Date.now();
    const attempts = this.adminAttempts.get(ip) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = now;
    this.adminAttempts.set(ip, attempts);
  }

  // Security monitoring
  getSecurityStatus() {
    return {
      blocked_ips: Array.from(this.blockedIPs),
      suspicious_ips: Array.from(this.suspiciousIPs),
      active_rate_limits: this.authAttempts.size,
      admin_rate_limits: this.adminAttempts.size
    };
  }

  // Cleanup old attempts
  cleanupOldAttempts() {
    const now = Date.now();
    
    // Clean auth attempts
    for (const [ip, attempts] of this.authAttempts.entries()) {
      if (now - attempts.lastAttempt > this.AUTH_LOCKOUT_TIME) {
        this.authAttempts.delete(ip);
        this.blockedIPs.delete(ip);
      }
    }
    
    // Clean admin attempts
    for (const [ip, attempts] of this.adminAttempts.entries()) {
      if (now - attempts.lastAttempt > this.ADMIN_LOCKOUT_TIME) {
        this.adminAttempts.delete(ip);
      }
    }
    
    console.log('🧹 Security cleanup completed');
  }

  // Emergency functions
  unblockIP(ip) {
    this.blockedIPs.delete(ip);
    this.suspiciousIPs.delete(ip);
    this.authAttempts.delete(ip);
    console.log(`🔓 IP unblocked: ${ip}`);
  }

  blockIP(ip) {
    this.blockedIPs.add(ip);
    console.log(`🚫 IP manually blocked: ${ip}`);
  }
}

module.exports = SecurityManager; 