// src/environments/environment.ts

// Votre configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCYp6riWjJWjfsH6ZGcvKn1cE_Svr5kcdU", // Attention à ne pas commiter de clés sensibles si le repo est public
  authDomain: "staterpack-app-backend.firebaseapp.com",
  projectId: "staterpack-app-backend",
  storageBucket: "staterpack-app-backend.firebasestorage.app", // Correction: enlever .firebasestorage
  messagingSenderId: "228743923842",
  appId: "1:228743923842:web:3b1d38482f2afc1210cc9b"
};

export const environment = {
  production: false,
  cloudFunctionUrl: 'https://generateimage-m36co2ausa-uc.a.run.app',
  firebaseConfig: firebaseConfig // <<< Ajoutez la config ici
};