# 🔧 FIX: Supabase Still Sending Magic Links Instead of OTP

## ⚠️ Root Cause

**The problem is NOT in your code** - it's in the **Supabase Dashboard email template configuration**.

Supabase determines whether to send **OTP code** or **magic link** based on which template variable is used in the email template:

- `{{ .ConfirmationURL }}` → **Magic Link** (what you're getting now ❌)
- `{{ .Token }}` → **6-digit OTP Code** (what you want ✅)

Even if you set `emailRedirectTo: null` in code, if your email template uses `{{ .ConfirmationURL }}`, Supabase will still send magic links!

---

## ✅ SOLUTION: Fix Supabase Dashboard Email Template

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Select your project: `urioslfgnnbzflviacyt`
3. Navigate to: **Authentication** → **Email Templates**

### Step 2: Edit the "Magic Link" Template
1. Click on **"Magic Link"** template (or "OTP" if it exists)
2. Look for the email body/content

### Step 3: Replace Template Variable

**FIND THIS (Magic Link):**
```
Click here to sign in: {{ .ConfirmationURL }}
```

**REPLACE WITH THIS (OTP Code):**
```
Your verification code is: {{ .Token }}

Enter this 6-digit code to sign in.
```

### Step 4: Complete Template Example

Here's a complete OTP email template you can use:

**Subject:**
```
Your verification code
```

**Body:**
```
Your verification code is: {{ .Token }}

This code will expire in 60 minutes.

If you didn't request this code, please ignore this email.

---
{{ .SiteURL }}
```

**Important Variables:**
- `{{ .Token }}` → **6-digit OTP code** (e.g., "123456")
- `{{ .ConfirmationURL }}` → **Magic link URL** (don't use this!)
- `{{ .SiteURL }}` → Your site URL
- `{{ .Email }}` → User's email address

### Step 5: Save Template
1. Click **"Save"** or **"Update"**
2. Wait a few seconds for changes to propagate

---

## 🧪 Testing

### Test 1: Request OTP
1. Go to your login page
2. Enter email address
3. Click "Send OTP"
4. **Check your email**

**Expected Result:**
- ✅ Email contains: "Your verification code is: **123456**" (6 digits)
- ❌ NOT: "Click here to sign in: https://..." (magic link)

### Test 2: Verify OTP
1. Enter the 6-digit code from email
2. Click "Verify"
3. Should redirect to dashboard ✅

---

## 🔍 Troubleshooting

### Still Getting Magic Links?

**Check 1: Verify Template Variable**
- Open Supabase Dashboard → Authentication → Email Templates
- Check if template uses `{{ .ConfirmationURL }}`
- If yes, replace with `{{ .Token }}`

**Check 2: Check Which Template is Active**
- Supabase might have multiple templates
- Make sure the "Magic Link" template is the one being used
- Or check if there's a separate "OTP" template

**Check 3: Clear Browser Cache**
```javascript
// In browser console:
localStorage.clear();
location.reload();
```

**Check 4: Check Supabase Logs**
- Go to: **Logs** → **Auth** in Supabase Dashboard
- Look for email sending events
- Check which template was used

### OTP Code Not Arriving?

1. **Check Spam Folder** - OTP emails often go to spam
2. **Check Email Rate Limits** - Supabase limits emails per hour
3. **Verify Email Address** - Use a real email you can access
4. **Check Supabase Logs** - Look for email sending errors

### Code Verification Fails?

1. **Code Format** - Must be exactly 6 digits, no spaces
2. **Code Expiry** - OTP codes expire (default: 60 minutes)
3. **Email Match** - Must use same email that received OTP
4. **Check Console** - Look for verification errors in browser console

---

## 📋 Quick Checklist

- [ ] Supabase Dashboard → Authentication → Email Templates
- [ ] Edit "Magic Link" template
- [ ] Replace `{{ .ConfirmationURL }}` with `{{ .Token }}`
- [ ] Save template
- [ ] Test by requesting OTP
- [ ] Verify email contains 6-digit code (not magic link)
- [ ] Enter code and verify it works

---

## 💡 Why This Happens

Supabase's `signInWithOtp()` function can send either:
1. **Magic Link** - When template uses `{{ .ConfirmationURL }}`
2. **OTP Code** - When template uses `{{ .Token }}`

The `emailRedirectTo` option in code only controls:
- **What happens AFTER clicking the link** (if magic link is sent)
- **NOT what type of email gets sent**

The email template configuration is what actually determines OTP vs Magic Link!

---

## 🎯 Alternative: Use Separate OTP Template

If Supabase has a separate "OTP" template:

1. Go to: **Authentication** → **Email Templates**
2. Check if **"OTP"** template exists
3. If yes, make sure it uses `{{ .Token }}`
4. Supabase should automatically use OTP template when `emailRedirectTo: null`

---

## 📞 Still Not Working?

If you've done all the above and still getting magic links:

1. **Check Supabase Version** - Some older versions have different behavior
2. **Contact Supabase Support** - They can check your project settings
3. **Try Custom SMTP** - More control over email templates
4. **Check Project Settings** - Look for any auth-related overrides

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Email contains: "Your verification code is: **123456**"
- ✅ Code is 6 digits (numeric)
- ✅ No clickable link in email
- ✅ Code verification works correctly

Good luck! 🚀
