# Hostinger Deployment Guide for JuanLMS

## Issue Description
Your React Router application is experiencing 404 errors when accessing routes like `/faculty_classes` directly. This happens because Hostinger (and most shared hosting providers) don't natively support client-side routing.

## Solution Steps

### 1. Build Your Application
```bash
cd frontend
npm run build
```

### 2. Upload Files to Hostinger
Upload the entire contents of the `dist` folder to your Hostinger public_html directory.

### 3. Ensure .htaccess is Present
Make sure the `.htaccess` file is in your public_html directory. This file handles:
- Client-side routing (redirects all routes to index.html)
- CORS headers for API calls
- Static asset caching
- File compression

### 4. File Structure on Hostinger
Your public_html directory should look like this:
```
public_html/
├── .htaccess
├── index.html
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
└── other build files...
```

### 5. Test Your Routes
After deployment, test these routes:
- `/` (should work)
- `/faculty_classes` (should now work)
- `/student_dashboard` (should now work)
- Any other route in your application

## Troubleshooting

### If routes still don't work:
1. **Check .htaccess**: Ensure the `.htaccess` file is in your public_html directory
2. **File permissions**: Make sure .htaccess has proper permissions (usually 644)
3. **Hostinger settings**: Some Hostinger plans require enabling mod_rewrite
4. **Clear cache**: Clear your browser cache and Hostinger's cache

### Enable mod_rewrite on Hostinger:
1. Go to your Hostinger control panel
2. Navigate to "Advanced" → "Apache Configuration"
3. Make sure "mod_rewrite" is enabled

### Check .htaccess is working:
1. Try accessing a non-existent route
2. If you see your React app instead of a 404, .htaccess is working
3. If you still see 404 errors, contact Hostinger support

## Alternative Solutions

### Option 1: Use Hash Router
If .htaccess doesn't work, you can modify your app to use hash routing:

```jsx
// In App.jsx, change from:
import { BrowserRouter as Router } from 'react-router-dom';

// To:
import { HashRouter as Router } from 'react-router-dom';
```

### Option 2: Use Vercel/Netlify
Consider deploying to Vercel or Netlify which have better support for React Router applications.

## Contact Support
If none of these solutions work, contact Hostinger support and mention:
- You're deploying a React SPA (Single Page Application)
- You need mod_rewrite enabled
- You need .htaccess support for client-side routing

## Notes
- The .htaccess file is automatically copied to your dist folder during build
- Make sure to rebuild and re-upload after any changes
- Test thoroughly in a staging environment before going live
