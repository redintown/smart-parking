/**
 * Supabase Authentication Module
 * Handles Email OTP authentication using Supabase
 * 
 * ============================================
 * ⚠️ CRITICAL: EMAIL TEMPLATE CONFIGURATION
 * ============================================
 * 
 * If you're getting MAGIC LINKS instead of OTP codes, the issue is in Supabase Dashboard!
 * 
 * Supabase sends OTP vs Magic Link based on EMAIL TEMPLATE VARIABLES:
 * - {{ .ConfirmationURL }} → Magic Link ❌
 * - {{ .Token }} → 6-digit OTP Code ✅
 * 
 * The code setting emailRedirectTo: null is correct, but the template must use {{ .Token }}!
 * 
 * ============================================
 * REQUIRED SUPABASE DASHBOARD SETUP
 * ============================================
 * 
 * Step 1: Go to Authentication > Providers > Email
 *    ✅ Enable "Enable email provider"
 *    ✅ Enable "Enable email signup" (if allowing new users)
 * 
 * Step 2: Go to Authentication > Email Templates > "Magic Link"
 *    ⚠️ THIS IS THE KEY FIX:
 *    - Find: {{ .ConfirmationURL }} (magic link)
 *    - Replace with: {{ .Token }} (OTP code)
 *    
 *    Example template body:
 *    "Your verification code is: {{ .Token }}"
 *    
 *    NOT: "Click here: {{ .ConfirmationURL }}" ← This sends magic links!
 * 
 * Step 3: Save the template
 *    - Changes take effect immediately
 *    - Test by requesting OTP
 * 
 * ============================================
 * HOW THIS CODE WORKS
 * ============================================
 * 
 * 1. signInWithOtp() - Requests OTP code
 *    - emailRedirectTo: null → Helps, but template is what matters
 *    - Supabase checks email template for {{ .Token }} vs {{ .ConfirmationURL }}
 *    - If template has {{ .Token }} → Sends 6-digit code ✅
 *    - If template has {{ .ConfirmationURL }} → Sends magic link ❌
 * 
 * 2. verifyOtp() - Verifies the OTP code
 *    - email: User's email
 *    - token: The 6-digit OTP code from email
 *    - type: 'email' → Verifies email OTP
 *    - Result: Returns session if valid
 * 
 * ============================================
 * TROUBLESHOOTING
 * ============================================
 * 
 * Still getting magic links?
 * 1. Check Supabase Dashboard → Email Templates → Magic Link template
 * 2. Verify it uses {{ .Token }}, NOT {{ .ConfirmationURL }}
 * 3. Save template and test again
 * 
 * See FIX_OTP_MAGIC_LINK.md for detailed troubleshooting guide.
 */

// ============================================
// SUPABASE CLIENT INITIALIZATION
// ============================================

const SUPABASE_URL = 'https://urioslfgnnbzflviacyt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVyaW9zbGZnbm5iemZsdmlhY3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNDg1ODMsImV4cCI6MjA4MzcyNDU4M30.Bwbq2ON54X940V3kFwJk3Iwyeem5msbNDlfHf6pQWP8';

// Initialize Supabase client (plain JS, no imports; use window.supabase from CDN)
let supabaseClient = null;

function initSupabase() {
    try {
        if (!window.supabase) {
            console.error('❌ Supabase SDK not loaded. Ensure <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> is placed BEFORE this script.');
            return false;
        }
        if (typeof window.supabase.createClient !== 'function') {
            console.error('❌ window.supabase.createClient is not a function. Check Supabase CDN script.');
            return false;
        }
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase SDK loaded');
        console.log('✅ Supabase client initialized');
        return true;
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        return false;
    }
}

// Initialize on load with retry mechanism
if (typeof window !== 'undefined') {
    const tryInit = () => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                if (!initSupabase()) {
                    // Retry after a delay if Supabase script loads later
                    setTimeout(tryInit, 1000);
                }
            });
        } else {
            if (!initSupabase()) {
                // Retry after a delay if Supabase script loads later
                setTimeout(tryInit, 1000);
            }
        }
    };
    
    tryInit();
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const SESSION_KEY = 'supabase_admin_session';
const EMAIL_KEY = 'supabase_admin_email';

/**
 * Stores session data securely
 * @param {Object} session - Supabase session object
 */
function storeSession(session) {
    try {
        if (session && session.access_token) {
            localStorage.setItem(SESSION_KEY, JSON.stringify({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: session.user
            }));
            console.log('Session stored successfully');
        }
    } catch (error) {
        console.error('Error storing session:', error);
    }
}

/**
 * Retrieves stored session
 * @returns {Object|null} - Session object or null
 */
function getStoredSession() {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (sessionData) {
            return JSON.parse(sessionData);
        }
    } catch (error) {
        console.error('Error retrieving session:', error);
    }
    return null;
}

/**
 * Clears stored session
 */
function clearSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(EMAIL_KEY);
        console.log('Session cleared');
    } catch (error) {
        console.error('Error clearing session:', error);
    }
}

/**
 * Checks if user is authenticated
 * @returns {boolean} - True if authenticated
 */
function isAuthenticated() {
    const session = getStoredSession();
    if (!session) return false;
    
    // Check if session is expired
    if (session.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        if (expiresAt < new Date()) {
            clearSession();
            return false;
        }
    }
    
    return true;
}

/**
 * Gets current user email from session
 * @returns {string|null} - User email or null
 */
function getCurrentUserEmail() {
    const session = getStoredSession();
    return session?.user?.email || localStorage.getItem(EMAIL_KEY) || null;
}

// ============================================
// EMAIL OTP FUNCTIONS
// ============================================

/**
 * Sends OTP to email address
 * @param {string} email - Email address
 * @returns {Promise<Object>} - Result object with success status
 */
async function sendOtpToEmail(email) {
    try {
        console.log('📧 Attempting to send OTP to:', email);
        
        if (!window.supabase) {
            console.error('❌ Supabase SDK not on window. Load the Supabase script before this file.');
            return {
                success: false,
                message: 'Auth could not load. Please refresh the page.'
            };
        }
        
        // Initialize client if not already done
        if (!supabaseClient) {
            console.log('🔄 Initializing Supabase client...');
            if (!initSupabase()) {
                const errorMsg = 'Failed to initialize Supabase client. Please check your configuration.';
                console.error('❌', errorMsg);
                return {
                    success: false,
                    message: errorMsg
                };
            }
        }
        
        if (!supabaseClient) {
            throw new Error('Supabase client is null after initialization');
        }
        
        console.log('📤 Calling Supabase signInWithOtp...');
        console.log('Email:', email);
        console.log('Mode: Email OTP (6-digit code)');
        
        // CRITICAL: Supabase sends OTP vs Magic Link based on EMAIL TEMPLATE, not just code!
        // 
        // To get OTP codes (not magic links), you MUST:
        // 1. ✅ Set emailRedirectTo to null (done below)
        // 2. ✅ Configure Supabase Dashboard Email Template:
        //    - Go to: Authentication > Email Templates > "Magic Link" template
        //    - Replace {{ .ConfirmationURL }} with {{ .Token }}
        //    - {{ .Token }} = 6-digit OTP code
        //    - {{ .ConfirmationURL }} = Magic link (what you're getting now!)
        // 
        // The emailRedirectTo option only affects redirect behavior, NOT what gets sent!
        // The template variable determines OTP vs Magic Link.
        const { data, error } = await supabaseClient.auth.signInWithOtp({
            email: email,
            options: {
                // Setting to null helps, but template configuration is the real fix
                emailRedirectTo: null,
                shouldCreateUser: true
            }
        });
        
        if (error) {
            console.error('❌ Supabase OTP send error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            console.error('Full error:', JSON.stringify(error, null, 2));
            
            // Provide user-friendly error messages
            let userMessage = error.message || 'Failed to send OTP.';
            
            if (error.message?.includes('Email rate limit')) {
                userMessage = 'Too many requests. Please wait a few minutes before trying again.';
            } else if (error.message?.includes('Invalid email')) {
                userMessage = 'Please enter a valid email address.';
            } else if (error.message?.includes('Email provider')) {
                userMessage = 'Email authentication is not enabled. Please contact administrator.';
            }
            
            return {
                success: false,
                message: userMessage,
                error: error
            };
        }
        
        // Store email for OTP verification
        localStorage.setItem(EMAIL_KEY, email);
        
        console.log('✅ OTP sent successfully!');
        console.log('Response data:', data);
        
        return {
            success: true,
            message: 'OTP sent to your email. Please check your inbox (and spam folder).',
            data: data
        };
    } catch (error) {
        console.error('❌ Exception in sendOtpToEmail:', error);
        console.error('Error stack:', error.stack);
        
        return {
            success: false,
            message: error.message || 'An unexpected error occurred. Please try again or check the browser console for details.'
        };
    }
}

/**
 * Verifies OTP code
 * @param {string} email - Email address
 * @param {string} otp - 6-digit OTP code (numeric string)
 * @returns {Promise<Object>} - Result object with success status and session
 */
async function verifyOtp(email, otp) {
    try {
        if (!supabaseClient) {
            if (!initSupabase()) {
                throw new Error('Supabase client not initialized');
            }
        }
        
        // Validate OTP format (should be 6 digits)
        if (!otp || !/^\d{6}$/.test(otp)) {
            throw new Error('Invalid OTP format. Must be 6 digits.');
        }
        
        console.log('🔐 Verifying OTP for:', email);
        console.log('OTP format check: passed (6 digits)');
        
        // Verify OTP using Supabase
        // type: 'email' explicitly tells Supabase this is an email OTP (not SMS)
        const { data, error } = await supabaseClient.auth.verifyOtp({
            email: email.trim().toLowerCase(),
            token: otp, // The 6-digit numeric code
            type: 'email' // Explicitly specify email OTP (not SMS or magic link)
        });
        
        if (error) {
            console.error('OTP verification error:', error);
            throw error;
        }
        
        if (data.session) {
            // Store session
            storeSession(data.session);
            console.log('✅ OTP verified successfully, session stored');
            console.log('Session data:', {
                access_token: data.session.access_token ? 'Present' : 'Missing',
                expires_at: data.session.expires_at,
                user: data.user?.email
            });
            
            // Also set the session in Supabase client for immediate use
            if (supabaseClient) {
                await supabaseClient.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token
                });
                console.log('✅ Session set in Supabase client');
            }
            
            return {
                success: true,
                session: data.session,
                user: data.user,
                message: 'OTP verified successfully'
            };
        } else {
            console.error('❌ No session in OTP verification response');
            console.error('Response data:', data);
            throw new Error('No session returned from OTP verification');
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return {
            success: false,
            message: error.message || 'Invalid OTP. Please try again.'
        };
    }
}

/**
 * Resends OTP to email
 * @param {string} email - Email address
 * @returns {Promise<Object>} - Result object
 */
async function resendOtpToEmail(email) {
    return await sendOtpToEmail(email);
}

/**
 * Signs out the current user
 */
async function signOut() {
    try {
        if (supabaseClient) {
            await supabaseClient.auth.signOut();
        }
        clearSession();
        console.log('User signed out');
    } catch (error) {
        console.error('Error signing out:', error);
        // Clear session anyway
        clearSession();
    }
}

// ============================================
// ROUTE PROTECTION
// ============================================

/**
 * Protects admin pages - redirects to login if not authenticated
 */
function protectAdminRoute() {
    if (!isAuthenticated()) {
        console.log('User not authenticated, redirecting to login');
        window.location.href = '/admin-login.html';
        return false;
    }
    return true;
}

/**
 * Checks authentication status and updates UI
 */
async function checkAuthStatus() {
    try {
        console.log('🔐 Checking auth status...');
        
        // First check stored session
        const storedSession = getStoredSession();
        if (!storedSession) {
            console.log('❌ No stored session found');
            return false;
        }
        
        console.log('📦 Stored session found, validating...');
        
        // Initialize Supabase client if needed
        if (!supabaseClient) {
            if (!initSupabase()) {
                console.error('❌ Failed to initialize Supabase client');
                return false;
            }
        }
        
        if (!supabaseClient) {
            console.error('❌ Supabase client is null');
            return false;
        }
        
        // Guard: never call getSession if auth or getSession is missing (avoids "Cannot read properties of undefined (reading 'getSession')")
        if (!supabaseClient.auth || typeof supabaseClient.auth.getSession !== 'function') {
            console.warn('⚠️ Supabase auth.getSession not available; using stored session only');
            if (storedSession.expires_at) {
                const expiresAt = new Date(storedSession.expires_at * 1000);
                if (expiresAt > new Date()) {
                    console.log('✅ Stored session still valid (not expired)');
                    return true;
                }
            }
            clearSession();
            return false;
        }
        
        // Get current session from Supabase
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('❌ Error getting session:', error);
            clearSession();
            return false;
        }
        
        if (session && session.access_token) {
            console.log('✅ Valid session found');
            storeSession(session);
            return true;
        }
        
        // No active session from Supabase; fallback to stored
        if (storedSession.expires_at) {
            const expiresAt = new Date(storedSession.expires_at * 1000);
            if (expiresAt > new Date()) {
                console.log('✅ Stored session still valid (not expired)');
                return true;
            }
        }
        console.log('❌ No valid session');
        clearSession();
        return false;
    } catch (error) {
        console.error('❌ Exception in checkAuthStatus:', error);
        clearSession();
        return false;
    }
}

// Make functions available globally
if (typeof window !== 'undefined') {
    window.supabaseAuth = {
        sendOtpToEmail,
        verifyOtp,
        resendOtpToEmail,
        signOut,
        isAuthenticated,
        getCurrentUserEmail,
        protectAdminRoute,
        checkAuthStatus,
        clearSession,
        getStoredSession
    };
}
