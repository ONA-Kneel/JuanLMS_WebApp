# Cloudinary Setup for File Uploads on Render

## Problem
Render uses **ephemeral storage**, meaning uploaded files are lost when your server restarts or scales. This is why your file uploads work initially but disappear later.

## Solution: Use Cloudinary for Cloud Storage

### Step 1: Install Dependencies

Add these packages to your `backend/server/package.json`:

```bash
cd backend/server
npm install cloudinary multer-storage-cloudinary
```

Or manually add to your `package.json`:
```json
{
  "dependencies": {
    "cloudinary": "^1.41.0",
    "multer-storage-cloudinary": "^4.0.0"
  }
}
```

### Step 2: Get Cloudinary Credentials

1. Go to [Cloudinary.com](https://cloudinary.com) and create a free account
2. From your dashboard, copy these values:
   - Cloud Name
   - API Key  
   - API Secret

### Step 3: Add Environment Variables to Render

In your Render dashboard:

1. Go to your service
2. Navigate to **Environment** tab
3. Add these environment variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

### Step 4: Deploy

The code is already configured to:
- ✅ Use Cloudinary when credentials are available (production)
- ✅ Fall back to local storage when credentials are missing (development)
- ✅ Handle both Cloudinary URLs and local files for backward compatibility

### Step 5: Test

1. Deploy to Render with the new environment variables
2. Upload a file through your support center
3. The file should now persist even after server restarts

## Files Modified

- ✅ `backend/server/config/cloudinary.js` - Cloudinary configuration
- ✅ `backend/server/routes/tickets.js` - Updated to use cloud storage
- ✅ File retrieval now handles both Cloudinary URLs and local files

## Benefits

- 🔒 **Persistent Storage**: Files won't disappear on server restart
- 🚀 **Better Performance**: CDN delivery worldwide
- 📱 **Automatic Optimization**: Images are optimized automatically
- 💰 **Free Tier**: Generous free tier for small projects
- 🔄 **Backward Compatible**: Existing local files still work

## Alternative Solutions

If you don't want to use Cloudinary:

1. **AWS S3**: More complex setup but very reliable
2. **Google Cloud Storage**: Similar to S3
3. **Supabase Storage**: Easy to set up, good free tier
4. **Firebase Storage**: Google's solution

## Troubleshooting

- **Files still disappearing**: Check that environment variables are set correctly in Render
- **Upload errors**: Check Render logs for Cloudinary connection issues
- **Old files not working**: This is expected - only new uploads will use Cloudinary

## Next Steps

1. Install the dependencies: `npm install cloudinary multer-storage-cloudinary`
2. Set up Cloudinary account and get credentials
3. Add environment variables to Render
4. Deploy and test

Your file uploads should now work reliably in production! 🎉



