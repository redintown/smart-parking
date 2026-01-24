/**
 * Admin Verify OTP - calls adminAuth.verifySignupOtp, redirects to admin-login on success.
 */

function prefillEmail() {
    var p = new URLSearchParams(window.location.search);
    var email = p.get('email');
    var el = document.getElementById('verifyEmail');
    if (email && el) el.value = decodeURIComponent(email);
    var dev = p.get('dev');
    var banner = document.getElementById('devFallbackBanner');
    if (dev === '1' && banner) banner.style.display = 'flex';
}

function showError(msg) {
    var el = document.getElementById('verifyErrorMessage');
    var text = document.getElementById('verifyErrorText');
    if (text) text.textContent = msg || 'Verification failed.';
    if (el) el.style.display = 'flex';
}

async function handleVerify(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    var email = (document.getElementById('verifyEmail') && document.getElementById('verifyEmail').value) || '';
    var otp = (document.getElementById('verifyOtp') && document.getElementById('verifyOtp').value) || '';
    email = email.trim().toLowerCase();
    otp = otp.trim().replace(/\D/g, '').slice(0, 6);
    var err = document.getElementById('verifyErrorMessage');
    var ok = document.getElementById('verifySuccessMessage');
    var btn = document.getElementById('verifyButton');
    var bt = btn && btn.querySelector('.button-text');
    var loader = document.getElementById('verifyButtonLoader');
    if (err) err.style.display = 'none';
    if (ok) ok.style.display = 'none';
    if (!email) { showError('Email is required'); return false; }
    if (otp.length !== 6) { showError('Please enter the 6-digit OTP'); return false; }
    if (btn) btn.disabled = true;
    if (bt) bt.style.display = 'none';
    if (loader) loader.style.display = 'block';
    try {
        var r = (window.adminAuth && window.adminAuth.verifySignupOtp)
            ? await window.adminAuth.verifySignupOtp(email, otp)
            : { success: false, message: 'Auth not loaded. Refresh the page.' };
        if (r.success) {
            if (ok) ok.style.display = 'flex';
            setTimeout(function() { window.location.href = 'admin-login.html'; }, 800);
            return false;
        }
        showError(r.message || 'Invalid OTP. Please try again.');
    } catch (e) {
        showError('Network error. Please try again.');
    }
    if (btn) btn.disabled = false;
    if (bt) bt.style.display = 'block';
    if (loader) loader.style.display = 'none';
    return false;
}

document.addEventListener('DOMContentLoaded', prefillEmail);
