// ============================================================
//  MÖKKI – ASETUKSET
// ============================================================

// 1) Firebase-projektin "Jannenranta" asetukset
//    Firebase Console → Project settings (rataskuvake) → General →
//    "Your apps" → Web app (</>) → SDK setup and configuration → Config
//    Kopioi arvot alle LIITÄ_TÄHÄN-kohtien tilalle.
export const firebaseConfig = {
  apiKey: "AIzaSyDygRD8MlG2qoE1Rzxsev_51Sd0lPUEdA4",
  authDomain: "jannenranta.firebaseapp.com",
  projectId: "jannenranta",
  storageBucket: "jannenranta.firebasestorage.app",
  messagingSenderId: "748131172295",
  appId: "1:748131172295:web:413969bde867b4b6c363e2"
};

// 2) Yhteinen Firebase-tunnus, jolla kaikki laitteet kirjautuvat.
//    Sama sähköposti luodaan Firebase Console → Authentication → Users → Add user.
export const LOGIN_EMAIL = "terokulju95@gmail.com";

// 3) Perheenjäsenet. Jokainen kirjautuu omalla nimellään ja PIN-koodillaan.
//    Pääkäyttäjä asettaa PIN-koodit sovelluksessa (Lisää → Käyttäjät ja PIN-koodit).
//    Käyttäjiä voi lisätä ja poistaa myöhemmin myös sovelluksessa.
export const ADMIN_NAME = "Tero";
export const DEFAULT_USERS = ["Tero", "Timo", "Tiina", "Tepa", "Äiti", "Iskä"];

// Sovelluksen nimi
export const CABIN_NAME = "Mökki";
