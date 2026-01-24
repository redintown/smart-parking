/**
 * Admin Login - Username + password only. OTP is only for signup (admin-signup → admin-verify-otp).
 */

async function handlePasswordLogin(event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    try {
        var usernameInput = document.getElementById('username');
        var passwordInput = document.getElementById('password');
        if (!usernameInput || !passwordInput) {
            alert('Login form elements not found. Please refresh the page.');
            return false;
        }
        var username = usernameInput.value.trim();
        var password = passwordInput.value;
        var loginButton = document.getElementById('passwordLoginButton');
        var buttonText = loginButton && loginButton.querySelector('.button-text');
        var buttonLoader = document.getElementById('passwordButtonLoader');
        var errorMessage = document.getElementById('passwordErrorMessage');
        var errorText = document.getElementById('passwordErrorText');
        if (errorMessage) errorMessage.style.display = 'none';
        var verifyBlock = document.getElementById('verifyEmailBlock');
        if (verifyBlock) verifyBlock.style.display = 'none';
        if (!username || !password) {
            if (errorText) errorText.textContent = 'Please fill in all fields';
            if (errorMessage) errorMessage.style.display = 'flex';
            return false;
        }
        if (loginButton) loginButton.disabled = true;
        if (buttonText) buttonText.style.display = 'none';
        if (buttonLoader) buttonLoader.style.display = 'block';
        try {
            if (window.adminAuth && typeof window.adminAuth.loginAdmin === 'function') {
                var r = await window.adminAuth.loginAdmin(username, password);
                if (r.success) return false;
                if (errorText) errorText.textContent = r.message || 'Login failed. Please try again.';
                if (errorMessage) errorMessage.style.display = 'flex';
                var vb = document.getElementById('verifyEmailBlock');
                var vlink = document.getElementById('verifyEmailLink');
                if (r.email && vb && vlink) {
                    vb.style.display = 'block';
                    vlink.href = 'verify-email.html?email=' + encodeURIComponent(r.email);
                }
            } else {
                var response = await fetch('/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password)
                });
                var data = await response.json().catch(function() { return {}; });
                if (response.ok && data.success && data.token) {
                    localStorage.setItem('authToken', data.token);
                    sessionStorage.setItem('justLoggedIn', 'true');
                    if (data.admin) {
                        localStorage.setItem('adminUsername', data.admin.username || '');
                        localStorage.setItem('adminRole', data.admin.role || '');
                        localStorage.setItem('adminData', JSON.stringify(data.admin));
                    } else if (data.username) {
                        localStorage.setItem('adminUsername', data.username);
                        localStorage.setItem('adminRole', data.role || '');
                    }
                    window.location.href = 'admin.html';
                    return false;
                }
                if (errorText) errorText.textContent = data.message || data.error || 'Login failed. Please try again.';
                if (errorMessage) errorMessage.style.display = 'flex';
                var vb = document.getElementById('verifyEmailBlock');
                var vlink = document.getElementById('verifyEmailLink');
                if (response.status === 403 && data.email && vb && vlink) {
                    vb.style.display = 'block';
                    vlink.href = 'verify-email.html?email=' + encodeURIComponent(data.email);
                }
            }
        } catch (apiError) {
            if (errorText) errorText.textContent = apiError.message || 'Network error. Please try again.';
            if (errorMessage) errorMessage.style.display = 'flex';
        }
        if (loginButton) loginButton.disabled = false;
        if (buttonText) buttonText.style.display = 'block';
        if (buttonLoader) buttonLoader.style.display = 'none';
    } catch (outerError) {
        var et = document.getElementById('passwordErrorText');
        var em = document.getElementById('passwordErrorMessage');
        var lb = document.getElementById('passwordLoginButton');
        if (et) et.textContent = 'An error occurred. Please try again.';
        if (em) em.style.display = 'flex';
        if (lb) { lb.disabled = false; var bt = lb.querySelector('.button-text'); var bl = document.getElementById('passwordButtonLoader'); if (bt) bt.style.display = 'block'; if (bl) bl.style.display = 'none'; }
    }
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    var passwordLoginButton = document.getElementById('passwordLoginButton');
    if (passwordLoginButton) {
        passwordLoginButton.addEventListener('click', function(e) {
            var ripple = document.createElement('span');
            var rect = this.getBoundingClientRect();
            var size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
            ripple.classList.add('ripple');
            this.appendChild(ripple);
            setTimeout(function() { ripple.remove(); }, 600);
        });
    }
});

if (typeof window !== 'undefined') {
    window.handlePasswordLogin = handlePasswordLogin;
}

var _style = document.createElement('style');
_style.textContent = '.login-button{position:relative;overflow:hidden}.ripple{position:absolute;border-radius:50%;background:rgba(255,255,255,0.3);transform:scale(0);animation:ripple-anim 0.6s ease-out;pointer-events:none}@keyframes ripple-anim{to{transform:scale(4);opacity:0}}';
document.head.appendChild(_style);
