# 🔧 Environment Variables Setup Guide

This guide explains how to configure WackyTanks using environment variables for enhanced security and flexibility.

## 🚀 Quick Setup

### 1. Copy the Template
```bash
# Copy the template to create your .env file
copy env-template.txt .env

# OR on Linux/Mac:
cp env-template.txt .env
```

### 2. Edit Your Configuration
Open `.env` file and update with your actual values:

```bash
# Required: Update these with your actual Supabase credentials
DB_HOST=your-supabase-host.supabase.co
DB_PASSWORD=your-actual-database-password

# Optional: Customize security settings
SECURITY_SECRET_KEY=generate-a-strong-random-key-here
```

### 3. Start Your Server
```bash
npm start
```

## 📊 Environment Variables Reference

### **Database Configuration** (Required)
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_HOST` | Supabase database host | `localhost` | `db.abcd1234.supabase.co` |
| `DB_PORT` | Database port | `5432` | `5432` |
| `DB_NAME` | Database name | `postgres` | `postgres` |
| `DB_USER` | Database username | `postgres` | `postgres` |
| `DB_PASSWORD` | Database password | ❌ **Required** | `your-secure-password` |
| `DB_SSL_REJECT_UNAUTHORIZED` | SSL certificate validation | `false` | `false` |

### **Security Configuration** (Recommended)
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `SECURITY_SECRET_KEY` | General security key | - | `super-secret-key-123` |
| `JWT_SECRET` | JWT token signing key | - | `jwt-secret-456` |
| `MAX_AUTH_ATTEMPTS` | Max failed login attempts | `5` | `3` |
| `AUTH_LOCKOUT_TIME_MINUTES` | Lockout duration (minutes) | `15` | `30` |
| `MAX_ADMIN_ATTEMPTS` | Max admin requests | `10` | `5` |
| `ADMIN_LOCKOUT_TIME_MINUTES` | Admin lockout (minutes) | `5` | `10` |

### **Password Requirements** (Optional)
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PASSWORD_MIN_LENGTH` | Minimum password length | `8` | `12` |
| `PASSWORD_REQUIRE_SPECIAL` | Require special characters | `true` | `false` |
| `PASSWORD_REQUIRE_NUMBER` | Require numbers | `true` | `true` |
| `PASSWORD_REQUIRE_UPPERCASE` | Require uppercase letters | `true` | `true` |

### **Application Configuration** (Optional)
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `development` | `production` |
| `PORT` | Server port | `2000` | `3000` |

### **Database Management** (Optional)
| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_USERS_LIMIT` | Maximum users in database | `1000` | `5000` |
| `DB_CLEANUP_INTERVAL_MINUTES` | Cleanup frequency (minutes) | `10` | `30` |

## 🔒 Security Best Practices

### **1. Strong Secrets Generation**
```bash
# Generate strong random keys (use one of these methods):

# Method 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Method 2: Using OpenSSL (if available)
openssl rand -hex 32

# Method 3: Online generator (use trusted sources only)
# https://generate-secret.vercel.app/32
```

### **2. Environment-Specific Configuration**

**Development (.env):**
```bash
NODE_ENV=development
PORT=2000
MAX_AUTH_ATTEMPTS=5
AUTH_LOCKOUT_TIME_MINUTES=15
DB_USERS_LIMIT=1000
```

**Production (.env):**
```bash
NODE_ENV=production
PORT=443
MAX_AUTH_ATTEMPTS=3
AUTH_LOCKOUT_TIME_MINUTES=30
DB_USERS_LIMIT=10000
PASSWORD_MIN_LENGTH=12
```

### **3. Never Commit Secrets**
✅ **Good:**
- Use `.env` files for local development
- Use hosting platform environment variables for production
- Store secrets in secure vaults for team access

❌ **Bad:**
- Committing `.env` files to Git
- Hardcoding secrets in source code
- Sharing secrets via email/chat

## 🚨 Migration from Old Config

### **Before (insecure):**
```javascript
// supabase-config.js (old way)
module.exports = {
  host: 'db.example.supabase.co',
  password: 'hardcoded-password-123'  // ❌ Security risk!
};
```

### **After (secure):**
```bash
# .env file (new way)
DB_HOST=db.example.supabase.co
DB_PASSWORD=hardcoded-password-123  # ✅ Not committed to Git
```

### **Migration Steps:**
1. ✅ **Completed**: Install `dotenv` package
2. ✅ **Completed**: Update `supabase-config.js` to use environment variables
3. ✅ **Completed**: Add `.env` to `.gitignore`
4. ✅ **Completed**: Create environment template
5. 🔄 **Your Task**: Update `.env` with your actual credentials

## 🛠 Deployment Configurations

### **Local Development:**
1. Copy `env-template.txt` to `.env`
2. Fill in your Supabase credentials
3. Run `npm start`

### **Heroku Deployment:**
```bash
# Set environment variables via Heroku CLI
heroku config:set DB_HOST=your-host.supabase.co
heroku config:set DB_PASSWORD=your-password
heroku config:set NODE_ENV=production
heroku config:set SECURITY_SECRET_KEY=your-secret-key
```

### **Docker Deployment:**
```dockerfile
# Dockerfile
ENV NODE_ENV=production
ENV PORT=2000
# Other variables passed via docker run or docker-compose
```

```bash
# Docker run with environment variables
docker run -e DB_HOST=your-host -e DB_PASSWORD=your-pass your-app
```

### **VPS/Server Deployment:**
```bash
# Create .env file on server
sudo nano /path/to/your/app/.env

# Set proper permissions
chmod 600 .env
chown your-user:your-group .env
```

## 🔍 Troubleshooting

### **Common Issues:**

**❌ Error: "DB_PASSWORD environment variable is required!"**
- **Solution**: Create `.env` file with `DB_PASSWORD=your-actual-password`

**❌ Error: "Cannot connect to database"**
- **Solution**: Check `DB_HOST` and `DB_PASSWORD` are correct
- **Check**: Supabase project is active and accessible

**❌ Error: "dotenv is not defined"**
- **Solution**: Run `npm install dotenv`

**❌ Variables not loading**
- **Check**: `.env` file is in the root directory (same level as `package.json`)
- **Check**: No spaces around `=` in `.env` file
- **Format**: `KEY=value` not `KEY = value`

### **Validation Commands:**
```bash
# Test if environment variables are loaded
node -e "require('dotenv').config(); console.log('DB_HOST:', process.env.DB_HOST)"

# Check if .env file exists
ls -la .env

# Verify .env is not committed to Git
git status --ignored
```

## 📋 Security Checklist

- [ ] `.env` file created with actual credentials
- [ ] `.env` added to `.gitignore` 
- [ ] Strong `SECURITY_SECRET_KEY` generated
- [ ] Strong `JWT_SECRET` generated
- [ ] Database credentials verified and working
- [ ] Production environment variables configured
- [ ] No secrets committed to version control
- [ ] File permissions set correctly (600 for .env)

## 🎯 Next Steps

1. **Immediate**: Update your `.env` file with actual credentials
2. **Short-term**: Set up production environment variables on your hosting platform
3. **Long-term**: Consider using a secrets management service for team environments

---

## 🔐 **Your Configuration is Now Secure!**

✅ **Database credentials** are no longer hardcoded  
✅ **Environment-specific settings** can be easily configured  
✅ **Secrets are protected** from version control  
✅ **Production deployment** is ready with proper configuration  

**Next recommended step:** Set up HTTPS/SSL for production deployment. 