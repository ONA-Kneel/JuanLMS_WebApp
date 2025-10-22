# Camera and Microphone Permission Guide

## Problem
You're seeing errors like:
- `Camera init failed Error: Permission was not granted previously, and prompting again is not allowed`
- `Mic init failed Error: Permission was not granted previously, and prompting again is not allowed`

This happens when your browser has previously denied camera/microphone access and won't prompt again automatically.

## Solution: Reset Browser Permissions

### Chrome/Chromium-based browsers (Chrome, Edge, Brave, etc.)

1. **Click the lock icon** in the address bar (next to the URL)
2. **Set Camera and Microphone to "Allow"**
3. **Refresh the page**

**Alternative method:**
1. Go to `chrome://settings/content/camera` (or `edge://settings/content/camera` for Edge)
2. Find your website in the "Allowed" or "Blocked" list
3. Click the trash icon to remove it from blocked sites
4. Refresh the page

### Firefox

1. **Click the shield icon** in the address bar
2. **Set Camera and Microphone to "Allow"**
3. **Refresh the page**

**Alternative method:**
1. Go to `about:preferences#privacy`
2. Scroll down to "Permissions"
3. Click "Settings" next to "Camera" or "Microphone"
4. Find your website and remove it from blocked sites
5. Refresh the page

### Safari

1. **Go to Safari menu > Settings for This Website**
2. **Set Camera and Microphone to "Allow"**
3. **Refresh the page**

**Alternative method:**
1. Go to Safari > Preferences > Websites
2. Select "Camera" or "Microphone" from the left sidebar
3. Find your website and set it to "Allow"
4. Refresh the page

### Mobile Browsers

#### iOS Safari
1. Go to Settings > Safari > Camera/Microphone
2. Set to "Allow"
3. Refresh the page

#### Android Chrome
1. Tap the lock icon in the address bar
2. Set Camera and Microphone to "Allow"
3. Refresh the page

## Still Having Issues?

### Clear Site Data
1. **Chrome/Edge:** Press F12 → Application tab → Storage → Clear site data
2. **Firefox:** Press F12 → Storage tab → Clear all storage
3. **Safari:** Develop menu → Empty Caches

### Check System Permissions
Make sure your operating system hasn't blocked camera/microphone access:

#### Windows
1. Go to Settings > Privacy > Camera/Microphone
2. Ensure "Allow apps to access your camera/microphone" is ON
3. Check that your browser is allowed

#### macOS
1. Go to System Preferences > Security & Privacy > Privacy
2. Select Camera/Microphone from the left sidebar
3. Ensure your browser is checked

#### Linux
1. Check if your user is in the `video` and `audio` groups
2. Run: `groups $USER` to check
3. If not, add yourself: `sudo usermod -a -G video,audio $USER`

### Hardware Check
1. **Test your camera/microphone** in other applications
2. **Check if other devices are using** the camera/microphone
3. **Restart your browser** completely
4. **Try a different browser** to isolate the issue

## Prevention
- **Always click "Allow"** when prompted for camera/microphone access
- **Don't click "Block"** unless you're sure you don't want to use video features
- **Use HTTPS** - some browsers require secure connections for media access

## Need More Help?
If you're still experiencing issues after following these steps, please contact support with:
1. Your browser name and version
2. Operating system
3. Whether you can access camera/microphone in other websites
4. Any error messages you see
