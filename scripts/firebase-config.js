const FIREBASE_CONFIG = {
  apiKey: 'AQUI_TU_API_KEY_DE_FIREBASE',
  authDomain: 'TU_PROYECTO.firebaseapp.com',
  databaseURL: 'https://TU_PROYECTO-default-rtdb.firebaseio.com',
  projectId: 'TU_PROYECTO',
  storageBucket: 'TU_PROYECTO.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:xxxxxxxxxxxxxx'
};

let db = null;
let firebaseOps = null;

export async function initFirebase() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const dbModule = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js');
    const app = initializeApp(FIREBASE_CONFIG);
    db = dbModule.getDatabase(app);
    firebaseOps = {
      ref:      (path)          => dbModule.ref(db, path),
      set:      (ref_, data)    => dbModule.set(ref_, data),
      push:     (ref_, data)    => dbModule.push(ref_, data),
      remove:   (ref_)          => dbModule.remove(ref_),
      onValue:  (ref_, cb, er)  => dbModule.onValue(ref_, cb, er),
    };
    console.log('Firebase conectado');
    return true;
  } catch (e) {
    console.warn('Firebase no disponible — modo demo local');
    return false;
  }
}

export function getFirebaseOps() { return firebaseOps; }
export function getDb() { return db; }
