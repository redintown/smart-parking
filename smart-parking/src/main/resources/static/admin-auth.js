/**
 * Admin Authentication Module
 * - Supabase JS v2: createClient, getSession, onAuthStateChange (guarded; no errors if SDK not loaded)
 * - Backend: signup (OTP), verify-email, login (username+password), session persistence
 */

(function() {
    'use strict';

    const AUTH_TOKEN_KEY = 'authToken';
    const SUPABASE_URL = 'https://urioslfgnnbzflviacyt.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyaW9zbGZnbm5iemZsdmlhY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDg1ODMsImV4cCI6MjA4MzcyNDU4M30.Bwbq2ON54X940V3kFwJk3Iwyeem5msbNDlfHf6pQWP8';

    let supabaseClient = null;

    function initSupabase() {
        if (typeof window === 'undefined' || !window.supabase || typeof window.supabase.createClient !== 'function') {
            return false;
        }
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            return true;
        } catch (e) {
            return false;
        }
    }
    // Skip Supabase on backend-only auth pages to avoid pa.bundle.js / onUpdated and "library failed" side effects
    var path = typeof window !== 'undefined' && window.location && window.location.pathname ? window.location.pathname : '';
    if (path.indexOf('admin-login') === -1 && path.indexOf('admin-signup') === -1 && path.indexOf('admin-verify-otp') === -1) {
        initSupabase();
    }

    /** Supabase v2: getSession. Returns { data: { session }, error }. Never throws. */
    async function getSession() {
        if (!supabaseClient || !supabaseClient.auth) {
            return { data: { session: null }, error: null };
        }
        try {
            return await supabaseClient.auth.getSession();
        } catch (e) {
            return { data: { session: null }, error: e };
        }
    }

    /** Supabase v2: onAuthStateChange. Returns subscription with unsubscribe. No-op if no client. */
    function onAuthStateChange(callback) {
        if (!supabaseClient || !supabaseClient.auth || typeof supabaseClient.auth.onAuthStateChange !== 'function') {
            return { data: { subscription: { unsubscribe: function() {} } } };
        }
        try {
            return supabaseClient.auth.onAuthStateChange(callback);
        } catch (e) {
            return { data: { subscription: { unsubscribe: function() {} } } };
        }
    }

    async function signUpAdmin(username, email, password) {
        var res = await fetch('/admin/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: (username || '').trim(), email: (email || '').trim().toLowerCase(), password: password || '' })
        });
        var data = await res.json().catch(function() { return {}; });
        return { ok: res.ok, success: !!data.success, message: (data.message || (res.ok ? 'OK' : 'Signup failed')), devFallback: !!data.devFallback };
    }

    async function verifySignupOtp(email, otp) {
        var res = await fetch('/admin/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: (email || '').trim().toLowerCase(), otp: (otp || '').trim() })
        });
        var data = await res.json().catch(function() { return {}; });
        return { ok: res.ok, success: !!data.success, message: data.message || (res.ok ? 'Email verified' : 'Verification failed') };
    }

    async function loginAdmin(username, password) {
        var res = await fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'username=' + encodeURIComponent((username || '').trim()) + '&password=' + encodeURIComponent(password || '')
        });
        var data = await res.json().catch(function() { return {}; });
        if (res.ok && data.success && data.token) {
            try {
                localStorage.setItem(AUTH_TOKEN_KEY, data.token);
                sessionStorage.setItem('justLoggedIn', 'true');
                sessionStorage.removeItem('authRedirectInProgress');
                sessionStorage.removeItem('authCheckInProgress');
                if (data.admin) {
                    localStorage.setItem('adminData', JSON.stringify(data.admin));
                    try { localStorage.setItem('adminUsername', data.admin.username || ''); } catch (_) {}
                    try { localStorage.setItem('adminRole', data.admin.role || ''); } catch (_) {}
                    try { localStorage.setItem('adminFullName', data.admin.fullName || ''); } catch (_) {}
                } else if (data.username) {
                    try { localStorage.setItem('adminUsername', data.username); localStorage.setItem('adminRole', data.role || ''); } catch (_) {}
                }
            } catch (e) {}
            window.location.href = 'admin.html';
            return { success: true };
        }
        return { success: false, message: data.message || data.error || 'Login failed', email: data.email || undefined };
    }

    /** Persist: backend token + /admin/verify; optional Supabase getSession when client exists. */
    async function checkAdminSession() {
        if (supabaseClient && supabaseClient.auth) {
            try {
                var s = await getSession();
                if (s && s.data && s.data.session && s.data.session.access_token) {
                    var session = s.data.session;
                    if (session.expires_at) {
                        if (new Date(session.expires_at * 1000) > new Date()) return true;
                    } else {
                        return true;
                    }
                }
            } catch (e) {}
        }
        var token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) return false;
        if (token.startsWith('session_') || token.startsWith('supabase_') || token.startsWith('eyJ')) {
            try {
                var ctrl = new AbortController();
                var t = setTimeout(function() { ctrl.abort(); }, 3000);
                var r = await fetch('/admin/verify', { method: 'GET', headers: { 'Authorization': token }, signal: ctrl.signal, cache: 'no-cache' });
                clearTimeout(t);
                if (r.ok) {
                    var j = await r.json().catch(function() { return {}; });
                    return !!j.valid;
                }
            } catch (e) {}
        }
        return false;
    }

    async function logoutAdmin() {
        if (supabaseClient && supabaseClient.auth && typeof supabaseClient.auth.signOut === 'function') {
            try { await supabaseClient.auth.signOut(); } catch (e) {}
        }
        var token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) { try { await fetch('/admin/logout', { method: 'POST', headers: { 'Authorization': token } }); } catch (e) {} }
        clearSession();
    }

    function getAuthToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY) || null;
    }

    function clearSession() {
        try {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem('adminData');
            localStorage.removeItem('adminToken');
            sessionStorage.removeItem('justLoggedIn');
        } catch (e) {}
    }

    if (typeof window !== 'undefined') {
        window.adminAuth = {
            signUpAdmin,
            verifySignupOtp,
            loginAdmin,
            checkAdminSession,
            logoutAdmin,
            getAuthToken,
            clearSession,
            getSession,
            onAuthStateChange
        };
    }
})();
