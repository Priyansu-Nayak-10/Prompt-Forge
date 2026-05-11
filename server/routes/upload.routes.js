const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { supabaseAdmin } = require('../config/supabase');
const slugify = require('slugify');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

const handleUpload = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image uploaded' });
    }

    const fileExt = req.file.originalname.split('.').pop();
    const originalName = req.file.originalname.replace(`.${fileExt}`, '');
    const cleanSlug = slugify(originalName, { lower: true, strict: true });
    // Add timestamp to ensure uniqueness in storage and prevent immediate overwrites
    const fileName = `prompts/${cleanSlug}-${Date.now()}.${fileExt}`;

    const { data, error } = await supabaseAdmin.storage
        .from('prompt-images')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
        });

    if (error) {
        throw error;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
        .from('prompt-images')
        .getPublicUrl(fileName);

    res.status(200).json({ success: true, url: publicUrl });
};

router.post(
    '/',
    uploadLimiter,
    asyncHandler(requireAdmin),
    upload.single('image'),
    asyncHandler(handleUpload)
);

module.exports = router;
