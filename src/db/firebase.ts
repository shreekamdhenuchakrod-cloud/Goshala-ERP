import { initializeApp, getApps, getApp } from 'firebase/app';  
import { getFirestore } from 'firebase/firestore';  
const firebaseConfig = { apiKey: 'AIzaSyBejpBYHcNx_jrybIWcSM0hS0bWB-vYMXE', authDomain: 'skb-goshala-chakrod.firebaseapp.com', projectId: 'skb-goshala-chakrod', storageBucket: 'skb-goshala-chakrod.firebasestorage.app', messagingSenderId: '668696550910', appId: '1:668696550910:web:ca6674504666ac6455b4af' };  
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();  
export const db = getFirestore(app); 
