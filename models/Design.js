const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['residential', 'commercial', 'kitchen', 'bathroom', 'living-room', 'bedroom', 'office', 'outdoor', 'other'],
    default: 'residential'
  },
  designStyle: {
    type: String,
    required: [true, 'Design style is required'],
    enum: ['modern', 'traditional', 'contemporary', 'minimalist', 'industrial', 'scandinavian', 'bohemian', 'coastal', 'farmhouse', 'mid-century', 'art-deco', 'other'],
    default: 'modern'
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [200, 'Caption cannot exceed 200 characters']
    },
    isBefore: {
      type: Boolean,
      default: false
    },
    isAfter: {
      type: Boolean,
      default: false
    },
    order: {
      type: Number,
      default: 0
    }
  }],
  beforeAfterImages: [{
    beforeImage: {
      type: String,
      required: true
    },
    afterImage: {
      type: String,
      required: true
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [200, 'Caption cannot exceed 200 characters']
    }
  }],
  projectDetails: {
    clientName: {
      type: String,
      trim: true,
      maxlength: [100, 'Client name cannot exceed 100 characters']
    },
    projectSize: {
      type: String,
      trim: true
    },
    budget: {
      type: String,
      trim: true
    },
    timeline: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    }
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  teamMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamMember'
  },
  status: {
    type: String,
    enum: ['draft', 'in-progress', 'completed', 'archived'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  metadata: {
    colors: [String],
    materials: [String],
    furniture: [String],
    lighting: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
designSchema.index({ category: 1, designStyle: 1 });
designSchema.index({ status: 1, isPublic: 1 });
designSchema.index({ isFeatured: 1, createdAt: -1 });
designSchema.index({ tags: 1 });

// Virtual for main image
designSchema.virtual('mainImage').get(function() {
  if (this.images && this.images.length > 0) {
    const mainImage = this.images.find(img => img.order === 0) || this.images[0];
    return mainImage.url;
  }
  return null;
});

// Virtual for before/after count
designSchema.virtual('beforeAfterCount').get(function() {
  return this.beforeAfterImages ? this.beforeAfterImages.length : 0;
});

// Pre-save middleware
designSchema.pre('save', function(next) {
  // Ensure tags are unique
  if (this.tags) {
    this.tags = [...new Set(this.tags)];
  }
  
  // Ensure images have proper order
  if (this.images) {
    this.images.forEach((image, index) => {
      if (image.order === undefined) {
        image.order = index;
      }
    });
  }
  
  next();
});

// Static method to get featured designs
designSchema.statics.getFeaturedDesigns = function(limit = 6) {
  return this.find({ 
    isFeatured: true, 
    isPublic: true, 
    status: 'completed' 
  })
  .populate('teamMember', 'name position image')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get designs by category
designSchema.statics.getDesignsByCategory = function(category, limit = 12) {
  return this.find({ 
    category, 
    isPublic: true, 
    status: 'completed' 
  })
  .populate('teamMember', 'name position image')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to search designs
designSchema.statics.searchDesigns = function(query, limit = 20) {
  return this.find({
    $and: [
      { isPublic: true, status: 'completed' },
      {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } },
          { category: { $regex: query, $options: 'i' } },
          { designStyle: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  })
  .populate('teamMember', 'name position image')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Instance method to increment views
designSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to increment likes
designSchema.methods.incrementLikes = function() {
  this.likes += 1;
  return this.save();
};

module.exports = mongoose.model('Design', designSchema); 