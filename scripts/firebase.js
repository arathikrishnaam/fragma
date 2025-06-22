// Firebase configuration (replace with your own config)
const firebaseConfig = {
    apiKey: "AIzaSyBgnZE7-LZFaiHjuHv5cxOC4cF_KGTcD1o",
    authDomain: "fragma-f7b13.firebaseapp.com",
    projectId: "fragma-f7b13",
    storageBucket: "fragma-f7b13.firebasestorage.app",
    messagingSenderId: "691122277737",
    appId: "1:691122277737:web:a7805b86e30b8d74c341f8"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();