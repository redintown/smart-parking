# Debugging Admin Authentication

## Steps to Debug

1. **Open Browser Console** (F12 → Console tab)

2. **Check OTP Verification**:
   - Enter email and send OTP
   - Enter OTP code
   - Look for these console messages:
     - `✅ OTP verified successfully, session stored`
     - `Session data: { access_token: 'Present', ... }`
     - `✅ Session set in Supabase client`
     - `🔄 Redirecting to admin dashboard...`

3. **Check Session Storage**:
   - Open DevTools → Application → Local Storage
   - Look for key: `supabase_admin_session`
   - Should contain: `access_token`, `refresh_token`, `expires_at`, `user`

4. **Check Admin Page Load**:
   - After redirect to admin.html, check console for:
     - `🔍 Checking authentication on page load...`
     - `✅ supabaseAuth loaded, checking authentication...`
     - `📦 Stored session: Found`
     - `✅ Valid session found`
     - `✅ User authenticated: your-email@example.com`
     - `✅ Admin container shown`
     - `🚀 Initializing dashboard...`

5. **Common Issues**:

   **Issue: "No stored session found"**
   - Solution: Check if OTP verification actually stored the session
   - Check localStorage in Application tab
   - Verify `storeSession()` was called

   **Issue: "Session invalid"**
   - Solution: Check if session expired
   - Verify `expires_at` timestamp
   - Try logging in again

   **Issue: "supabaseAuth not loaded"**
   - Solution: Check if `supabase-auth.js` is loaded
   - Check Network tab for script loading errors
   - Verify script path is correct

   **Issue: Redirect loop**
   - Solution: Check if `checkAuthOnLoad()` and `checkAuth()` are both running
   - One should redirect, not both
   - Check console for multiple redirect attempts

## Manual Testing

1. **Clear everything and start fresh**:
   ```javascript
   // In browser console:
   localStorage.clear();
   location.reload();
   ```

2. **Check session manually**:
   ```javascript
   // In browser console:
   const session = JSON.parse(localStorage.getItem('supabase_admin_session'));
   console.log('Session:', session);
   console.log('Expires:', new Date(session?.expires_at * 1000));
   ```

3. **Test authentication check**:
   ```javascript
   // In browser console on admin.html:
   window.supabaseAuth.checkAuthStatus().then(result => {
       console.log('Auth status:', result);
   });
   ```

## Expected Flow

1. User enters email → OTP sent
2. User enters OTP → Verified
3. Session stored in localStorage
4. Redirect to admin.html
5. Page loads → Scripts load
6. checkAuthOnLoad() runs → Finds session
7. checkAuthStatus() validates → Returns true
8. checkAuth() runs → Shows dashboard
9. Dashboard initializes

## If Still Not Working

1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify Supabase credentials are correct
4. Check if Supabase Email provider is enabled
5. Verify OTP is actually being sent/received
6. Check localStorage for session data
7. Try clearing cache and cookies
