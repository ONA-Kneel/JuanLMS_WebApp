# Deployment Troubleshooting Guide

## File Upload Issues in Production

If file uploads work locally but fail when deployed, here are the most common causes and solutions:

### 1. API URL Configuration

**Problem**: The frontend can't reach the backend API when deployed.

**Solution**: 
- Set the `VITE_API_URL` environment variable in your deployment platform
- For Vercel: Add `VITE_API_URL=https://juanlms-webapp-server.onrender.com` in Environment Variables
- For Netlify: Add the same in Site Settings > Environment Variables

### 2. CORS Configuration

**Problem**: The backend server rejects requests from the deployed frontend domain.

**Solution**: Update your backend CORS configuration to allow your deployed frontend domain:

```javascript
// In your backend server
app.use(cors({
  origin: [
    'http://localhost:3000', // Local development
    'https://your-app.vercel.app', // Your deployed frontend
    'https://your-app.netlify.app' // Your deployed frontend
  ],
  credentials: true
}));
```

### 3. File Size Limits

**Problem**: Large files fail to upload due to size limits.

**Solution**: Check and increase file size limits in your backend:

```javascript
// Express.js example
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Multer for file uploads
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});
```

### 4. Environment Variables

**Problem**: Backend environment variables not set in production.

**Solution**: Ensure all required environment variables are set in your backend deployment:
- Database connection strings
- JWT secrets
- File storage configuration
- API keys

### 5. File Storage Configuration

**Problem**: File storage paths or permissions incorrect in production.

**Solution**: 
- Use absolute paths for file storage
- Ensure proper permissions on upload directories
- Consider using cloud storage (AWS S3, Google Cloud Storage) for production

### 6. Debugging Steps

1. **Check Browser Console**: Look for error messages and network requests
2. **Check Network Tab**: Verify API calls are reaching the correct endpoint
3. **Check Backend Logs**: Look for server-side errors
4. **Test API Endpoint**: Use Postman or curl to test the upload endpoint directly

### 7. Common Error Messages

- **401 Unauthorized**: Check JWT token and authentication
- **413 Payload Too Large**: Increase file size limits
- **500 Internal Server Error**: Check backend logs for specific errors
- **CORS Error**: Update CORS configuration

### 8. Testing Checklist

- [ ] API endpoint accessible from deployed frontend
- [ ] Authentication working (JWT tokens valid)
- [ ] File size within limits
- [ ] Backend has proper file storage permissions
- [ ] CORS allows your frontend domain
- [ ] All environment variables set correctly

### 9. Quick Fix Commands

```bash
# Test API endpoint
curl -X POST https://juanlms-webapp-server.onrender.com/lessons \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "classID=CLASS_ID" \
  -F "title=Test" \
  -F "files=@test.txt"

# Check backend logs (if you have access)
# Look for errors related to file uploads
```

### 10. Environment-Specific Configurations

**Vercel**:
```bash
# Add to Vercel environment variables
VITE_API_URL=https://juanlms-webapp-server.onrender.com
```

**Netlify**:
```bash
# Add to Netlify environment variables
VITE_API_URL=https://juanlms-webapp-server.onrender.com
```

**Render**:
```bash
# Add to Render environment variables
VITE_API_URL=https://juanlms-webapp-server.onrender.com
```

## Still Having Issues?

1. Check the browser console for detailed error messages
2. Verify the API endpoint is accessible from your deployed frontend
3. Test with a simple text file first
4. Check if the issue is with files, links, or both
5. Verify your backend server is running and accessible
