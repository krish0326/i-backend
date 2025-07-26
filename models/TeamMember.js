const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  position: {
    type: String,
    required: [true, 'Position is required'],
    trim: true,
    maxlength: [100, 'Position cannot exceed 100 characters']
  },
  image: {
    type: String,
    required: [true, 'Image URL is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  expertise: [{
    type: String,
    trim: true,
    maxlength: [50, 'Expertise item cannot exceed 50 characters']
  }],
  experience: {
    type: String,
    required: [true, 'Experience is required'],
    trim: true
  },
  projects: {
    type: String,
    required: [true, 'Projects count is required'],
    trim: true
  },
  social: {
    linkedin: {
      type: String,
      trim: true
    },
    instagram: {
      type: String,
      trim: true
    },
    pinterest: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for better query performance
teamMemberSchema.index({ isActive: 1, order: 1 });

// Virtual for full name
teamMemberSchema.virtual('fullName').get(function() {
  return this.name;
});

// Pre-save middleware to ensure expertise is unique
teamMemberSchema.pre('save', function(next) {
  if (this.expertise) {
    this.expertise = [...new Set(this.expertise)];
  }
  next();
});

// Static method to get active team members
teamMemberSchema.statics.getActiveMembers = function() {
  return this.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
};

// Instance method to get member stats
teamMemberSchema.methods.getStats = function() {
  return {
    experience: this.experience,
    projects: this.projects,
    expertiseCount: this.expertise.length
  };
};

module.exports = mongoose.model('TeamMember', teamMemberSchema); 