import { doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase/config";

export async function tenguHasOpportunityCard(): Promise<boolean> {
  const snapshot = await getDoc(doc(db, "characters", "tengu"));
  if (!snapshot.exists()) return false;
  const selected = snapshot.data().skillCards;
  if (!selected || typeof selected !== "object") return false;
  return Object.values(selected).includes("tengu_tier1_B");
}
