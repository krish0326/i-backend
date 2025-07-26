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

// Chatbot endpoint
app.post('/api/chatbot/message', (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required'
      });
    }

    // Simple chatbot response (you can enhance this later)
    const responses = [
      "Hello! I'm your interior design assistant. How can I help you today?",
      "Great question! I'd be happy to help with your interior design needs.",
      "That's an interesting design challenge. Let me think about the best solution.",
      "I understand you're looking for interior design advice. What specific area are you working on?",
      "Thanks for reaching out! I'm here to help with all your interior design questions."
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    res.status(200).json({
      status: 'success',
      message: 'Message received successfully',
      response: randomResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Sorry, there was an error processing your message. Please try again.'
    });
  }
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
      test: '/api/test',
      chatbot: '/api/chatbot/message'
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