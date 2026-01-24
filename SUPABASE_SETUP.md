# Supabase Email OTP Setup Guide

## Issue: OTP Not Being Sent

If you're not receiving OTP emails, follow these steps to configure Supabase:

## Step 1: Enable Email Provider in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `urioslfgnnbzflviacyt`
3. Navigate to **Authentication** → **Providers**
4. Find **Email** provider and click on it
5. Make sure **"Enable Email provider"** is **ON** (toggle should be green)
6. Under **Email Auth Settings**:
   - ✅ Enable "Enable email confirmations" (optional but recommended)
   - ✅ Enable "Enable email signup" (if you want new users to sign up)
   - ✅ Enable "Secure email change" (optional)

## Step 2: Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Find the **"Magic Link"** template (this is used for OTP)
3. Make sure it's enabled
4. Customize the template if needed (optional)

## Step 3: Check Email Settings

1. Go to **Settings** → **Auth**
2. Under **Email Auth**:
   - Make sure "Enable email signup" is enabled
   - Check "Site URL" is set correctly (should be your domain or `http://localhost:8080` for local testing)
   - Check "Redirect URLs" includes your redirect URL

## Step 4: Test Email Configuration

1. In Supabase Dashboard, go to **Authentication** → **Users**
2. Try to manually send a test email (if available)
3. Check Supabase logs: **Logs** → **Auth Logs** for any errors

## Step 5: Common Issues and Solutions

### Issue: "Email rate limit exceeded"
- **Solution**: Wait a few minutes between requests
- Supabase has rate limits on free tier

### Issue: "Email provider not enabled"
- **Solution**: Enable Email provider in Authentication → Providers

### Issue: "Invalid email address"
- **Solution**: Make sure you're entering a valid email format

### Issue: "Site URL mismatch"
- **Solution**: Update Site URL in Settings → Auth to match your application URL

## Step 6: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for error messages when clicking "Send OTP"
4. Common errors:
   - `Supabase library not loaded` → Script loading issue
   - `CORS error` → Cross-origin issue
   - `Network error` → Connection problem

## Step 7: Verify Supabase Credentials

Make sure these are correct in `supabase-auth.js`:
- **SUPABASE_URL**: `https://urioslfgnnbzflviacyt.supabase.co`
- **SUPABASE_ANON_KEY**: Your anon/public key

## Step 8: Test with Supabase CLI (Optional)

If you have Supabase CLI installed:
```bash
supabase auth test-email your-email@example.com
```

## Still Not Working?

1. **Check Supabase Dashboard Logs**:
   - Go to **Logs** → **Auth Logs**
   - Look for failed authentication attempts
   - Check error messages

2. **Verify Network Requests**:
   - Open Browser DevTools → **Network** tab
   - Click "Send OTP"
   - Look for requests to `supabase.co`
   - Check if they're successful (200 status) or failing

3. **Check Email Spam Folder**:
   - OTP emails might go to spam
   - Check your spam/junk folder

4. **Try Different Email**:
   - Some email providers block automated emails
   - Try with Gmail, Outlook, etc.

5. **Contact Supabase Support**:
   - If all else fails, check Supabase status page
   - Or contact Supabase support

## Quick Debug Checklist

- [ ] Email provider enabled in Supabase Dashboard
- [ ] Site URL configured correctly
- [ ] Supabase script loads (check browser console)
- [ ] No CORS errors in browser console
- [ ] Network requests to Supabase succeed
- [ ] Email not in spam folder
- [ ] Rate limit not exceeded
- [ ] Valid email address format

## Testing Locally

For local development, make sure:
- Site URL in Supabase: `http://localhost:8080` (or your port)
- Redirect URL includes: `http://localhost:8080/admin.html`
