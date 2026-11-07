import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB1yaV9cX3R6P1UWEWPoWv_xiEOaH3BiG4",
  authDomain: "hotel-booking-engine-46f66.firebaseapp.com",
  projectId: "hotel-booking-engine-46f66",
  storageBucket: "hotel-booking-engine-46f66.firebasestorage.app",
  messagingSenderId: "729587745827",
  appId: "1:729587745827:web:8196016817fbe463031d96",
  measurementId: "G-BTZRQ4WEG8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
isSupported().then(ok => ok && getAnalytics(app)).catch(() => {});
