// keep-alive.js - Simple endpoint to keep the server awake
// This can be pinged by external services like UptimeRobot

const express = require('express');
const router = express.Router();

// Simple health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Keep-alive endpoint
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

module.exports = router; 