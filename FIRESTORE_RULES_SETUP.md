# Firestore Rules Setup

## Important: Deploy Firestore Rules

The label feature requires Firestore security rules to be deployed. Without these rules, you'll see permission errors when trying to access labels.

## How to Deploy

### Option 1: Using Firebase CLI

```bash
# Install Firebase CLI if you haven't already
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy only Firestore rules
firebase deploy --only firestore:rules
```

### Option 2: Using Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database** → **Rules**
4. Copy the contents of `firestore.rules` and paste into the console
5. Click **Publish**

## What the Rules Do

The `firestore.rules` file defines:

- **users** collection: Users can only read/write their own profile
- **testResults** collection: Users can only access their own test results
- **userLabels** collection: Users can only access their own labels (NEW)

## Troubleshooting

If you see errors like "Missing or insufficient permissions":

1. Make sure you're logged in (authenticated)
2. Verify the Firestore rules have been deployed
3. Check the Firebase Console → Firestore Database → Rules to ensure they're active

## Security

These rules ensure that:
- Users can only manage their own labels (max 20 per user)
- No user can read or modify another user's labels
- Anonymous users cannot access any labels
