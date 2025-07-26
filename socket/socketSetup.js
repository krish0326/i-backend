const socketIO = require('socket.io');
const ChatMessage = require('../models/ChatMessage');
const chatbotService = require('../services/chatbotService');

let io;

const setupSocketIO = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Store active sessions
  const activeSessions = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    // Handle user joining a chat session
    socket.on('join-session', async (data) => {
      const { sessionId, userId } = data;
      
      if (!sessionId || !userId) {
        socket.emit('error', { message: 'Session ID and User ID are required' });
        return;
      }

      // Join the session room
      socket.join(sessionId);
      activeSessions.set(socket.id, { sessionId, userId });

      // Send session joined confirmation
      socket.emit('session-joined', { 
        sessionId, 
        userId,
        timestamp: new Date().toISOString()
      });

      // Load conversation history
      try {
        const history = await ChatMessage.getConversationHistory(sessionId, 20);
        socket.emit('conversation-history', {
          messages: history,
          sessionId
        });
      } catch (error) {
        console.error('Error loading conversation history:', error);
        socket.emit('error', { message: 'Failed to load conversation history' });
      }

      console.log(`👤 User ${userId} joined session ${sessionId}`);
    });

    // Handle incoming chat messages
    socket.on('send-message', async (data) => {
      const { sessionId, userId, message, metadata } = data;
      
      if (!sessionId || !userId || !message) {
        socket.emit('error', { message: 'Session ID, User ID, and message are required' });
        return;
      }

      try {
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
            ipAddress: metadata?.ipAddress || '',
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
            ipAddress: metadata?.ipAddress || '',
            timestamp: new Date()
          }
        });

        await botMessage.save();

        // Emit messages to the session room
        io.to(sessionId).emit('new-message', {
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
          }
        });

        // Check if conversation is complete
        if (botResponse.isComplete) {
          io.to(sessionId).emit('conversation-complete', {
            sessionId,
            collectedData: botResponse.context.collectedData,
            nextSteps: botResponse.nextSteps
          });
        }

      } catch (error) {
        console.error('Error processing message:', error);
        socket.emit('error', { message: 'Failed to process message' });
      }
    });

    // Handle typing indicators
    socket.on('typing-start', (data) => {
      const { sessionId } = data;
      socket.to(sessionId).emit('user-typing', { userId: activeSessions.get(socket.id)?.userId });
    });

    socket.on('typing-stop', (data) => {
      const { sessionId } = data;
      socket.to(sessionId).emit('user-stopped-typing', { userId: activeSessions.get(socket.id)?.userId });
    });

    // Handle file uploads for design images
    socket.on('upload-design-image', async (data) => {
      const { sessionId, userId, imageData, imageType } = data;
      
      try {
        // Process image upload
        const uploadResult = await chatbotService.processImageUpload(imageData, imageType, sessionId);
        
        socket.emit('image-upload-success', {
          imageUrl: uploadResult.url,
          imageType,
          sessionId
        });

        // Notify other users in session about the upload
        socket.to(sessionId).emit('design-image-uploaded', {
          imageUrl: uploadResult.url,
          imageType,
          uploadedBy: userId
        });

      } catch (error) {
        console.error('Error uploading image:', error);
        socket.emit('image-upload-error', { 
          message: 'Failed to upload image',
          error: error.message 
        });
      }
    });

    // Handle design preference updates
    socket.on('update-design-preferences', async (data) => {
      const { sessionId, userId, preferences } = data;
      
      try {
        const updatedContext = await chatbotService.updateDesignPreferences(sessionId, preferences);
        
        socket.emit('preferences-updated', {
          sessionId,
          preferences: updatedContext.userPreferences
        });

      } catch (error) {
        console.error('Error updating preferences:', error);
        socket.emit('error', { message: 'Failed to update preferences' });
      }
    });

    // Handle session leave
    socket.on('leave-session', (data) => {
      const { sessionId } = data;
      socket.leave(sessionId);
      activeSessions.delete(socket.id);
      
      socket.emit('session-left', { sessionId });
      console.log(`👤 User left session ${sessionId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const sessionInfo = activeSessions.get(socket.id);
      if (sessionInfo) {
        socket.leave(sessionInfo.sessionId);
        activeSessions.delete(socket.id);
        console.log(`🔌 Client disconnected from session ${sessionInfo.sessionId}`);
      }
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      socket.emit('error', { message: 'An error occurred' });
    });
  });

  // Global error handler
  io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  return io;
};

// Utility function to emit to specific session
const emitToSession = (sessionId, event, data) => {
  if (io) {
    io.to(sessionId).emit(event, data);
  }
};

// Utility function to get active sessions count
const getActiveSessionsCount = () => {
  return activeSessions.size;
};

module.exports = {
  setupSocketIO,
  emitToSession,
  getActiveSessionsCount
}; 