const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const { body, validationResult } = require('express-validator');

// Get all team members
router.get('/', async (req, res) => {
  try {
    const { active, limit = 10, page = 1 } = req.query;
    
    let query = {};
    if (active === 'true') {
      query.isActive = true;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const teamMembers = await TeamMember.find(query)
      .sort({ order: 1, createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await TeamMember.countDocuments(query);
    
    res.status(200).json({
      status: 'success',
      data: {
        teamMembers,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / parseInt(limit)),
          hasNext: skip + teamMembers.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team members'
    });
  }
});

// Get active team members (for frontend)
router.get('/active', async (req, res) => {
  try {
    const teamMembers = await TeamMember.getActiveMembers();
    
    res.status(200).json({
      status: 'success',
      data: teamMembers
    });
  } catch (error) {
    console.error('Error fetching active team members:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch active team members'
    });
  }
});

// Get single team member
router.get('/:id', async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id);
    
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: teamMember
    });
  } catch (error) {
    console.error('Error fetching team member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team member'
    });
  }
});

// Create new team member
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('position').trim().isLength({ min: 2, max: 100 }).withMessage('Position must be between 2 and 100 characters'),
  body('image').isURL().withMessage('Image must be a valid URL'),
  body('description').trim().isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),
  body('experience').trim().notEmpty().withMessage('Experience is required'),
  body('projects').trim().notEmpty().withMessage('Projects count is required'),
  body('expertise').isArray().withMessage('Expertise must be an array'),
  body('expertise.*').trim().isLength({ min: 2, max: 50 }).withMessage('Expertise items must be between 2 and 50 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const teamMember = new TeamMember(req.body);
    await teamMember.save();
    
    res.status(201).json({
      status: 'success',
      data: teamMember
    });
  } catch (error) {
    console.error('Error creating team member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create team member'
    });
  }
});

// Update team member
router.put('/:id', [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('position').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Position must be between 2 and 100 characters'),
  body('image').optional().isURL().withMessage('Image must be a valid URL'),
  body('description').optional().trim().isLength({ min: 10, max: 500 }).withMessage('Description must be between 10 and 500 characters'),
  body('expertise').optional().isArray().withMessage('Expertise must be an array'),
  body('expertise.*').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Expertise items must be between 2 and 50 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    const teamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: teamMember
    });
  } catch (error) {
    console.error('Error updating team member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update team member'
    });
  }
});

// Delete team member
router.delete('/:id', async (req, res) => {
  try {
    const teamMember = await TeamMember.findByIdAndDelete(req.params.id);
    
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Team member deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting team member:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete team member'
    });
  }
});

// Toggle team member active status
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id);
    
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }
    
    teamMember.isActive = !teamMember.isActive;
    await teamMember.save();
    
    res.status(200).json({
      status: 'success',
      data: teamMember
    });
  } catch (error) {
    console.error('Error toggling team member status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to toggle team member status'
    });
  }
});

// Update team member order
router.patch('/:id/order', [
  body('order').isInt({ min: 0 }).withMessage('Order must be a non-negative integer')
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
    
    const teamMember = await TeamMember.findByIdAndUpdate(
      req.params.id,
      { order: req.body.order },
      { new: true }
    );
    
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: teamMember
    });
  } catch (error) {
    console.error('Error updating team member order:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update team member order'
    });
  }
});

module.exports = router; 