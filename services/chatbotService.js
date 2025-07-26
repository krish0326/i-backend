const ChatMessage = require('../models/ChatMessage');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Conversation flow steps
const CONVERSATION_STEPS = {
  GREETING: 'greeting',
  PROJECT_TYPE: 'project_type',
  ROOM_TYPE: 'room_type',
  DESIGN_STYLE: 'design_style',
  BUDGET: 'budget',
  TIMELINE: 'timeline',
  ROOM_SIZE: 'room_size',
  CONTACT_INFO: 'contact_info',
  ADDITIONAL_NOTES: 'additional_notes',
  COMPLETE: 'complete'
};

// Design styles with descriptions
const DESIGN_STYLES = {
  modern: 'Clean lines, minimal decoration, and a focus on function',
  traditional: 'Classic elegance with rich colors and ornate details',
  contemporary: 'Current trends with clean, sophisticated aesthetics',
  minimalist: 'Simple, uncluttered spaces with essential elements only',
  industrial: 'Raw materials, exposed elements, and urban aesthetics',
  scandinavian: 'Light, airy spaces with natural materials and functionality',
  bohemian: 'Eclectic, artistic, and free-spirited design',
  coastal: 'Relaxed, beach-inspired with light colors and natural textures',
  farmhouse: 'Rustic charm with modern comfort and vintage elements',
  'mid-century': 'Retro style from the 1950s-60s with clean lines',
  'art-deco': 'Luxurious, geometric patterns and bold colors',
  other: 'Custom or mixed style approach'
};

// Budget ranges
const BUDGET_RANGES = {
  'under-10k': 'Under $10,000',
  '10k-25k': '$10,000 - $25,000',
  '25k-50k': '$25,000 - $50,000',
  '50k-100k': '$50,000 - $100,000',
  'over-100k': 'Over $100,000'
};

// Timeline options
const TIMELINE_OPTIONS = {
  '1-3-months': '1-3 months',
  '3-6-months': '3-6 months',
  '6-12-months': '6-12 months',
  'over-12-months': 'Over 12 months'
};

class ChatbotService {
  constructor() {
    this.conversationFlows = new Map();
  }

  // Process incoming message and generate response
  async processMessage(message, sessionId, userId) {
    try {
      // Get conversation context
      const context = await this.getConversationContext(sessionId);
      const currentStep = context.currentStep || CONVERSATION_STEPS.GREETING;
      
      // Analyze user intent
      const intent = this.analyzeIntent(message, currentStep);
      
      // Generate response based on current step and intent
      const response = await this.generateResponse(message, currentStep, intent, context);
      
      // Update conversation context
      const updatedContext = await this.updateContext(sessionId, currentStep, intent, message, response);
      
      return {
        response: response.message,
        intent: intent.type,
        confidence: intent.confidence,
        context: updatedContext,
        isComplete: response.isComplete,
        nextSteps: response.nextSteps
      };
      
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your message. Please try again or contact our team directly.",
        intent: 'error',
        confidence: 0,
        context: {},
        isComplete: false
      };
    }
  }

  // Analyze user intent from message
  analyzeIntent(message, currentStep) {
    const lowerMessage = message.toLowerCase();
    
    // Greeting patterns
    if (currentStep === CONVERSATION_STEPS.GREETING) {
      if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return { type: 'greeting', confidence: 0.9 };
      }
    }

    // Project type patterns
    if (currentStep === CONVERSATION_STEPS.PROJECT_TYPE) {
      if (lowerMessage.includes('residential') || lowerMessage.includes('home') || lowerMessage.includes('house')) {
        return { type: 'residential', confidence: 0.8 };
      }
      if (lowerMessage.includes('commercial') || lowerMessage.includes('office') || lowerMessage.includes('business')) {
        return { type: 'commercial', confidence: 0.8 };
      }
      if (lowerMessage.includes('renovation') || lowerMessage.includes('remodel')) {
        return { type: 'renovation', confidence: 0.7 };
      }
    }

    // Room type patterns
    if (currentStep === CONVERSATION_STEPS.ROOM_TYPE) {
      const roomTypes = ['living room', 'bedroom', 'kitchen', 'bathroom', 'dining room', 'office', 'basement', 'outdoor'];
      for (const roomType of roomTypes) {
        if (lowerMessage.includes(roomType)) {
          return { type: roomType, confidence: 0.8 };
        }
      }
    }

    // Design style patterns
    if (currentStep === CONVERSATION_STEPS.DESIGN_STYLE) {
      for (const [style, description] of Object.entries(DESIGN_STYLES)) {
        if (lowerMessage.includes(style)) {
          return { type: style, confidence: 0.8 };
        }
      }
    }

    // Budget patterns
    if (currentStep === CONVERSATION_STEPS.BUDGET) {
      for (const [range, label] of Object.entries(BUDGET_RANGES)) {
        if (lowerMessage.includes(range.replace('-', ' ')) || lowerMessage.includes(label.toLowerCase())) {
          return { type: range, confidence: 0.8 };
        }
      }
      // Extract numbers for budget
      const numbers = lowerMessage.match(/\d+/g);
      if (numbers) {
        const budget = parseInt(numbers[0]);
        if (budget < 10000) return { type: 'under-10k', confidence: 0.7 };
        if (budget < 25000) return { type: '10k-25k', confidence: 0.7 };
        if (budget < 50000) return { type: '25k-50k', confidence: 0.7 };
        if (budget < 100000) return { type: '50k-100k', confidence: 0.7 };
        return { type: 'over-100k', confidence: 0.7 };
      }
    }

    // Timeline patterns
    if (currentStep === CONVERSATION_STEPS.TIMELINE) {
      for (const [timeline, label] of Object.entries(TIMELINE_OPTIONS)) {
        if (lowerMessage.includes(timeline.replace('-', ' ')) || lowerMessage.includes(label.toLowerCase())) {
          return { type: timeline, confidence: 0.8 };
        }
      }
    }

    // Contact info patterns
    if (currentStep === CONVERSATION_STEPS.CONTACT_INFO) {
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
      const phonePattern = /(\+\d{1,3}[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}/;
      
      if (emailPattern.test(message)) {
        return { type: 'email', confidence: 0.9, data: message.match(emailPattern)[0] };
      }
      if (phonePattern.test(message)) {
        return { type: 'phone', confidence: 0.9, data: message.match(phonePattern)[0] };
      }
      if (lowerMessage.includes('name') || lowerMessage.includes('call me')) {
        return { type: 'name', confidence: 0.7 };
      }
    }

    // Default intent
    return { type: 'unknown', confidence: 0.3 };
  }

  // Generate response based on current step and intent
  async generateResponse(message, currentStep, intent, context) {
    switch (currentStep) {
      case CONVERSATION_STEPS.GREETING:
        return this.handleGreeting(intent);
      
      case CONVERSATION_STEPS.PROJECT_TYPE:
        return this.handleProjectType(intent, context);
      
      case CONVERSATION_STEPS.ROOM_TYPE:
        return this.handleRoomType(intent, context);
      
      case CONVERSATION_STEPS.DESIGN_STYLE:
        return this.handleDesignStyle(intent, context);
      
      case CONVERSATION_STEPS.BUDGET:
        return this.handleBudget(intent, context);
      
      case CONVERSATION_STEPS.TIMELINE:
        return this.handleTimeline(intent, context);
      
      case CONVERSATION_STEPS.ROOM_SIZE:
        return this.handleRoomSize(message, context);
      
      case CONVERSATION_STEPS.CONTACT_INFO:
        return this.handleContactInfo(intent, message, context);
      
      case CONVERSATION_STEPS.ADDITIONAL_NOTES:
        return this.handleAdditionalNotes(message, context);
      
      default:
        return {
          message: "I'm here to help you with your interior design project! What type of project are you planning?",
          nextStep: CONVERSATION_STEPS.PROJECT_TYPE,
          isComplete: false
        };
    }
  }

  // Handle greeting step
  handleGreeting(intent) {
    if (intent.type === 'greeting') {
      return {
        message: "Hello! 👋 I'm your interior design assistant. I'm here to help you plan your perfect space! What type of project are you thinking about? (residential, commercial, or renovation?)",
        nextStep: CONVERSATION_STEPS.PROJECT_TYPE,
        isComplete: false
      };
    }
    
    return {
      message: "Hi there! I'm excited to help you with your interior design project. What type of project are you planning?",
      nextStep: CONVERSATION_STEPS.PROJECT_TYPE,
      isComplete: false
    };
  }

  // Handle project type step
  handleProjectType(intent, context) {
    if (intent.type === 'residential') {
      context.collectedData.projectType = 'residential';
      return {
        message: "Great choice! 🏠 Residential projects are our specialty. Which room are you looking to design? (living room, bedroom, kitchen, bathroom, etc.)",
        nextStep: CONVERSATION_STEPS.ROOM_TYPE,
        isComplete: false
      };
    }
    
    if (intent.type === 'commercial') {
      context.collectedData.projectType = 'commercial';
      return {
        message: "Excellent! 🏢 Commercial spaces require special attention to functionality and branding. What type of commercial space? (office, retail, restaurant, etc.)",
        nextStep: CONVERSATION_STEPS.ROOM_TYPE,
        isComplete: false
      };
    }
    
    if (intent.type === 'renovation') {
      context.collectedData.projectType = 'renovation';
      return {
        message: "Renovations are exciting! 🔨 Which area are you renovating? (kitchen, bathroom, entire home, etc.)",
        nextStep: CONVERSATION_STEPS.ROOM_TYPE,
        isComplete: false
      };
    }
    
    return {
      message: "I'd love to help! What type of project are you planning? You can choose from:\n• Residential (homes, apartments)\n• Commercial (offices, retail spaces)\n• Renovation (updating existing spaces)",
      nextStep: CONVERSATION_STEPS.PROJECT_TYPE,
      isComplete: false
    };
  }

  // Handle room type step
  handleRoomType(intent, context) {
    const roomType = intent.type;
    context.collectedData.roomType = roomType;
    
    return {
      message: `Perfect! ${roomType.charAt(0).toUpperCase() + roomType.slice(1)}s are wonderful spaces to design. What's your preferred design style? Here are some popular options:\n\n${Object.entries(DESIGN_STYLES).map(([style, desc]) => `• ${style.charAt(0).toUpperCase() + style.slice(1)}: ${desc}`).join('\n')}`,
      nextStep: CONVERSATION_STEPS.DESIGN_STYLE,
      isComplete: false
    };
  }

  // Handle design style step
  handleDesignStyle(intent, context) {
    if (intent.type in DESIGN_STYLES) {
      context.collectedData.designStyle = intent.type;
      return {
        message: `Beautiful choice! ${intent.type.charAt(0).toUpperCase() + intent.type.slice(1)} style is ${DESIGN_STYLES[intent.type]}. Now, let's talk budget. What's your budget range for this project?\n\n${Object.entries(BUDGET_RANGES).map(([range, label]) => `• ${label}`).join('\n')}`,
        nextStep: CONVERSATION_STEPS.BUDGET,
        isComplete: false
      };
    }
    
    return {
      message: "I'd love to know your design preference! Which style appeals to you most? You can choose from modern, traditional, contemporary, minimalist, industrial, scandinavian, bohemian, coastal, farmhouse, mid-century, art-deco, or other.",
      nextStep: CONVERSATION_STEPS.DESIGN_STYLE,
      isComplete: false
    };
  }

  // Handle budget step
  handleBudget(intent, context) {
    if (intent.type in BUDGET_RANGES) {
      context.collectedData.budget = intent.type;
      return {
        message: `Perfect! ${BUDGET_RANGES[intent.type]} is a great budget range. What's your timeline for this project?\n\n${Object.entries(TIMELINE_OPTIONS).map(([timeline, label]) => `• ${label}`).join('\n')}`,
        nextStep: CONVERSATION_STEPS.TIMELINE,
        isComplete: false
      };
    }
    
    return {
      message: "Understanding your budget helps us plan the perfect project! What's your budget range? You can choose from under $10,000, $10,000-$25,000, $25,000-$50,000, $50,000-$100,000, or over $100,000.",
      nextStep: CONVERSATION_STEPS.BUDGET,
      isComplete: false
    };
  }

  // Handle timeline step
  handleTimeline(intent, context) {
    if (intent.type in TIMELINE_OPTIONS) {
      context.collectedData.timeline = intent.type;
      return {
        message: `Great! ${TIMELINE_OPTIONS[intent.type]} gives us good time to plan. What's the approximate size of the space? (e.g., 500 sq ft, small bedroom, large open concept, etc.)`,
        nextStep: CONVERSATION_STEPS.ROOM_SIZE,
        isComplete: false
      };
    }
    
    return {
      message: "Timeline is important for planning! When would you like to complete this project? You can choose from 1-3 months, 3-6 months, 6-12 months, or over 12 months.",
      nextStep: CONVERSATION_STEPS.TIMELINE,
      isComplete: false
    };
  }

  // Handle room size step
  handleRoomSize(message, context) {
    context.collectedData.roomSize = message;
    
    return {
      message: "Thanks! Now I'd love to get your contact information so our team can reach out with a personalized proposal. What's your name?",
      nextStep: CONVERSATION_STEPS.CONTACT_INFO,
      isComplete: false
    };
  }

  // Handle contact info step
  handleContactInfo(intent, message, context) {
    if (intent.type === 'name') {
      context.collectedData.name = message;
      return {
        message: "Nice to meet you! What's your email address so we can send you our proposal?",
        nextStep: CONVERSATION_STEPS.CONTACT_INFO,
        isComplete: false
      };
    }
    
    if (intent.type === 'email') {
      context.collectedData.email = intent.data;
      return {
        message: "Perfect! Finally, do you have any specific requirements or additional notes about your project? (e.g., must-have features, special considerations, etc.)",
        nextStep: CONVERSATION_STEPS.ADDITIONAL_NOTES,
        isComplete: false
      };
    }
    
    // If we have both name and email, move to additional notes
    if (context.collectedData.name && context.collectedData.email) {
      return {
        message: "Great! Do you have any specific requirements or additional notes about your project? (e.g., must-have features, special considerations, etc.)",
        nextStep: CONVERSATION_STEPS.ADDITIONAL_NOTES,
        isComplete: false
      };
    }
    
    return {
      message: "I'd love to get your contact information! What's your name?",
      nextStep: CONVERSATION_STEPS.CONTACT_INFO,
      isComplete: false
    };
  }

  // Handle additional notes step
  handleAdditionalNotes(message, context) {
    context.collectedData.additionalNotes = message;
    
    return {
      message: `🎉 Perfect! Thank you for sharing your project details with me. Here's a summary of what we discussed:\n\n` +
        `• Project Type: ${context.collectedData.projectType}\n` +
        `• Room Type: ${context.collectedData.roomType}\n` +
        `• Design Style: ${context.collectedData.designStyle}\n` +
        `• Budget: ${BUDGET_RANGES[context.collectedData.budget]}\n` +
        `• Timeline: ${TIMELINE_OPTIONS[context.collectedData.timeline]}\n` +
        `• Room Size: ${context.collectedData.roomSize}\n\n` +
        `Our team will review your requirements and get back to you within 24 hours with a personalized proposal. We're excited to help bring your vision to life! 🏠✨`,
      nextStep: CONVERSATION_STEPS.COMPLETE,
      isComplete: true,
      nextSteps: [
        "Our design team will review your requirements",
        "You'll receive a personalized proposal within 24 hours",
        "We'll schedule a consultation to discuss your project in detail"
      ]
    };
  }

  // Get conversation context from database
  async getConversationContext(sessionId) {
    try {
      const lastMessage = await ChatMessage.findOne({ sessionId })
        .sort({ createdAt: -1 });
      
      if (lastMessage && lastMessage.context) {
        return lastMessage.context;
      }
      
      return {
        currentStep: CONVERSATION_STEPS.GREETING,
        collectedData: {},
        userPreferences: {}
      };
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return {
        currentStep: CONVERSATION_STEPS.GREETING,
        collectedData: {},
        userPreferences: {}
      };
    }
  }

  // Update conversation context
  async updateContext(sessionId, currentStep, intent, message, response) {
    try {
      const context = await this.getConversationContext(sessionId);
      
      // Update current step
      context.currentStep = response.nextStep || currentStep;
      
      // Update collected data based on intent
      if (intent.type && intent.confidence > 0.6) {
        switch (currentStep) {
          case CONVERSATION_STEPS.PROJECT_TYPE:
            context.collectedData.projectType = intent.type;
            break;
          case CONVERSATION_STEPS.ROOM_TYPE:
            context.collectedData.roomType = intent.type;
            break;
          case CONVERSATION_STEPS.DESIGN_STYLE:
            context.collectedData.designStyle = intent.type;
            break;
          case CONVERSATION_STEPS.BUDGET:
            context.collectedData.budget = intent.type;
            break;
          case CONVERSATION_STEPS.TIMELINE:
            context.collectedData.timeline = intent.type;
            break;
          case CONVERSATION_STEPS.CONTACT_INFO:
            if (intent.type === 'email') {
              context.collectedData.email = intent.data;
            } else if (intent.type === 'name') {
              context.collectedData.name = message;
            }
            break;
        }
      }
      
      return context;
    } catch (error) {
      console.error('Error updating context:', error);
      return {
        currentStep: CONVERSATION_STEPS.GREETING,
        collectedData: {},
        userPreferences: {}
      };
    }
  }

  // Process image upload
  async processImageUpload(imageData, imageType, sessionId) {
    try {
      // For now, save to local storage
      const uploadPath = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      const filename = `chat-${sessionId}-${Date.now()}.jpg`;
      const filePath = path.join(uploadPath, filename);
      
      // Convert base64 to file
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, base64Data, 'base64');
      
      return {
        url: `/uploads/${filename}`,
        publicId: filename,
        type: imageType
      };
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Update design preferences
  async updateDesignPreferences(sessionId, preferences) {
    try {
      const context = await this.getConversationContext(sessionId);
      context.userPreferences = { ...context.userPreferences, ...preferences };
      
      // Save updated context
      const lastMessage = await ChatMessage.findOne({ sessionId })
        .sort({ createdAt: -1 });
      
      if (lastMessage) {
        lastMessage.context = context;
        await lastMessage.save();
      }
      
      return context;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw new Error('Failed to update preferences');
    }
  }
}

module.exports = new ChatbotService(); 