# Fixing VyOS Connection - SSL Certificate Issue

## Problem
When connecting to your VyOS router at `192.168.0.29`, you see an error like:
```
Network error: Cannot reach 192.168.0.29
```

The browser console shows:
```
ERR_CERT_AUTHORITY_INVALID
```

## Root Cause
VyOS routers use **self-signed SSL certificates** by default. Your browser doesn't trust these certificates, so it blocks the connection for security reasons.

## Solution: Trust the Certificate

Follow these steps **ONE TIME** to trust your router's certificate:

### Step 1: Visit Router URL Directly
1. Open a new tab in your browser
2. Navigate to: `https://192.168.0.29`
3. You'll see a security warning

### Step 2: Accept the Certificate
**Chrome/Edge:**
- Click "Advanced"
- Click "Proceed to 192.168.0.29 (unsafe)"

**Firefox:**
- Click "Advanced..."
- Click "Accept the Risk and Continue"

**Safari:**
- Click "Show Details"
- Click "visit this website"

### Step 3: Return to VyOS Manager
1. Go back to the VyOS Manager tab (http://localhost:5173)
2. Enter `192.168.0.29` (no need for https://, it's added automatically)
3. Enter your API key
4. Click "Connect Router"
5. ✅ Should now connect successfully!

## What Changed (Fixed in Latest Version)

### ✅ Auto-add https://
- **Before:** Had to manually type `https://192.168.0.29`
- **Now:** Just type `192.168.0.29` - https:// is added automatically

### ✅ Better Error Messages
- **Before:** Generic "Failed to connect" error
- **Now:** Specific errors with instructions:
  - SSL certificate issues → Instructions to trust certificate
  - Network timeout → Check IP and power
  - Wrong API key → Check credentials
  - API not enabled → Command to enable it

### ✅ Proper URL Handling
- **Before:** Entering just IP caused 404 errors (treated as relative path)
- **Now:** IP is properly prepended with https:// protocol

## Testing Connection

Once you've trusted the certificate, test the connection:

1. **Enter IP:** `192.168.0.29`
2. **Enter API Key:** Your actual VyOS API key
3. **Click Connect**
4. You should see the dashboard with live data

If you still see errors, check:
- ✅ VyOS HTTP API is enabled: `set service https api`
- ✅ You're on the same network as the router
- ✅ Router firewall allows HTTPS (port 443)
- ✅ API key is correct

## Long-term SSL Solutions (Optional)

If you don't want to accept the certificate every time you clear browser data:

### Option 1: Use Proper SSL Certificate
Generate a proper certificate with Let's Encrypt or buy one, then install on VyOS.

### Option 2: Use HTTP (Not Recommended)
Enable HTTP API instead of HTTPS:
```
set service http api
```
⚠️ **Warning:** Unencrypted - only use on trusted networks

### Option 3: Add to Browser Trust Store
Export the router's certificate and add it to your OS/browser's trusted certificate store.

## Summary

The key issue was:
1. **URL without protocol** → Now auto-adds https://
2. **SSL certificate not trusted** → One-time browser trust needed
3. **Poor error messages** → Now shows actionable guidance

After trusting the certificate once, you'll be able to connect normally!
