const multer   = require('multer');
const express  = require('express');
const router   = express.Router();
const { requireAdmin }  = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter.middleware');
const asyncHandler      = require('../utils/asyncHandler');
const { supabaseAdmin } = require('../config/supabase');
const slugify  = require('slugify');

// Memory storage — buffer validated before touching the filesystem
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        // First-pass: MIME type reported by browser
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed.'), false);
        }
        cb(null, true);
    },
});

// Allowed magic-byte signatures for common image formats
const IMAGE_SIGNATURES = [
    { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
    { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47] },
    { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
    { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF header (WEBP follows at offset 8)
];

const checkMagicBytes = (buffer) => {
    for (const sig of IMAGE_SIGNATURES) {
        if (sig.bytes.every((byte, i) => buffer[i] === byte)) return true;
    }
    return false;
};

const handleUpload = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image uploaded.' });
    }

    // Second-pass: validate magic bytes from actual buffer content
    if (!checkMagicBytes(req.file.buffer)) {
        return res.status(400).json({
            success: false,
            error: 'File does not appear to be a valid image. Upload rejected.',
        });
    }

    const fileExt    = req.file.originalname.split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseName   = req.file.originalname.replace(`.${fileExt}`, '');
    const cleanSlug  = slugify(baseName, { lower: true, strict: true });
    const fileName   = `prompts/${cleanSlug}-${Date.now()}.${fileExt}`;

    const { error } = await supabaseAdmin.storage
        .from('prompt-images')
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false,
        });

    if (error) throw error;

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
