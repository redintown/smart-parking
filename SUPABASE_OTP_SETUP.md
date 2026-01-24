# Supabase Email OTP Configuration Guide

## Problem: Magic Link Instead of OTP

If Supabase is sending magic links instead of 6-digit OTP codes, this guide will help you fix it.

## Root Cause

Supabase sends **magic links** when:
1. `emailRedirectTo` option is provided in `signInWithOtp()`
2. The email template is configured for magic links

Supabase sends **OTP codes** when:
1. `emailRedirectTo` is `null` or not provided
2. The correct OTP template is configured

## Solution: Code Changes ✅

The code has been updated in `supabase-auth.js`:

```javascript
// ✅ CORRECT - Forces OTP mode
const { data, error } = await supabaseClient.auth.signInWithOtp({
    email: email,
    options: {
        emailRedirectTo: null,  // ← KEY: null = OTP, URL = magic link
        shouldCreateUser: true
    }
});
```

## Solution: Supabase Dashboard Configuration

### Step 1: Enable Email Provider
1. Go to **Authentication > Providers**
2. Click **Email**
3. Enable:
   - ✅ **Enable email provider**
   - ✅ **Enable email signup** (if allowing new users)
   - ⚠️ **Confirm email** (optional - can be disabled for faster flow)

### Step 2: Configure OTP Email Template
1. Go to **Authentication > Email Templates**
2. Click on **"OTP"** template (not "Magic Link")
3. Ensure it's enabled and configured correctly

**Default OTP Template:**
```
Subject: Your verification code

Your verification code is: {{ .Token }}

This code will expire in 60 minutes.

If you didn't request this code, please ignore this email.
```

**Template Variables:**
- `{{ .Token }}` - The 6-digit numeric OTP code
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

### Step 3: Verify Magic Link Template (Optional)
If you want to disable magic links entirely:

1. Go to **Authentication > Email Templates**
2. Click **"Magic Link"**
3. Either:
   - Disable it completely, OR
   - Keep it enabled but don't use it in your code

## Testing

### Test 1: Request OTP
1. Enter email address
2. Click "Send OTP"
3. **Expected:** Email with 6-digit numeric code
4. **NOT Expected:** Email with clickable magic link

### Test 2: Verify OTP
1. Enter the 6-digit code
2. Click "Verify"
3. **Expected:** Success, redirected to dashboard
4. **NOT Expected:** "Invalid OTP" or redirect to magic link

## Troubleshooting

### Still Getting Magic Links?

**Check 1:** Verify code changes
```javascript
// In supabase-auth.js, line ~199-208
// Make sure emailRedirectTo is null or missing
emailRedirectTo: null  // ← Must be null
```

**Check 2:** Clear browser cache and localStorage
```javascript
// In browser console:
localStorage.clear();
// Then refresh page
```

**Check 3:** Supabase Dashboard Settings
- Go to **Authentication > Providers > Email**
- Verify Email provider is enabled
- Check **Authentication > Email Templates > OTP** is active

**Check 4:** Supabase Project Settings
- Go to **Settings > API**
- Verify you're using the correct project
- Check **Settings > Auth** for any conflicting settings

### OTP Not Arriving?

1. **Check Spam Folder** - OTP emails often go to spam
2. **Check Email Rate Limits** - Supabase has rate limits
3. **Verify Email Address** - Use a valid email you can access
4. **Check Supabase Logs** - Go to **Logs > Auth** in dashboard

### OTP Verification Fails?

1. **Code Format** - Must be exactly 6 digits, no spaces
2. **Code Expiry** - OTP codes expire (default: 60 minutes)
3. **Email Match** - Must use same email that received OTP
4. **Network Issues** - Check browser console for errors

## Code Implementation Details

### Request OTP Flow
```javascript
// 1. User enters email
sendOtpToEmail(email)
  ↓
// 2. Supabase sends OTP (6-digit code)
supabaseClient.auth.signInWithOtp({ email, options: { emailRedirectTo: null } })
  ↓
// 3. User receives email with code: "123456"
// 4. User enters code in UI
```

### Verify OTP Flow
```javascript
// 1. User enters 6-digit code
verifyOtp(email, "123456")
  ↓
// 2. Supabase verifies code
supabaseClient.auth.verifyOtp({ email, token: "123456", type: "email" })
  ↓
// 3. Returns session if valid
// 4. User is logged in
```

## Why This Works

**Magic Link Mode:**
- `emailRedirectTo: "https://your-site.com/callback"`
- Supabase sends clickable link: `https://your-site.com/callback?token=...`
- User clicks link → Auto-login

**OTP Mode:**
- `emailRedirectTo: null` (or not provided)
- Supabase sends numeric code: `123456`
- User enters code → Manual verification

## Additional Notes

- **OTP Expiry:** Default is 60 minutes (configurable in Supabase)
- **Rate Limiting:** Supabase limits OTP requests per email/IP
- **Security:** OTP codes are single-use and expire
- **Custom SMTP:** Can use custom SMTP for better deliverability

## Support

If issues persist:
1. Check Supabase documentation: https://supabase.com/docs/guides/auth/auth-otp
2. Review Supabase dashboard logs: **Logs > Auth**
3. Test with Supabase REST API directly
4. Contact Supabase support
