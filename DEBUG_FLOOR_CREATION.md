# Debug Floor Creation Issue

## Problem
Getting "Unauthorized" error when creating floors, even though auth check was removed.

## Changes Made

### 1. Backend (`AdminController.java`)
- ✅ Removed `isValidToken()` check from `createFloor()` endpoint
- ✅ Added debug logging
- ✅ Added support for both query params and JSON body
- ✅ Made `floorNumber` optional in `@RequestParam` to support JSON body

### 2. Frontend (`admin.js`)
- ✅ Added console logging for API calls
- ✅ Removed Authorization header requirement
- ✅ Added detailed error logging

## Testing Steps

1. **Restart Spring Boot Application**
   - The backend changes require a restart
   - Stop the application and start it again

2. **Clear Browser Cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache

3. **Check Browser Console**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Try creating a floor
   - Look for:
     - `API Call:` - Shows the request URL and options
     - `API Response status:` - Shows HTTP status code
     - `API Response data:` - Shows the response body
     - Any error messages

4. **Check Backend Console**
   - Look for:
     - `Creating floor: X, description: Y`
     - `Floor created successfully: Z`
     - Any error stack traces

## Possible Issues

### Issue 1: Application Not Restarted
**Solution:** Restart the Spring Boot application

### Issue 2: Browser Cache
**Solution:** Hard refresh or clear cache

### Issue 3: CORS Issue
**Check:** Look for CORS errors in browser console
**Solution:** Already have `@CrossOrigin(origins = "*")` on controller

### Issue 4: Wrong Endpoint
**Check:** Verify the request is going to `/admin/floors`
**Solution:** Check the console logs

### Issue 5: Request Format Issue
**Check:** The endpoint now supports both:
- Query params: `POST /admin/floors?floorNumber=2&description=Test`
- JSON body: `POST /admin/floors` with `{"floorNumber": 2, "description": "Test"}`

## Quick Test

Open browser console and run:
```javascript
fetch('/admin/floors?floorNumber=99', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
})
.then(r => r.json())
.then(d => console.log('Success:', d))
.catch(e => console.error('Error:', e));
```

This should create Floor 99 without any authentication.

## If Still Not Working

1. Check the exact error message in browser console
2. Check backend console for any errors
3. Verify the endpoint is being hit (look for "Creating floor" log)
4. Check if there are any other filters/interceptors
