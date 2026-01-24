/**
 * Authentication Guard Utility
 * Provides route protection and authentication state checking
 * Supports both Supabase auth and backend session tokens
 */

// ============================================
// AUTHENTICATION STATE CHECKING
// ============================================

/**
 * Checks if user is authenticated (Supabase OR backend session)
 * @returns {Promise<boolean>} - True if authenticated
 */
async function checkAuthentication() {
    var checkKey = 'authCheckInProgress';
    if (sessionStorage.getItem(checkKey)) {
        var backendToken = localStorage.getItem('authToken');
        if (backendToken) return true;
        if (window.adminAuth && typeof window.adminAuth.checkAdminSession === 'function') {
            try { return await window.adminAuth.checkAdminSession(); } catch (e) {}
        }
        return false;
    }
    sessionStorage.setItem(checkKey, 'true');
    try {
        if (window.adminAuth && typeof window.adminAuth.checkAdminSession === 'function') {
            var ok = await window.adminAuth.checkAdminSession();
            sessionStorage.removeItem(checkKey);
            return ok;
        }
        // Fallback: backend session token
        var backendToken = localStorage.getItem('authToken');
        if (backendToken) {
            if (backendToken.startsWith('session_') || backendToken.startsWith('supabase_')) {
                var timeoutId;
                try {
                    var controller = new AbortController();
                    timeoutId = setTimeout(function() { controller.abort(); }, 2000);
                    var response = await fetch('/admin/verify', {
                        method: 'GET',
                        headers: {
                            'Authorization': backendToken
                        },
                        signal: controller.signal,
                        cache: 'no-cache'
                    });
                    
                    clearTimeout(timeoutId);
                    if (response.ok) {
                        var data = await response.json();
                        if (data.valid) {
                            sessionStorage.removeItem(checkKey);
                            return true;
                        }
                        localStorage.removeItem('authToken');
                        sessionStorage.removeItem(checkKey);
                        return false;
                    }
                    if (response.status === 401) {
                        localStorage.removeItem('authToken');
                        sessionStorage.removeItem(checkKey);
                        return false;
                    }
                    sessionStorage.removeItem(checkKey);
                    return false;
                } catch (err) {
                    if (typeof timeoutId !== 'undefined') clearTimeout(timeoutId);
                    sessionStorage.removeItem(checkKey);
                    return false;
                }
            }
            localStorage.removeItem('authToken');
            sessionStorage.removeItem(checkKey);
            return false;
        }
        
        // 2) Optional: Supabase stored session (when supabaseAuth exists)
        if (window.supabaseAuth && typeof window.supabaseAuth.getStoredSession === 'function') {
            var s = window.supabaseAuth.getStoredSession();
            if (s && s.access_token) {
                if (!s.expires_at || new Date(s.expires_at * 1000) > new Date()) {
                    sessionStorage.removeItem(checkKey);
                    return true;
                }
            }
        }
        
        sessionStorage.removeItem(checkKey);
        return false;
    } finally {
        // Always clear the check flag after a delay to allow retry
        setTimeout(() => {
            sessionStorage.removeItem(checkKey);
        }, 1000);
    }
}

/**
 * Gets authentication token (Supabase or backend)
 * @returns {string|null} - Token or null
 */
function getAuthToken() {
    if (window.adminAuth && typeof window.adminAuth.getAuthToken === 'function') {
        return window.adminAuth.getAuthToken();
    }
    var t = localStorage.getItem('authToken');
    if (t) return t;
    if (window.supabaseAuth && typeof window.supabaseAuth.getStoredSession === 'function') {
        var s = window.supabaseAuth.getStoredSession();
        if (s && s.access_token) return s.access_token;
    }
    return null;
}

/**
 * Clears all authentication data
 */
function clearAuth() {
    if (window.adminAuth && typeof window.adminAuth.clearSession === 'function') {
        window.adminAuth.clearSession();
    }
    if (window.supabaseAuth && typeof window.supabaseAuth.clearSession === 'function') {
        window.supabaseAuth.clearSession();
    }
    localStorage.removeItem('authToken');
}

// ============================================
// ROUTE PROTECTION
// ============================================

/**
 * Protects admin routes - redirects to login if not authenticated
 * @param {string} redirectTo - Optional redirect URL (default: admin-login.html)
 * @returns {Promise<boolean>} - True if authenticated, false if redirected
 */
async function requireAuth(redirectTo = 'admin-login.html') {
    const isAuth = await checkAuthentication();
    
    if (!isAuth) {
        console.log('❌ Authentication required. Redirecting to login...');
        
        // Save intended destination if navigating directly to protected page
        const currentPath = window.location.pathname;
        if (currentPath !== '/' && currentPath !== '/index.html') {
            sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        
        // Clear auth check flag before redirecting
        sessionStorage.removeItem('authCheckInProgress');
        window.location.replace(redirectTo);
        return false;
    }
    
    return true;
}

/**
 * Redirects authenticated users away from login page
 * @param {string} redirectTo - Redirect URL for authenticated users (default: admin.html)
 */
async function redirectIfAuthenticated(redirectTo = 'admin.html') {
    const isAuth = await checkAuthentication();
    
    if (isAuth) {
        console.log('✅ Already authenticated. Redirecting to dashboard...');
        
        // Check for saved redirect destination
        const savedRedirect = sessionStorage.getItem('redirectAfterLogin');
        if (savedRedirect) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.replace(savedRedirect);
        } else {
            window.location.replace(redirectTo);
        }
        
        return true;
    }
    
    return false;
}

// ============================================
// ADMIN DASHBOARD BUTTON HANDLER
// ============================================

/**
 * Handles Admin Dashboard button click
 * Checks authentication before redirecting
 */
async function handleAdminDashboardClick(event) {
    if (event) {
        event.preventDefault();
    }
    
    const isAuth = await checkAuthentication();
    
    if (isAuth) {
        // User is authenticated, go to dashboard
        window.location.replace('admin.html');
    } else {
        // User not authenticated, go to login
        window.location.replace('admin-login.html');
    }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

if (typeof window !== 'undefined') {
    window.authGuard = {
        checkAuthentication,
        requireAuth,
        redirectIfAuthenticated,
        handleAdminDashboardClick,
        getAuthToken,
        clearAuth
    };
}
