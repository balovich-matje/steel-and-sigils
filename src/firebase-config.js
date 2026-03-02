// ============================================
// FIREBASE CONFIGURATION
// ============================================

/**
 * Firebase configuration for Steel and Sigils PVP mode.
 * 
 * To set up your own Firebase project:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project
 * 3. Enable Realtime Database
 * 4. Copy your config object from Project Settings
 * 5. Replace the values below
 */

export const firebaseConfig = {
    apiKey: "AIzaSyBUeQ81W_9iJExeqDDu3j2OZGd6EDnFI2A",
    authDomain: "steel-and-sigils.firebaseapp.com",
    databaseURL: "https://steel-and-sigils-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "steel-and-sigils",
    storageBucket: "steel-and-sigils.firebasestorage.app",
    messagingSenderId: "1078411739086",
    appId: "1:1078411739086:web:110c1715842d296db4759f"
};



/**
 * For testing/development, you can use the Firebase emulator:
 *
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Init: firebase init
 * 4. Start emulator: firebase emulators:start
 * 5. Uncomment the line below:
 */
// export const useEmulator = true;
// export const emulatorHost = "localhost:9000";
