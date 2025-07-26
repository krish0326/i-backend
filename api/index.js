const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Basic middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://yourdomain.com'] 
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Interior Design Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Not connected (API mode)'
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'API is working correctly',
    data: {
      message: 'Hello from Interior Design API!',
      features: ['Health Check', 'Test Endpoint', 'Ready for Development']
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'Interior Design API is running',
    version: '1.0.0',
    endpoints: {
      root: '/',
      health: '/api/health',
      test: '/api/test'
    },
    note: 'Database connection disabled for testing'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error', 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Export for Vercel serverless function
module.exports = app; 