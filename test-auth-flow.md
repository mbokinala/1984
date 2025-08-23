# Authentication Flow Test Guide

## Overview
The authentication system now uses JWT tokens from Clerk to sync authentication between the web app and electron app.

## How It Works

1. **User signs in via web app**
   - User clicks "Sign In" in the electron app
   - Electron app opens browser with URL: `http://localhost:3000/sign-in?electronApp=true&appId=electron_[timestamp]_[random]`
   - User signs in with Google/email via Clerk

2. **JWT token is generated and stored**
   - After successful sign-in, the web app gets a JWT token from Clerk
   - The JWT token is stored in Convex along with the electronAppId
   - This creates a link between the electron app instance and the user's JWT token

3. **Electron app retrieves JWT token**
   - Electron app polls `/api/electron-auth-check` endpoint with its electronAppId
   - When authentication is complete, the API returns the JWT token
   - Electron app stores the JWT token locally for future API calls

4. **JWT token is used for authentication**
   - The JWT token can be used to authenticate API calls
   - The token is self-contained and doesn't require server-side session validation
   - Token expires after 24 hours (configurable)

## Testing Steps

1. **Start the web app**:
   ```bash
   cd web-app
   pnpm dev
   ```

2. **Start Convex (in separate terminal)**:
   ```bash
   cd web-app
   npx convex dev
   ```

3. **Start the electron app (in separate terminal)**:
   ```bash
   cd electron-app
   pnpm dev
   ```

4. **Test authentication**:
   - Click "Sign In" button in the electron app overlay
   - Sign in with your Google account in the browser
   - Watch the electron app automatically authenticate
   - The overlay should show authenticated state with user avatar

5. **Verify JWT token storage**:
   - Check electron app logs for "Authentication successful"
   - JWT token is stored in `~/Library/Application Support/electron-app/session.json`

## Troubleshooting

- If you see "Could not find public function" errors, restart Convex dev server
- If authentication doesn't work, check that all three services are running (web app, Convex, electron app)
- Clear the session file if you need to test fresh authentication: `rm ~/Library/Application Support/electron-app/session.json`

## Key Files Modified

- `/web-app/src/app/sign-in/[[...sign-in]]/page.tsx` - Gets JWT token from Clerk
- `/convex/auth.ts` - New functions: `storeElectronAuth`, `getElectronAuth`
- `/web-app/src/app/api/electron-auth-check/route.ts` - Returns JWT token
- `/electron-app/electron/main.ts` - Stores and uses JWT token
