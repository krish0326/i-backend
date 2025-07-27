const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');

// Simple chatbot response logic
const getChatbotResponse = (message) => {
  const lowerMessage = message.toLowerCase();
  
  // Basic response patterns
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your interior design assistant. How can I help you today?";
  }
  
  if (lowerMessage.includes('design') || lowerMessage.includes('interior')) {
    return "I'd love to help you with your interior design project! What type of space are you looking to design?";
  }
  
  if (lowerMessage.includes('color') || lowerMessage.includes('paint')) {
    return "Color selection is crucial for interior design! What mood are you trying to create in your space?";
  }
  
  if (lowerMessage.includes('furniture') || lowerMessage.includes('sofa') || lowerMessage.includes('chair')) {
    return "Furniture selection is key to creating a functional and beautiful space. What style are you drawn to?";
  }
  
  if (lowerMessage.includes('budget') || lowerMessage.includes('cost') || lowerMessage.includes('price')) {
    return "Budget planning is important! I can help you find cost-effective design solutions. What's your budget range?";
  }
  
  if (lowerMessage.includes('thank')) {
    return "You're welcome! I'm here to help with all your interior design questions.";
  }
  
  // Default response
  return "That's interesting! I'm here to help you with interior design. Could you tell me more about what you're looking for?";
};

// POST /api/chatbot/message
router.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required and must be a string'
      });
    }
    
    // Get chatbot response
    const response = getChatbotResponse(message);
    
    // Create a unique session ID for this chat
    const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Try to save chat messages to MongoDB (if available)
    try {
      const userMessage = new ChatMessage({
        sessionId: sessionId,
        userId: 'anonymous_user', // You can change this to track specific users
        message: message,
        response: response,
        messageType: 'user',
        intent: 'chat_message',
        confidence: 1,
        context: {
          currentStep: 'chat_conversation'
        },
        metadata: {
          userAgent: req.headers['user-agent'] || '',
          ipAddress: req.ip || '',
          timestamp: new Date()
        }
      });
      
      const botMessage = new ChatMessage({
        sessionId: sessionId,
        userId: 'anonymous_user',
        message: response,
        response: '',
        messageType: 'bot',
        intent: 'chat_response',
        confidence: 1,
        context: {
          currentStep: 'chat_conversation'
        },
        metadata: {
          userAgent: req.headers['user-agent'] || '',
          ipAddress: req.ip || '',
          timestamp: new Date()
        }
      });
      
      // Save both messages to database
      await userMessage.save();
      await botMessage.save();
      
      console.log('Chat messages saved to MongoDB:', {
        sessionId,
        userMessage: message,
        botResponse: response
      });
    } catch (dbError) {
      console.log('Database not available, chat messages logged only:', {
        sessionId,
        userMessage: message,
        botResponse: response
      });
    }
    
    res.json({
      status: 'success',
      response: response,
      timestamp: new Date().toISOString(),
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// POST /api/chatbot/form (for contact form)
router.post('/form', async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and message are required'
      });
    }
    
    // Create a unique session ID for this contact form submission
    const sessionId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Try to save contact form data to MongoDB (if available)
    try {
      const contactMessage = new ChatMessage({
        sessionId: sessionId,
        userId: email, // Use email as user ID
        message: message,
        response: 'Contact form submitted successfully',
        messageType: 'user',
        intent: 'contact_form',
        confidence: 1,
        context: {
          currentStep: 'contact_form_submitted',
          collectedData: {
            name: name,
            email: email,
            phone: phone || '',
            projectType: service || '',
            additionalNotes: message
          }
        },
        metadata: {
          userAgent: req.headers['user-agent'] || '',
          ipAddress: req.ip || '',
          timestamp: new Date()
        }
      });
      
      // Save to database
      await contactMessage.save();
      console.log('Contact form data saved to MongoDB:', {
        sessionId,
        name,
        email,
        phone,
        service,
        message
      });
    } catch (dbError) {
      console.log('Database not available, contact form data logged only:', {
        sessionId,
        name,
        email,
        phone,
        service,
        message
      });
    }
    
    res.json({
      status: 'success',
      message: 'Thank you for your message! We will get back to you soon.',
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// GET /api/chatbot/health
router.get('/health', (req, res) => {
  res.json({
      status: 'success',
    message: 'Chatbot service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 