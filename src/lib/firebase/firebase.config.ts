import {getApps, initializeApp} from 'firebase/app';
import {config} from 'dotenv';

config();

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSANGER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

export function initFirebaseApp() {
    return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}
