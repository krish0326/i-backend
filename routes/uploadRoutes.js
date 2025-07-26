const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

// Configure Cloudinary (optional for future use)
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Configure local storage for multer
const localStorage = multer.diskStorage({
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

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer with local storage
const upload = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Configure multer with local storage as fallback
const uploadLocal = multer({
  storage: localStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Upload single image
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        url: `/uploads/${req.file.filename}`,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload image',
      error: error.message
    });
  }
});

// Upload multiple images
router.post('/images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No image files provided'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      publicId: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    }));

    res.status(200).json({
      status: 'success',
      data: {
        files: uploadedFiles,
        total: uploadedFiles.length
      }
    });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload images',
      error: error.message
    });
  }
});

// Upload design images with specific folder
router.post('/design-images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No image files provided'
      });
    }

    const { designId, imageType } = req.body;
    const folder = designId ? `interior-design/designs/${designId}` : 'interior-design/designs';

    // Upload to Cloudinary with specific folder
    const uploadPromises = req.files.map(async (file) => {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: folder,
          transformation: [
            { width: 1200, height: 800, crop: 'limit' },
            { quality: 'auto' }
          ]
        });

        // Delete local file after upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        return {
          url: result.secure_url,
          publicId: result.public_id,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          imageType: imageType || 'general'
        };
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        throw uploadError;
      }
    });

    const uploadedFiles = await Promise.all(uploadPromises);

    res.status(200).json({
      status: 'success',
      data: {
        files: uploadedFiles,
        total: uploadedFiles.length,
        designId,
        folder
      }
    });
  } catch (error) {
    console.error('Error uploading design images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload design images',
      error: error.message
    });
  }
});

// Upload team member profile image
router.post('/team-profile', upload.single('profile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No profile image provided'
      });
    }

    const { teamMemberId } = req.body;
    const folder = teamMemberId ? `interior-design/team/${teamMemberId}` : 'interior-design/team';

    // Upload to Cloudinary with team folder
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: folder,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });

    // Delete local file after upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(200).json({
      status: 'success',
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Error uploading team profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload team profile',
      error: error.message
    });
  }
});

// Upload before/after images
router.post('/before-after', upload.array('images', 2), async (req, res) => {
  try {
    if (!req.files || req.files.length !== 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Exactly 2 images (before and after) are required'
      });
    }

    const { designId, caption } = req.body;
    const folder = designId ? `interior-design/before-after/${designId}` : 'interior-design/before-after';

    // Upload both images to Cloudinary
    const uploadPromises = req.files.map(async (file, index) => {
      try {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: folder,
          transformation: [
            { width: 800, height: 600, crop: 'limit' },
            { quality: 'auto' }
          ]
        });

        // Delete local file after upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }

        return {
          url: result.secure_url,
          publicId: result.public_id,
          originalName: file.originalname,
          type: index === 0 ? 'before' : 'after'
        };
      } catch (uploadError) {
        console.error('Error uploading before/after image:', uploadError);
        throw uploadError;
      }
    });

    const uploadedImages = await Promise.all(uploadPromises);

    const beforeAfterData = {
      beforeImage: uploadedImages[0].url,
      afterImage: uploadedImages[1].url,
      caption: caption || '',
      beforePublicId: uploadedImages[0].publicId,
      afterPublicId: uploadedImages[1].publicId
    };

    res.status(200).json({
      status: 'success',
      data: beforeAfterData
    });
  } catch (error) {
    console.error('Error uploading before/after images:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to upload before/after images',
      error: error.message
    });
  }
});

// Delete image from Cloudinary
router.delete('/image/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;

    const result = await cloudinary.uploader.destroy(publicId);

    res.status(200).json({
      status: 'success',
      message: 'Image deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete image',
      error: error.message
    });
  }
});

// Get upload statistics
router.get('/stats', async (req, res) => {
  try {
    // Get Cloudinary usage statistics
    const usage = await cloudinary.api.usage();

    res.status(200).json({
      status: 'success',
      data: {
        uploads: {
          total: usage.used || 0,
          limit: usage.limit || 0,
          remaining: (usage.limit || 0) - (usage.used || 0)
        },
        bandwidth: {
          used: usage.used || 0,
          limit: usage.limit || 0
        },
        storage: {
          used: usage.used || 0,
          limit: usage.limit || 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching upload stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch upload statistics',
      error: error.message
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum is 10 files.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        status: 'error',
        message: 'Unexpected file field.'
      });
    }
  }

  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      status: 'error',
      message: 'Only image files (jpg, jpeg, png, gif, webp) are allowed.'
    });
  }

  console.error('Upload error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Upload failed',
    error: error.message
  });
});

module.exports = router; 