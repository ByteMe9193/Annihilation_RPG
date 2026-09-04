import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./config";

export async function getCharacter(
  characterId: string
): Promise<Record<string, any>> {
  const characterRef = doc(db, "characters", characterId);
  const snapshot = await getDoc(characterRef);

  if (!snapshot.exists()) {
    throw new Error(`Personagem "${characterId}" não encontrado.`);
  }

  return {
    id: snapshot.id,
    ...(snapshot.data() as Record<string, any>),
  };
}

export async function updateCharacter(
  characterId: string,
  data: Record<string, any>
) {
  const characterRef = doc(db, "characters", characterId);

  await updateDoc(characterRef, data);
}