// Firebase Configuration
// Ganti dengan kredensial dari Firebase Console > Project Settings > Your Apps

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, query, orderByChild, limitToLast } from 'firebase/database';

const firebaseConfig = {

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
const database = getDatabase(app);

// Export database reference helpers
export { database, ref, onValue, set, push, query, orderByChild, limitToLast };
export default app;
