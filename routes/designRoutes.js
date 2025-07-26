const express = require('express');
const router = express.Router();
const Design = require('../models/Design');
const { body, validationResult } = require('express-validator');

// Get all designs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const { 
      category, 
      designStyle, 
      status, 
      featured, 
      limit = 12, 
      page = 1,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    let query = { isPublic: true };
    
    // Apply filters
    if (category) query.category = category;
    if (designStyle) query.designStyle = designStyle;
    if (status) query.status = status;
    if (featured === 'true') query.isFeatured = true;
    
    // Search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const designs = await Design.find(query)
      .populate('teamMember', 'name position image')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Design.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        designs,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: skip + designs.length < total,
          hasPrev: parseInt(page) > 1,
          totalItems: total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch designs'
    });
  }
});

// Get featured designs
router.get('/featured', async (req, res) => {
  try {
    const { limit = 6 } = req.query;
    
    const designs = await Design.getFeaturedDesigns(parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: designs
    });
  } catch (error) {
    console.error('Error fetching featured designs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch featured designs'
    });
  }
});

// Get designs by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 12 } = req.query;
    
    const designs = await Design.getDesignsByCategory(category, parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: {
        category,
        designs,
        total: designs.length
      }
    });
  } catch (error) {
    console.error('Error fetching designs by category:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch designs by category'
    });
  }
});

// Search designs
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query is required'
      });
    }
    
    const designs = await Design.searchDesigns(q, parseInt(limit));
    
    res.status(200).json({
      status: 'success',
      data: {
        query: q,
        designs,
        total: designs.length
      }
    });
  } catch (error) {
    console.error('Error searching designs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to search designs'
    });
  }
});

// Get single design
router.get('/:id', async (req, res) => {
  try {
    const design = await Design.findById(req.params.id)
      .populate('teamMember', 'name position image description expertise');
    
    if (!design) {
      return res.status(404).json({
        status: 'error',
        message: 'Design not found'
      });
    }
    
    // Increment views
    await design.incrementViews();
    
    res.status(200).json({
      status: 'success',
      data: design
    });
  } catch (error) {
    console.error('Error fetching design:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch design'
    });
  }
});

// Create new design
router.post('/', [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').isIn(['residential', 'commercial', 'kitchen', 'bathroom', 'living-room', 'bedroom', 'office', 'outdoor', 'other']).withMessage('Invalid category'),
  body('designStyle').isIn(['modern', 'traditional', 'contemporary', 'minimalist', 'industrial', 'scandinavian', 'bohemian', 'coastal', 'farmhouse', 'mid-century', 'art-deco', 'other']).withMessage('Invalid design style'),
  body('images').isArray().withMessage('Images must be an array'),
  body('images.*.url').isURL().withMessage('Image URL must be valid'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('teamMember').optional().isMongoId().withMessage('Invalid team member ID')
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
    
    const design = new Design(req.body);
    await design.save();
    
    // Populate team member info
    await design.populate('teamMember', 'name position image');
    
    res.status(201).json({
      status: 'success',
      data: design
    });
  } catch (error) {
    console.error('Error creating design:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create design'
    });
  }
});

// Update design
router.put('/:id', [
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('category').optional().isIn(['residential', 'commercial', 'kitchen', 'bathroom', 'living-room', 'bedroom', 'office', 'outdoor', 'other']).withMessage('Invalid category'),
  body('designStyle').optional().isIn(['modern', 'traditional', 'contemporary', 'minimalist', 'industrial', 'scandinavian', 'bohemian', 'coastal', 'farmhouse', 'mid-century', 'art-deco', 'other']).withMessage('Invalid design style'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('images.*.url').optional().isURL().withMessage('Image URL must be valid'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('teamMember').optional().isMongoId().withMessage('Invalid team member ID')
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
    
    const design = await Design.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('teamMember', 'name position image');
    
    if (!design) {
      return res.status(404).json({
        status: 'error',
        message: 'Design not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: design
    });
  } catch (error) {
    console.error('Error updating design:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update design'
    });
  }
});

// Delete design
router.delete('/:id', async (req, res) => {
  try {
    const design = await Design.findByIdAndDelete(req.params.id);
    
    if (!design) {
      return res.status(404).json({
        status: 'error',
        message: 'Design not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Design deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting design:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete design'
    });
  }
});

// Toggle design featured status
router.patch('/:id/toggle-featured', async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    
    if (!design) {
      return res.status(404).json({
        status: 'error',
        message: 'Design not found'
      });
    }
    
    design.isFeatured = !design.isFeatured;
    await design.save();
    
    res.status(200).json({
      status: 'success',
      data: design
    });
  } catch (error) {
    console.error('Error toggling design featured status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle design featured status'
    });
  }
});

// Like design
router.post('/:id/like', async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    
    if (!design) {
      return res.status(404).json({
        status: 'error',
        message: 'Design not found'
      });
    }
    
    await design.incrementLikes();
    
    res.status(200).json({
      status: 'success',
      data: {
        likes: design.likes
      }
    });
  } catch (error) {
    console.error('Error liking design:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to like design'
    });
  }
});

// Add before/after images
router.post('/:id/before-after', [
  body('beforeImage').isURL().withMessage('Before image URL must be valid'),
  body('afterImage').isURL().withMessage('After image URL must be valid'),
  body('caption').optional().trim().isLength({ max: 200 }).withMessage('Caption cannot exceed 200 characters')
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
    
    const design = await Design.findById(req.params.id);
    
    if (!design) {
      return res.status(404).json({
        status: 'error',
        message: 'Design not found'
      });
    }
    
    design.beforeAfterImages.push(req.body);
    await design.save();
    
    res.status(200).json({
      status: 'success',
      data: design.beforeAfterImages[design.beforeAfterImages.length - 1]
    });
  } catch (error) {
    console.error('Error adding before/after images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add before/after images'
    });
  }
});

// Get design statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const totalDesigns = await Design.countDocuments({ isPublic: true });
    const featuredDesigns = await Design.countDocuments({ isPublic: true, isFeatured: true });
    const totalViews = await Design.aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);
    const totalLikes = await Design.aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: null, totalLikes: { $sum: '$likes' } } }
    ]);
    
    // Designs by category
    const designsByCategory = await Design.aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Designs by style
    const designsByStyle = await Design.aggregate([
      { $match: { isPublic: true } },
      { $group: { _id: '$designStyle', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        totalDesigns,
        featuredDesigns,
        totalViews: totalViews[0]?.totalViews || 0,
        totalLikes: totalLikes[0]?.totalLikes || 0,
        designsByCategory,
        designsByStyle
      }
    });
  } catch (error) {
    console.error('Error fetching design statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch design statistics'
    });
  }
});

module.exports = router; 