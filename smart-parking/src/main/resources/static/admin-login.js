/**
 * Modern Admin Login Page - JavaScript
 * Handles form interactions, password toggle, theme toggle, and login
 */

// ============================================
// PASSWORD TOGGLE
// ============================================

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const passwordIcon = document.getElementById('passwordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
    }
}

function toggleSignupPassword() {
    const passwordInput = document.getElementById('signupPassword');
    const passwordIcon = document.getElementById('signupPasswordIcon');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
    }
}

// ============================================
// AUTH TAB SWITCHING
// ============================================

function switchAuthTab(tab) {
    const loginTab = document.querySelector('[data-tab="login"]');
    const signupTab = document.querySelector('[data-tab="signup"]');
    const loginWrapper = document.getElementById('loginFormWrapper');
    const signupWrapper = document.getElementById('signupFormWrapper');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        loginWrapper.style.display = 'block';
        signupWrapper.style.display = 'none';
    } else {
        signupTab.classList.add('active');
        loginTab.classList.remove('active');
        signupWrapper.style.display = 'block';
        loginWrapper.style.display = 'none';
    }
}

// ============================================
// THEME (Light Mode Only)
// ============================================

// ============================================
// LOGIN HANDLER
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const loginButton = document.getElementById('loginButton');
    const buttonText = loginButton.querySelector('.button-text');
    const buttonLoader = document.getElementById('buttonLoader');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const errorText = document.getElementById('errorText');
    
    // Hide previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Validation
    if (!username || !password) {
        showError('Please fill in all fields');
        return;
    }
    
    // Show loading state
    loginButton.disabled = true;
    buttonText.style.display = 'none';
    buttonLoader.style.display = 'block';
    
    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store auth token
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminData', JSON.stringify(data.admin));
            
            // Show success message
            successMessage.style.display = 'flex';
            
            // Redirect to admin dashboard
            setTimeout(() => {
                // Check if admin.html exists, otherwise redirect to admin.html
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            // Show error message
            showError(data.message || 'Invalid credentials. Please try again.');
            loginButton.disabled = false;
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please check your connection and try again.');
        loginButton.disabled = false;
        buttonText.style.display = 'block';
        buttonLoader.style.display = 'none';
    }
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showSignupError(message) {
    const errorMessage = document.getElementById('signupErrorMessage');
    const errorText = document.getElementById('signupErrorText');
    
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// ============================================
// SIGNUP HANDLER
// ============================================

async function handleSignup(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('signupUsername').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;
    const signupButton = document.getElementById('signupButton');
    const buttonText = signupButton.querySelector('.button-text');
    const buttonLoader = document.getElementById('signupButtonLoader');
    const errorMessage = document.getElementById('signupErrorMessage');
    const successMessage = document.getElementById('signupSuccessMessage');
    
    // Hide previous messages
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    
    // Validation
    if (!fullName || !email || !username || !password || !confirmPassword || !role) {
        showSignupError('Please fill in all fields');
        return;
    }
    
    if (password !== confirmPassword) {
        showSignupError('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        showSignupError('Password must be at least 6 characters long');
        return;
    }
    
    // Show loading state
    signupButton.disabled = true;
    buttonText.style.display = 'none';
    buttonLoader.style.display = 'block';
    
    try {
        const requestBody = {
            username: username,
            password: password,
            fullName: fullName,
            email: email,
            role: role
        };
        
        console.log('Sending signup request:', { ...requestBody, password: '***' }); // Log without password
        console.log('Request URL: /admin/signup');
        
        const response = await fetch('/admin/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        console.log('Response URL:', response.url);
        
        // Check if response is ok
        if (!response.ok) {
            let errorMessage = `Registration failed (HTTP ${response.status})`;
            
            if (response.status === 404) {
                errorMessage = 'Endpoint not found. Please make sure the server is running and restarted after code changes.';
            } else {
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch (e) {
                    const errorText = await response.text().catch(() => '');
                    errorMessage = errorText || errorMessage;
                }
            }
            
            console.error('Signup failed:', response.status, errorMessage);
            showSignupError(errorMessage);
            signupButton.disabled = false;
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
            return;
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Store auth token
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminData', JSON.stringify(data.admin));
            
            // Show success message
            successMessage.style.display = 'flex';
            
            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            // Show error message
            showSignupError(data.message || 'Registration failed. Please try again.');
            signupButton.disabled = false;
            buttonText.style.display = 'block';
            buttonLoader.style.display = 'none';
        }
    } catch (error) {
        console.error('Signup error:', error);
        showSignupError('Network error. Please check your connection and try again. Error: ' + error.message);
        signupButton.disabled = false;
        buttonText.style.display = 'block';
        buttonLoader.style.display = 'none';
    }
}

// ============================================
// INPUT ANIMATIONS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Add focus animations to inputs
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        const icon = input.parentElement?.querySelector('.input-icon');
        if (icon) {
            input.addEventListener('focus', function() {
                icon.style.color = 'var(--orange-primary)';
            });
            
            input.addEventListener('blur', function() {
                if (!this.value) {
                    icon.style.color = '';
                }
            });
        }
        
        // Handle select inputs
        if (input.tagName === 'SELECT') {
            input.addEventListener('change', function() {
                if (this.value) {
                    const label = this.parentElement.querySelector('.input-label');
                    if (label) {
                        label.style.top = '-0.5rem';
                        label.style.left = '0.75rem';
                        label.style.fontSize = '0.75rem';
                        label.style.color = 'var(--orange-primary)';
                        label.style.background = 'var(--bg-light-card)';
                        label.style.padding = '0 0.5rem';
                    }
                }
            });
        }
    });
    
    // Add ripple effect to login button
    const loginButton = document.getElementById('loginButton');
    loginButton.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');
        
        this.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    });
    
    // Check if already logged in
    const authToken = localStorage.getItem('adminToken');
    if (authToken) {
        // Verify token
        fetch('/admin/verify', {
            headers: { 'Authorization': authToken }
        })
        .then(res => res.json())
        .then(data => {
            if (data.valid) {
                window.location.href = 'admin.html';
            }
        })
        .catch(() => {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
        });
    }
});

// Add ripple CSS
const style = document.createElement('style');
style.textContent = `
    .login-button {
        position: relative;
        overflow: hidden;
    }
    
    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }
    
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
