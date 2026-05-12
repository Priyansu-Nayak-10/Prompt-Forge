const express = require('express');
const router  = express.Router();
const stripe  = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireUser } = require('../middleware/auth.middleware');
const asyncHandler    = require('../utils/asyncHandler');

// POST /api/checkout/create-session
// Create a Stripe Checkout Session for a "Tip" or "Premium" purchase
router.post('/create-session', asyncHandler(requireUser), asyncHandler(async (req, res) => {
    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(503).json({ success: false, error: 'Payments not configured.' });
    }

    const { promptId, promptTitle } = req.body;
    const publicUrl = process.env.PUBLIC_URL || `http://${req.headers.host}`;

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Support Creator: ${promptTitle || 'Prompt'}`,
                        description: `Tip for prompt ID: ${promptId}`,
                    },
                    unit_amount: 500, // $5.00 fixed tip for now
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: `${publicUrl}/prompt-detail.html?slug=${req.body.slug}&success=true`,
        cancel_url:  `${publicUrl}/prompt-detail.html?slug=${req.body.slug}&canceled=true`,
        metadata: {
            prompt_id: promptId,
            user_id:   req.user.id
        }
    });

    res.json({ success: true, url: session.url });
}));

module.exports = router;
