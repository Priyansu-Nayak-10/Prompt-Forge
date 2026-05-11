import { signIn, redirectIfLoggedIn } from '../auth.js';
import { setButtonLoading } from '../core.js';

// Redirect to dashboard if already logged in
await redirectIfLoggedIn('/dashboard.html');

const form     = document.getElementById('login-form');
const emailEl  = document.getElementById('email');
const passEl   = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-pw');

// Toggle password visibility
toggleBtn.addEventListener('click', () => {
    const isHidden = passEl.type === 'password';
    passEl.type = isHidden ? 'text' : 'password';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

// Clear error when user types
[emailEl, passEl].forEach(el => el.addEventListener('input', () => { errorMsg.textContent = ''; }));

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.textContent = '';

    const email    = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
        errorMsg.textContent = 'Please fill in all fields.';
        return;
    }

    const restore = setButtonLoading(submitBtn, 'Signing in...');

    try {
        await signIn(email, password);
        const urlParams = new URLSearchParams(window.location.search);
        const nextUrl = urlParams.get('next') || '/dashboard.html';
        window.location.href = nextUrl;
    } catch (err) {
        errorMsg.textContent = err.message?.includes('Invalid login')
            ? 'Incorrect email or password.'
            : (err.message || 'Sign in failed. Please try again.');
        restore();
        passEl.focus();
    }
});
