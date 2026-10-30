
import { initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  initializeFirestore,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBqXEVvmheF1m9uK4N8vpLoMLCxRyXYQ2s",
  authDomain: "annihilation-b112b.firebaseapp.com",
  projectId: "annihilation-b112b",
  storageBucket: "annihilation-b112b.firebasestorage.app",
  messagingSenderId: "168332051529",
  appId: "1:168332051529:web:0d30c75e1571e43e772b98",
  measurementId: "G-871QK4JNWN",
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export { db };

export async function testarFirestore() {
  console.log("[TESTE FIRESTORE] Iniciando leitura...");

  try {
    const referencia = doc(db, "game", "session");
    const resultado = await getDoc(referencia);

    console.log("[TESTE FIRESTORE] Leitura concluída:", {
      existe: resultado.exists(),
      dados: resultado.exists() ? resultado.data() : null,
    });

    return true;
  } catch (erro) {
    console.error("[TESTE FIRESTORE] Falha na leitura:", erro);
    return false;
  }
}
