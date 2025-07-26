const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage config for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Get conversation history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await ChatMessage.getConversationHistory(sessionId, parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: {
        sessionId,
        messages,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch conversation history'
    });
  }
});

// Get user sessions
router.get('/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const sessions = await ChatMessage.getUserSessions(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        userId,
        sessions,
        total: sessions.length
      }
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch user sessions'
    });
  }
});

// Create new chat session
router.post('/session', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('initialMessage').optional().trim().isLength({ max: 1000 }).withMessage('Initial message too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { userId, initialMessage } = req.body;
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create initial greeting message
    const greetingMessage = new ChatMessage({
      sessionId,
      userId,
      message: initialMessage || 'Hello! I\'m here to help with your interior design project.',
      response: "Hello! 👋 I'm your interior design assistant. I'm here to help you plan your perfect space! What type of project are you thinking about? (residential, commercial, or renovation?)",
      messageType: 'bot',
      intent: 'greeting',
      confidence: 1,
      context: {
        currentStep: 'greeting',
        collectedData: {},
        userPreferences: {}
      }
    });
    
    await greetingMessage.save();
    
    res.status(201).json({
      status: 'success',
      data: {
        sessionId,
        userId,
        initialMessage: greetingMessage
      }
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create chat session'
    });
  }
});

// Send message (for non-Socket.IO usage)
router.post('/message', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('userId').notEmpty().withMessage('User ID is required'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const { sessionId, userId, message, metadata } = req.body;
    
    // Import chatbot service dynamically to avoid circular dependency
    const chatbotService = require('../services/chatbotService');
    
    // Process message through chatbot service
    const botResponse = await chatbotService.processMessage(message, sessionId, userId);
    
    // Save user message
    const userMessage = new ChatMessage({
      sessionId,
      userId,
      message,
      response: botResponse.response,
      messageType: 'user',
      intent: botResponse.intent,
      confidence: botResponse.confidence,
      context: botResponse.context,
      metadata: {
        userAgent: metadata?.userAgent || '',
        ipAddress: metadata?.ipAddress || req.ip,
        timestamp: new Date()
      }
    });
    
    await userMessage.save();
    
    // Save bot response
    const botMessage = new ChatMessage({
      sessionId,
      userId,
      message: botResponse.response,
      response: '',
      messageType: 'bot',
      intent: botResponse.intent,
      confidence: botResponse.confidence,
      context: botResponse.context,
      metadata: {
        userAgent: metadata?.userAgent || '',
        ipAddress: metadata?.ipAddress || req.ip,
        timestamp: new Date()
      }
    });
    
    await botMessage.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        userMessage: {
          id: userMessage._id,
          message: userMessage.message,
          messageType: 'user',
          timestamp: userMessage.createdAt
        },
        botMessage: {
          id: botMessage._id,
          message: botMessage.message,
          messageType: 'bot',
          timestamp: botMessage.createdAt,
          context: botMessage.context
        },
        isComplete: botResponse.isComplete,
        nextSteps: botResponse.nextSteps
      }
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process message'
    });
  }
});

// POST /api/chatbot/form - receive chatbot form data and image
router.post('/form', upload.single('image'), async (req, res) => {
  try {
    const { name, email, phone, service, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    // Save to MongoDB (ChatMessage model)
    const chatMsg = await ChatMessage.create({
      sessionId: req.body.sessionId || 'contact-form',
      userId: req.body.userId || email,
      message,
      response: 'Contact form submitted successfully',
      messageType: 'user',
      context: { 
        collectedData: { 
          name, 
          email, 
          phone: phone || '', 
          service: service || '', 
          imageUrl 
        } 
      },
      metadata: { 
        userAgent: req.headers['user-agent'], 
        ipAddress: req.ip,
        formType: 'contact-form'
      }
    });
    res.status(201).json({ success: true, data: chatMsg });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ error: 'Failed to submit form.' });
  }
});

// Get chat analytics
router.get('/analytics', async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    
    let query = {};
    
    // Date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // User filter
    if (userId) {
      query.userId = userId;
    }
    
    // Get total messages
    const totalMessages = await ChatMessage.countDocuments(query);
    
    // Get messages by type
    const userMessages = await ChatMessage.countDocuments({ ...query, messageType: 'user' });
    const botMessages = await ChatMessage.countDocuments({ ...query, messageType: 'bot' });
    
    // Get unique sessions
    const uniqueSessions = await ChatMessage.distinct('sessionId', query);
    
    // Get unique users
    const uniqueUsers = await ChatMessage.distinct('userId', query);
    
    // Get average conversation length
    const sessionStats = await ChatMessage.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$sessionId',
          messageCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgMessagesPerSession: { $avg: '$messageCount' },
          maxMessagesPerSession: { $max: '$messageCount' },
          minMessagesPerSession: { $min: '$messageCount' }
        }
      }
    ]);
    
    // Get popular intents
    const popularIntents = await ChatMessage.aggregate([
      { $match: { ...query, intent: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$intent',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        totalMessages,
        userMessages,
        botMessages,
        uniqueSessions: uniqueSessions.length,
        uniqueUsers: uniqueUsers.length,
        avgMessagesPerSession: sessionStats[0]?.avgMessagesPerSession || 0,
        maxMessagesPerSession: sessionStats[0]?.maxMessagesPerSession || 0,
        minMessagesPerSession: sessionStats[0]?.minMessagesPerSession || 0,
        popularIntents
      }
    });
  } catch (error) {
    console.error('Error fetching chat analytics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch chat analytics'
    });
  }
});

// Export conversation data
router.get('/export/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: 1 });
    
    if (messages.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No conversation found for this session'
      });
    }
    
    // Format conversation for export
    const conversation = {
      sessionId,
      userId: messages[0].userId,
      startDate: messages[0].createdAt,
      endDate: messages[messages.length - 1].createdAt,
      totalMessages: messages.length,
      messages: messages.map(msg => ({
        timestamp: msg.createdAt,
        type: msg.messageType,
        message: msg.message,
        intent: msg.intent,
        confidence: msg.confidence
      })),
      collectedData: messages[messages.length - 1].context?.collectedData || {}
    };
    
    res.status(200).json({
      status: 'success',
      data: conversation
    });
  } catch (error) {
    console.error('Error exporting conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to export conversation'
    });
  }
});

// Delete conversation
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await ChatMessage.deleteMany({ sessionId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No conversation found for this session'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: `Deleted ${result.deletedCount} messages from session ${sessionId}`
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete conversation'
    });
  }
});

// Get conversation summary
router.get('/summary/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const messages = await ChatMessage.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(1);
    
    if (messages.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No conversation found for this session'
      });
    }
    
    const lastMessage = messages[0];
    const collectedData = lastMessage.context?.collectedData || {};
    
    const summary = {
      sessionId,
      userId: lastMessage.userId,
      lastActivity: lastMessage.createdAt,
      isComplete: lastMessage.isConversationComplete(),
      collectedData,
      projectType: collectedData.projectType,
      roomType: collectedData.roomType,
      designStyle: collectedData.designStyle,
      budget: collectedData.budget,
      timeline: collectedData.timeline,
      contactInfo: {
        name: collectedData.name,
        email: collectedData.email,
        phone: collectedData.phone
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: summary
    });
  } catch (error) {
    console.error('Error fetching conversation summary:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch conversation summary'
    });
  }
});

module.exports = router; 