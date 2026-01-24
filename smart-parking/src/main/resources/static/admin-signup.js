/**
 * Admin Sign Up - backend signup then Supabase signInWithOtp; redirect to verify-email.html.
 */

var SUPABASE_URL = 'https://urioslfgnnbzflviacyt.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyaW9zbGZnbm5iemZsdmlhY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDg1ODMsImV4cCI6MjA4MzcyNDU4M30.Bwbq2ON54X940V3kFwJk3Iwyeem5msbNDlfHf6pQWP8';

function showError(msg) {
    var el = document.getElementById('signupErrorMessage');
    var text = document.getElementById('signupErrorText');
    if (text) text.textContent = msg || 'Signup failed.';
    if (el) el.style.display = 'flex';
}

function getSupabase() {
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return null;
}

async function handleSignup(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    var username = (document.getElementById('signupUsername') && document.getElementById('signupUsername').value) || '';
    var email = (document.getElementById('signupEmail') && document.getElementById('signupEmail').value) || '';
    var password = (document.getElementById('signupPassword') && document.getElementById('signupPassword').value) || '';
    username = username.trim();
    email = email.trim().toLowerCase();
    var err = document.getElementById('signupErrorMessage');
    var ok = document.getElementById('signupSuccessMessage');
    var btn = document.getElementById('signupButton');
    var bt = btn && btn.querySelector('.button-text');
    var loader = document.getElementById('signupButtonLoader');
    if (err) err.style.display = 'none';
    if (ok) ok.style.display = 'none';
    if (!username || !email || !password) { showError('Please fill in all fields'); return false; }
    if (password.length < 6) { showError('Password must be at least 6 characters'); return false; }
    if (btn) btn.disabled = true;
    if (bt) bt.style.display = 'none';
    if (loader) loader.style.display = 'block';
    try {
        var r = (window.adminAuth && window.adminAuth.signUpAdmin)
            ? await window.adminAuth.signUpAdmin(username, email, password)
            : { success: false, message: 'Auth not loaded. Refresh the page.' };
        if (!r.success) {
            showError(r.message || 'Signup failed. Please try again.');
            if (btn) btn.disabled = false;
            if (bt) bt.style.display = 'block';
            if (loader) loader.style.display = 'none';
            return false;
        }
        var sb = getSupabase();
        if (!sb || !sb.auth) {
            showError('Could not send verification email. Please refresh and try again, or contact support.');
            if (btn) btn.disabled = false;
            if (bt) bt.style.display = 'block';
            if (loader) loader.style.display = 'none';
            return false;
        }
        var otpRes = await sb.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: null, shouldCreateUser: true }
        });
        if (otpRes.error) {
            showError(otpRes.error.message || 'Could not send OTP. Check Supabase Email settings or try again.');
            if (btn) btn.disabled = false;
            if (bt) bt.style.display = 'block';
            if (loader) loader.style.display = 'none';
            return false;
        }
        if (ok) ok.style.display = 'flex';
        try { sessionStorage.setItem('verifyEmail', email); } catch (e) {}
        window.location.href = 'verify-email.html?email=' + encodeURIComponent(email);
        return false;
    } catch (e) {
        showError(e.message || 'Network error. Please try again.');
    }
    if (btn) btn.disabled = false;
    if (bt) bt.style.display = 'block';
    if (loader) loader.style.display = 'none';
    return false;
}
