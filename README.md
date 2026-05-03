# My Life Helpers

A suite of lightweight, frontend-only web applications powered by Firebase.

## First App: Debt Tracker

A simple tool to track credit card bills and personal debts. 
- Add debts with a title, category, due date, amount, and remarks.
- See a list of all your debts.
- View total debt amount grouped by category.
- Built without any heavy frontend frameworks (Vanilla JS, HTML, CSS).
- Only accessible by users created in the Firebase console.

## Setup Instructions

1. **Firebase Project Setup**:
   - Create a project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Authentication** and choose **Email/Password** as the sign-in method.
   - Enable **Realtime Database** and set the rules from `database.rules.json`.
   - In Project Settings, find your Web App configuration (API Key, Auth Domain, etc.).
2. **Configure App**:
   - Open `public/app.js` and replace the `firebaseConfig` object placeholder with your actual Firebase config.
3. **Running Locally**:
   - You can serve the `public/` directory using any local web server (like `npx serve public`).
4. **Deployment**:
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Login to Firebase: `firebase login`
   - Initialize project (if not already done): `firebase init hosting`
   - Deploy: `firebase deploy --only hosting`

## User Management
As per the requirements, registration is disabled in the frontend. To add a user:
1. Go to Firebase Console -> Authentication -> Users tab.
2. Click "Add User" and enter an email and password.
3. The user can now use those credentials to log into the app.
