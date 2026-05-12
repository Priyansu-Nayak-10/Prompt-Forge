const { supabaseAdmin } = require('../config/supabase');

const getUserFromToken = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    return error ? null : user;
};

const requireUser = async (req, res, next) => {
    try {
        const user = await getUserFromToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        const user = await getUserFromToken(req);
        if (!user) return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });

        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Forbidden: Admin access required' });
        }

        req.user = user;
        next();
    } catch (err) {
        next(err);
    }
};

module.exports = { requireAdmin, requireUser };
