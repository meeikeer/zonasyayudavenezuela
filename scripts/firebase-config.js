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
    const { initializeApp } = await import('firebase/app');
    const dbModule = await import('firebase/database');
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
