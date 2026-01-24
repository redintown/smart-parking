# OTP Email Setup – Why OTP Was Not Delivered and How to Fix It

## 1. Which Flow Sends the OTP?

| Flow | Who sends OTP | Config |
|------|---------------|--------|
| **Admin signup** (admin-signup.html → /admin/signup → admin-verify-otp) | **Backend** `EmailService` (SMTP or console) | `application.properties` (SMTP) |
| **Supabase OTP** (supabase-auth.js: `signInWithOtp` / `verifyOtp`) | **Supabase** (Auth) | Supabase Dashboard + `emailRedirectTo` in code |

Admin signup **does not use Supabase** to send the OTP. It uses the Java backend.  
Supabase email auth is only relevant if you use the **supabase-auth.js** flow.

---

## 2. Why OTP Was Not Delivered (Admin Signup)

### Root cause: SMTP not configured

- In `application.properties`, the **mail/SMTP settings are commented out** (e.g. `spring.mail.host`, `spring.mail.username`, `spring.mail.password`).
- Without `spring.mail.host`, Spring Boot does **not** create a `JavaMailSender` bean.
- `EmailService` checks: if `mailSender == null` or `spring.mail.username` is empty → it does **not** send email. It only **logs the OTP to the server console**.
- Result: **no email is sent**; the OTP appears only in the logs where the app runs.

### How it was fixed

1. **SMTP configuration (application.properties)**
   - Documented and left commented:
     - `spring.mail.host`, `spring.mail.port`, `spring.mail.username`, `spring.mail.password`
     - `spring.mail.properties.mail.smtp.auth`, `spring.mail.properties.mail.smtp.starttls.enable`
   - Example for Gmail (App Password) and generic SMTP.
   - **To actually send OTP by email:** uncomment and set these, then restart the app.

2. **EmailService**
   - Returns `boolean`: `true` = sent via SMTP, `false` = only logged to console.
   - Logging:
     - `SMTP not configured` → OTP logged to console.
     - `OTP email sent to {email}` when sent.
     - `Failed to send OTP email to {email}: {cause}; falling back to console` on SMTP failure.

3. **Signup API**
   - `POST /admin/signup` response includes `devFallback: true` when OTP was **not** sent by email (console fallback).
   - Frontend (admin-signup, admin-verify-otp) uses `devFallback` / `?dev=1` to show:  
     *“Development: SMTP is not configured. The OTP was printed in the server console.”*

4. **Where to find the OTP when SMTP is not configured**
   - In the **terminal / log output** of the process running the Spring Boot app, e.g.:
     ```
     [DEV] OTP Email (SMTP not configured or failed)
     To: user@example.com
     OTP: 123456
     Expires in 5 minutes.
     ```

---

## 3. SMTP / Email Provider Configuration (Backend)

### Option A: Gmail

1. Turn on 2-Step Verification for the Google account.
2. Create an **App Password**: Google Account → Security → 2-Step Verification → App passwords.
3. In `application.properties` (uncomment and set):

   ```properties
   spring.mail.host=smtp.gmail.com
   spring.mail.port=587
   spring.mail.username=your@gmail.com
   spring.mail.password=your_16_char_app_password
   spring.mail.properties.mail.smtp.auth=true
   spring.mail.properties.mail.smtp.starttls.enable=true
   ```

### Option B: Other SMTP (SendGrid, Mailgun, etc.)

Set the host, port, username, and password your provider gives you. For TLS on port 587:

```properties
spring.mail.host=smtp.provider.com
spring.mail.port=587
spring.mail.username=apikey_or_login
spring.mail.password=your_password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
```

---

## 4. Supabase Email Auth (Only for supabase-auth.js OTP Flow)

If you use **supabase-auth.js** (`signInWithOtp` / `verifyOtp`) instead of the backend signup, OTP is sent by **Supabase**, not by our backend.

### 4.1 Enable Email in Supabase

1. Supabase Dashboard → **Authentication** → **Providers**.
2. **Email** → enable “Email” and (if you need signups) “Enable email signup”.
3. Optionally: **SMTP** (Dashboard → Project Settings → Auth → SMTP) for your own SMTP.  
   If you leave it empty, Supabase uses its built‑in sender (with limits and possible deliverability issues).

### 4.2 OTP vs magic link – email template

Supabase chooses **OTP vs magic link** based on the **email template**, not only on `emailRedirectTo`:

- `{{ .Token }}` → 6‑digit **OTP**.
- `{{ .ConfirmationURL }}` → **magic link**.

To get OTP:

1. **Authentication** → **Email Templates**.
2. Open the template used for “Magic Link” (or the one used for OTP).
3. In the body, use `{{ .Token }}` (the 6‑digit code), not `{{ .ConfirmationURL }}`.  
   Example:  
   `Your verification code is: {{ .Token }}`  
   Save.

### 4.3 Frontend: `signInWithOtp` and `emailRedirectTo`

In **supabase-auth.js**, `signInWithOtp` is called with:

```javascript
const { data, error } = await supabaseClient.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: null,   // OK for OTP: no redirect URL
    shouldCreateUser: true
  }
});
```

- `emailRedirectTo: null` is correct when you want an **OTP in the email** (no “click to sign in” link).  
- The **template** still must use `{{ .Token }}` for a 6‑digit OTP; otherwise Supabase can send a magic link.

There are no frontend mistakes in this call for the OTP flow; the main levers are Supabase Dashboard (provider, SMTP, template).

---

## 5. Error Handling and Logging (OTP Sending)

### Backend (EmailService, AdminController)

- **EmailService**
  - `sendOtpToEmail` returns `true`/`false` and logs:
    - SMTP not configured → info + console fallback.
    - SMTP send success → info.
    - SMTP exception → warn + console fallback.
- **AdminController**
  - `/admin/signup`:
    - Logs `Signup successful for {email}; OTP emailSent={true|false}`.
    - On validation/runtime error: warn.
    - On unexpected error: error + stack.
  - Response includes `devFallback` when OTP was not sent by email.

### Supabase (supabase-auth.js)

- `sendOtpToEmail`:
  - Logs attempt, Supabase response, and errors.
  - On error: `error.code`, `error.message`, and a user‑friendly message when possible (e.g. rate limit, invalid email, “Email provider” / “Email not enabled”).
- If you see “Email provider” or “Email not enabled”, fix Supabase Dashboard (Email provider and/or SMTP).

---

## 6. Quick Checklist

**Backend admin signup (OTP not arriving):**

- [ ] `spring.mail.host` (and port/username/password) set in `application.properties`?
- [ ] App restarted after changing `application.properties`?
- [ ] If SMTP still fails: check logs for `Failed to send OTP email` and the exception.
- [ ] When SMTP is not configured: use `devFallback` / server logs to get the OTP.

**Supabase OTP (supabase-auth.js flow):**

- [ ] Supabase Dashboard: Email provider enabled (and email signup if needed).
- [ ] Email template uses `{{ .Token }}` for the 6‑digit code.
- [ ] Optional: custom SMTP in Supabase Project Settings → Auth → SMTP.
- [ ] Frontend: `emailRedirectTo: null` (already set in supabase-auth.js).
