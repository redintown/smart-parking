/**
 * Verify Email - Supabase verifyOtp flow.
 * Step 1 (no email): Enter email → check pending → signInWithOtp → show OTP form.
 * Step 2 (has email): Enter 6-digit OTP → verifyOtp → POST /admin/confirm-email-verified → redirect to admin-login.
 * Resend = signInWithOtp with 60s cooldown.
 * Links from admin-signup and admin-login let users verify after reload.
 */

(function () {
    'use strict';

    var SUPABASE_URL = 'https://urioslfgnnbzflviacyt.supabase.co';
    var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyaW9zbGZnbm5iemZsdmlhY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDg1ODMsImV4cCI6MjA4MzcyNDU4M30.Bwbq2ON54X940V3kFwJk3Iwyeem5msbNDlfHf6pQWP8';

    var supabase = null;
    var resendCooldownSec = 0;
    var resendTimerId = null;

    function getSupabase() {
        if (supabase) return supabase;
        if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return supabase;
        }
        return null;
    }

    function getEmail() {
        var p = new URLSearchParams(window.location.search);
        var email = p.get('email');
        if (email) return decodeURIComponent(email);
        try { return sessionStorage.getItem('verifyEmail') || ''; } catch (e) { return ''; }
    }

    function setEmailStorage(email) {
        try { sessionStorage.setItem('verifyEmail', email); } catch (e) {}
    }

    function showError(msg) {
        var el = document.getElementById('verifyErrorMessage');
        var text = document.getElementById('verifyErrorText');
        if (text) text.textContent = msg || 'Verification failed.';
        if (el) el.style.display = 'flex';
        var ok = document.getElementById('verifySuccessMessage');
        if (ok) ok.style.display = 'none';
    }

    function showSuccess() {
        var ok = document.getElementById('verifySuccessMessage');
        var err = document.getElementById('verifyErrorMessage');
        if (ok) ok.style.display = 'flex';
        if (err) err.style.display = 'none';
    }

    function hideAll() {
        var e = document.getElementById('verifyErrorMessage');
        var s = document.getElementById('verifySuccessMessage');
        if (e) e.style.display = 'none';
        if (s) s.style.display = 'none';
    }

    function setResendCooldown(sec) {
        resendCooldownSec = sec;
        var btn = document.getElementById('resendOtpBtn');
        var cd = document.getElementById('resendCountdown');
        if (resendTimerId) clearInterval(resendTimerId);
        if (sec <= 0) {
            if (btn) { btn.disabled = false; btn.textContent = 'Resend OTP'; }
            if (cd) cd.style.display = 'none';
            return;
        }
        if (btn) btn.disabled = true;
        if (cd) { cd.style.display = 'inline'; cd.textContent = 'Resend in ' + sec + 's'; }
        resendTimerId = setInterval(function () {
            resendCooldownSec--;
            if (cd) cd.textContent = 'Resend in ' + resendCooldownSec + 's';
            if (resendCooldownSec <= 0) {
                clearInterval(resendTimerId);
                resendTimerId = null;
                setResendCooldown(0);
            }
        }, 1000);
    }

    function userFriendlyError(err) {
        if (!err) return 'Verification failed. Please try again.';
        var m = (err.message || '').toLowerCase();
        if (m.indexOf('expired') !== -1) return 'OTP has expired. Please use Resend OTP.';
        if (m.indexOf('invalid') !== -1 || m.indexOf('token') !== -1) return 'Invalid OTP. Please check and try again.';
        if (m.indexOf('already') !== -1 || m.indexOf('verified') !== -1) return 'This email is already verified. You can log in.';
        if (m.indexOf('rate') !== -1 || m.indexOf('limit') !== -1) return 'Too many attempts. Please wait a moment.';
        return err.message || 'Verification failed. Please try again.';
    }

    window.handleVerify = async function (event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        var vSection = document.getElementById('verifyOtpSection');
        if (vSection && vSection.style.display === 'none') {
            if (typeof window.handleSendOtpToEmail === 'function') window.handleSendOtpToEmail();
            return false;
        }
        var email = (document.getElementById('verifyEmail') && document.getElementById('verifyEmail').value) || '';
        var raw = (document.getElementById('verifyOtp') && document.getElementById('verifyOtp').value) || '';
        var otp = raw.trim().replace(/\D/g, '').slice(0, 6);
        var btn = document.getElementById('verifyButton');
        var btnText = btn && btn.querySelector('.button-text');
        var loader = document.getElementById('verifyButtonLoader');

        email = email.trim().toLowerCase();
        hideAll();
        if (!email) { showError('Email is required'); return false; }
        if (otp.length !== 6) { showError('Please enter the 6-digit OTP'); return false; }

        var sb = getSupabase();
        if (!sb || !sb.auth) {
            showError('Verification service is not available. Please refresh the page.');
            return false;
        }

        if (btn) btn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (loader) loader.style.display = 'block';

        try {
            var r = await sb.auth.verifyOtp({ email: email, token: otp, type: 'email' });
            if (r.error) {
                showError(userFriendlyError(r.error));
                if (btn) btn.disabled = false;
                if (btnText) btnText.style.display = 'block';
                if (loader) loader.style.display = 'none';
                return false;
            }
            var accessToken = r.data && r.data.session && r.data.session.access_token;
            if (!accessToken) {
                showError('Verification succeeded but no session. Please try again.');
                if (btn) btn.disabled = false;
                if (btnText) btnText.style.display = 'block';
                if (loader) loader.style.display = 'none';
                return false;
            }

            var confirmRes = await fetch('/admin/confirm-email-verified', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
                body: JSON.stringify({ email: email })
            });
            var text = await confirmRes.text();
            var confirmData = {};
            try { confirmData = JSON.parse(text); } catch (e) { /* non-JSON (e.g. HTML error page) */ }
            if (!confirmRes.ok || !confirmData.success) {
                var msg = (confirmData && typeof confirmData.message === 'string' && confirmData.message)
                    ? confirmData.message
                    : (confirmData && typeof confirmData.error === 'string' && confirmData.error)
                    ? confirmData.error
                    : (confirmData && typeof confirmData.detail === 'string' && confirmData.detail)
                    ? confirmData.detail
                    : null;
                if (!msg) {
                    msg = confirmRes.status === 401 ? 'Session expired. Please verify again.'
                        : (confirmRes.status >= 500 ? 'Server error. Please try again later.' : 'Invalid or expired verification token. Please use Resend OTP and try again.');
                }
                console.warn('confirm-email-verified failed: status=', confirmRes.status, 'body=', text ? text.slice(0, 500) : '', 'parsed=', confirmData);
                showError(msg);
                if (btn) btn.disabled = false;
                if (btnText) btnText.style.display = 'block';
                if (loader) loader.style.display = 'none';
                return false;
            }

            showSuccess();
            setTimeout(function () { window.location.href = 'admin-login.html'; }, 800);
        } catch (e) {
            console.error('Verify error:', e);
            showError(e.message || 'Network error. Please try again.');
            if (btn) btn.disabled = false;
            if (btnText) btnText.style.display = 'block';
            if (loader) loader.style.display = 'none';
        }
        return false;
    };

    window.handleResendOtp = async function () {
        if (resendCooldownSec > 0) return;
        var email = (document.getElementById('verifyEmail') && document.getElementById('verifyEmail').value) || '';
        email = email.trim().toLowerCase();
        if (!email) { showError('Email is required'); return; }

        var sb = getSupabase();
        if (!sb || !sb.auth) {
            showError('Verification service is not available. Please refresh the page.');
            return;
        }

        var btn = document.getElementById('resendOtpBtn');
        if (btn) btn.disabled = true;
        hideAll();

        try {
            var r = await sb.auth.signInWithOtp({
                email: email,
                options: { emailRedirectTo: null, shouldCreateUser: true }
            });
            if (r.error) {
                showError(userFriendlyError(r.error));
                if (btn) btn.disabled = false;
                return;
            }
            setResendCooldown(60); // keeps Resend disabled for 60s
        } catch (e) {
            console.error('Resend OTP error:', e);
            showError(e.message || 'Could not resend OTP. Try again.');
            if (btn) btn.disabled = false;
        }
    };

    window.handleSendOtpToEmail = async function () {
        var input = document.getElementById('verifyEmail');
        var email = (input && input.value) ? input.value.trim().toLowerCase() : '';
        hideAll();
        if (!email) { showError('Email is required'); return; }

        var sb = getSupabase();
        if (!sb || !sb.auth) {
            showError('Verification service is not available. Please refresh the page.');
            return;
        }

        var btn = document.getElementById('sendOtpToEmailBtn');
        if (btn) btn.disabled = true;

        try {
            var pend = await fetch('/admin/check-pending-verification?email=' + encodeURIComponent(email)).then(function (r) { return r.json(); }).catch(function () { return {}; });
            if (!pend || pend.pending !== true) {
                showError('No pending verification for this email. Please sign up first.');
                if (btn) btn.disabled = false;
                return;
            }
            var r = await sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: null, shouldCreateUser: true } });
            if (r.error) {
                showError(userFriendlyError(r.error));
                if (btn) btn.disabled = false;
                return;
            }
            setEmailStorage(email);
            if (input) input.setAttribute('readonly', 'readonly');
            var sendRow = document.getElementById('sendOtpRow');
            var step1Prompt = document.getElementById('step1SignupPrompt');
            var vSection = document.getElementById('verifyOtpSection');
            var formTitle = document.getElementById('formTitle');
            var formSubtitle = document.getElementById('formSubtitle');
            var backLink = document.getElementById('backToLogin');
            if (sendRow) sendRow.style.display = 'none';
            if (step1Prompt) step1Prompt.style.display = 'none';
            if (vSection) vSection.style.display = 'block';
            if (formTitle) formTitle.textContent = 'Verify Your Email';
            if (formSubtitle) formSubtitle.textContent = "We've sent a 6-digit OTP to your email";
            if (backLink) { backLink.classList.add('disabled'); backLink.setAttribute('title', 'Complete verification first'); }
            setResendCooldown(60);
            var otpEl = document.getElementById('verifyOtp');
            if (otpEl) { otpEl.focus(); otpEl.value = ''; }
        } catch (e) {
            console.error('Send OTP error:', e);
            showError(e.message || 'Could not send OTP. Try again.');
            if (btn) btn.disabled = false;
        }
    };

    function showStep1() {
        var formTitle = document.getElementById('formTitle');
        var formSubtitle = document.getElementById('formSubtitle');
        var input = document.getElementById('verifyEmail');
        var sendRow = document.getElementById('sendOtpRow');
        var step1Prompt = document.getElementById('step1SignupPrompt');
        var vSection = document.getElementById('verifyOtpSection');
        var backLink = document.getElementById('backToLogin');
        if (formTitle) formTitle.textContent = 'Complete Your Signup';
        if (formSubtitle) formSubtitle.textContent = "Enter the email you used to sign up. We'll send a new verification OTP.";
        if (input) { input.value = ''; input.removeAttribute('readonly'); }
        if (sendRow) sendRow.style.display = 'block';
        if (step1Prompt) step1Prompt.style.display = 'block';
        if (vSection) vSection.style.display = 'none';
        if (backLink) { backLink.classList.remove('disabled'); backLink.removeAttribute('title'); }
        hideAll();
    }

    function showStep2(email) {
        var input = document.getElementById('verifyEmail');
        var sendRow = document.getElementById('sendOtpRow');
        var step1Prompt = document.getElementById('step1SignupPrompt');
        var vSection = document.getElementById('verifyOtpSection');
        var formTitle = document.getElementById('formTitle');
        var formSubtitle = document.getElementById('formSubtitle');
        var backLink = document.getElementById('backToLogin');
        if (input) { input.value = email; input.setAttribute('readonly', 'readonly'); }
        if (sendRow) sendRow.style.display = 'none';
        if (step1Prompt) step1Prompt.style.display = 'none';
        if (vSection) vSection.style.display = 'block';
        if (formTitle) formTitle.textContent = 'Verify Your Email';
        if (formSubtitle) formSubtitle.textContent = "We've sent a 6-digit OTP to your email";
        if (backLink) { backLink.classList.add('disabled'); backLink.setAttribute('title', 'Complete verification first'); }
        hideAll();
    }

    function onLoad() {
        var email = getEmail();
        var input = document.getElementById('verifyEmail');
        if (input) input.value = email || '';

        if (email) {
            setEmailStorage(email);
            showStep2(email);
            fetch('/admin/check-pending-verification?email=' + encodeURIComponent(email))
                .then(function (r) { return r.json(); })
                .catch(function () { return {}; })
                .then(function (d) {
                    if (d && d.pending === false) {
                        window.location.href = 'admin-signup.html';
                    }
                });
            var otpInput = document.getElementById('verifyOtp');
            if (otpInput) otpInput.focus();
        } else {
            showStep1();
        }

        var sendBtn = document.getElementById('sendOtpToEmailBtn');
        if (sendBtn) sendBtn.addEventListener('click', window.handleSendOtpToEmail);
        var resendBtn = document.getElementById('resendOtpBtn');
        if (resendBtn) resendBtn.addEventListener('click', window.handleResendOtp);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onLoad);
    } else {
        onLoad();
    }
})();
