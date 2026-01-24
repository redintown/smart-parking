# Admin Authentication Flow Documentation

## ✅ Implementation Complete

The Smart Parking System now has a proper Admin Authentication flow with route protection and session management.

## 🔐 Authentication Flow

### 1. **Admin Dashboard Button (index.html)**
- **Location**: Main page header
- **Behavior**: 
  - Checks authentication state before redirecting
  - **Authenticated** → Redirects to `admin.html` (dashboard)
  - **Not Authenticated** → Redirects to `admin-login.html` (login page)

### 2. **Admin Login Page (admin-login.html)**
- **Login Methods**:
  1. **Password Login** (Default)
     - Username + Password
     - Uses backend `/admin/login` endpoint
     - Stores session token in localStorage
  2. **Email OTP Login**
     - Email → OTP → Verify
     - Uses Supabase authentication
     - Stores Supabase session in localStorage

- **Signup**:
  - Accessible via "Sign Up" tab
  - Admin-only registration
  - After signup → Redirects to login (must login)

- **Redirect Protection**:
  - If already authenticated → Redirects to dashboard
  - Prevents accessing login page when logged in

### 3. **Admin Dashboard (admin.html)**
- **Route Protection**:
  - Checks authentication on page load
  - **Not Authenticated** → Redirects to `admin-login.html`
  - **Authenticated** → Allows access to dashboard

## 📁 Files Created/Modified

### New Files
1. **`auth-guard.js`** - Authentication guard utility
   - `checkAuthentication()` - Checks if user is authenticated
   - `requireAuth()` - Protects routes (redirects if not authenticated)
   - `redirectIfAuthenticated()` - Redirects authenticated users from login
   - `handleAdminDashboardClick()` - Handles dashboard button click

### Modified Files
1. **`index.html`**
   - Updated Admin Dashboard button to use `auth-guard.js`
   - Added click handler that checks auth before redirecting

2. **`admin-login.html`**
   - Added Login/Signup tabs
   - Added Password/OTP login method selection
   - Added password login form
   - Added redirect protection for authenticated users
   - Signup accessible from login page

3. **`admin-login.js`**
   - Added `switchAuthTab()` - Switch between login/signup
   - Added `switchLoginMethod()` - Switch between password/OTP
   - Added `handlePasswordLogin()` - Handle username/password login
   - Updated OTP verification redirect

4. **`admin-login.css`**
   - Added styles for login method tabs
   - Added styles for back-to-login button

5. **`admin.html`**
   - Added auth guard check on page load
   - Redirects to login if not authenticated

## 🔄 Authentication Methods Supported

### Method 1: Backend Session (Username/Password)
- Uses Spring Boot `/admin/login` endpoint
- Stores token in `localStorage` as `authToken`
- Verified via `/admin/verify` endpoint

### Method 2: Supabase OTP (Email OTP)
- Uses Supabase authentication
- Stores session in `localStorage` as `supabase_admin_session`
- Verified via Supabase session check

## 🛡️ Security Features

1. **Route Protection**: Dashboard requires authentication
2. **Session Persistence**: Auth state persists on page refresh
3. **Auto-Redirect**: Prevents accessing login when authenticated
4. **Token Validation**: Backend tokens are verified on use
5. **Session Expiry**: Supabase sessions check expiration

## 🎯 User Flow Diagram

```
User clicks "Admin Dashboard"
    ↓
Check Authentication?
    ├─ Authenticated → admin.html (Dashboard) ✅
    └─ Not Authenticated → admin-login.html (Login) ⬇️
         ↓
    Login Page
    ├─ Password Tab (Username + Password)
    │   └─ Success → admin.html ✅
    ├─ OTP Tab (Email → OTP)
    │   └─ Success → admin.html ✅
    └─ Sign Up Tab (Admin Registration)
        └─ Success → Redirect to Login
            └─ Must Login → admin.html ✅
```

## 🔧 How to Use

### For Users:
1. Click "Admin Dashboard" button
2. If not logged in → Login page appears
3. Choose login method:
   - **Password**: Enter username/password
   - **OTP**: Enter email, receive OTP, verify
4. After successful login → Dashboard appears

### For Developers:
- Auth guard automatically protects routes
- No manual auth checks needed in page code
- Session management is handled automatically

## 📝 Notes

- **Session Storage**: Both auth methods use `localStorage`
- **Redirect After Login**: Saved destination is restored after login
- **Logout**: Clears both Supabase and backend sessions
- **Multiple Auth Methods**: System supports both simultaneously

## ✅ Testing Checklist

- [x] Admin Dashboard button checks auth
- [x] Login page shows password/OTP options
- [x] Signup accessible from login page
- [x] Dashboard protected (redirects if not authenticated)
- [x] Login page redirects if already authenticated
- [x] Session persists on page refresh
- [x] Logout clears all sessions
