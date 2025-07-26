const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    index: true
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  response: {
    type: String,
    required: [true, 'Response is required'],
    trim: true,
    maxlength: [2000, 'Response cannot exceed 2000 characters']
  },
  messageType: {
    type: String,
    enum: ['user', 'bot'],
    default: 'user'
  },
  intent: {
    type: String,
    trim: true,
    maxlength: [100, 'Intent cannot exceed 100 characters']
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  context: {
    currentStep: {
      type: String,
      trim: true
    },
    userPreferences: {
      designStyle: String,
      budget: String,
      roomType: String,
      timeline: String
    },
    collectedData: {
      name: String,
      email: String,
      phone: String,
      projectType: String,
      roomSize: String,
      budget: String,
      timeline: String,
      designStyle: String,
      additionalNotes: String
    }
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ userId: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: -1 });

// Virtual for message age
chatMessageSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Pre-save middleware to clean up context
chatMessageSchema.pre('save', function(next) {
  // Remove empty strings from context
  if (this.context && this.context.userPreferences) {
    Object.keys(this.context.userPreferences).forEach(key => {
      if (this.context.userPreferences[key] === '') {
        delete this.context.userPreferences[key];
      }
    });
  }
  
  if (this.context && this.context.collectedData) {
    Object.keys(this.context.collectedData).forEach(key => {
      if (this.context.collectedData[key] === '') {
        delete this.context.collectedData[key];
      }
    });
  }
  
  next();
});

// Static method to get conversation history
chatMessageSchema.statics.getConversationHistory = function(sessionId, limit = 50) {
  return this.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .sort({ createdAt: 1 });
};

// Static method to get user sessions
chatMessageSchema.statics.getUserSessions = function(userId) {
  return this.distinct('sessionId', { userId });
};

// Instance method to check if conversation is complete
chatMessageSchema.methods.isConversationComplete = function() {
  const requiredFields = ['name', 'email', 'projectType', 'roomSize', 'budget'];
  const collectedData = this.context?.collectedData || {};
  
  return requiredFields.every(field => 
    collectedData[field] && collectedData[field].trim() !== ''
  );
};

module.exports = mongoose.model('ChatMessage', chatMessageSchema); 