// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import {getFirestore} from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAe2bQDVUJUX9wicXL_BvSF8SQKj0xlTWQ",
  authDomain: "geogame-sdmm.firebaseapp.com",
  projectId: "geogame-sdmm",
  storageBucket: "geogame-sdmm.appspot.com",
  messagingSenderId: "836573704596",
  appId: "1:836573704596:web:7e83c3954d22d09c7c9f81",
  measurementId: "G-969YD8D38B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
export const firestore = getFirestore(app);