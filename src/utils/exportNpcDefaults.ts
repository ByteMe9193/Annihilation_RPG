import { collection, getDocs } from "firebase/firestore";

import { db } from "@/services/firebase/config";

export async function exportNpcDefaults() {
  try {
    const snapshot = await getDocs(collection(db, "npcCards"));

    const npcs = snapshot.docs
      .map((document) => {
        const data = document.data();

        return {
          id: document.id,

          classe: data.classe ?? "",
          nome: data.nome ?? "",
          nomeVerdadeiro: data.nomeVerdadeiro ?? "",

          arquetipo: data.arquetipo ?? "",
          status: data.status ?? "",
          nivelAcesso: data.nivelAcesso ?? 1,
          relacao: data.relacao ?? "",

          imagem: data.imagem ?? "",
          video: data.video ?? "",

          descoberto: false,
          videoDescobertaExibido: false,

          revelado: {
            nome: false,
            arquetipo: false,
            status: false,
            nivelAcesso: false,
            relacao: false,
          },
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    console.log("========================================");
    console.log("NPC DEFAULTS");
    console.log("========================================");
    console.log("");

    console.log(
      `import { collection, doc, setDoc } from "firebase/firestore";`,
    );
    console.log(`import { db } from "@/services/firebase/config";`);
    console.log("");

    console.log(`export const npcDefaults = {`);

    for (const npc of npcs) {
      console.log(`  "${npc.id}": {`);
      console.log(`    classe: ${JSON.stringify(npc.classe)},`);
      console.log(`    nome: ${JSON.stringify(npc.nome)},`);
      console.log(
        `    nomeVerdadeiro: ${JSON.stringify(npc.nomeVerdadeiro)},`,
      );
      console.log(`    arquetipo: ${JSON.stringify(npc.arquetipo)},`);
      console.log(`    status: ${JSON.stringify(npc.status)},`);
      console.log(`    nivelAcesso: ${npc.nivelAcesso},`);
      console.log(`    relacao: ${JSON.stringify(npc.relacao)},`);
      console.log(`    imagem: ${JSON.stringify(npc.imagem)},`);
      console.log(`    video: ${JSON.stringify(npc.video)},`);
      console.log(`    descoberto: false,`);
      console.log(`    videoDescobertaExibido: false,`);
      console.log(`    revelado: {`);
      console.log(`      nome: false,`);
      console.log(`      arquetipo: false,`);
      console.log(`      status: false,`);
      console.log(`      nivelAcesso: false,`);
      console.log(`      relacao: false,`);
      console.log(`    },`);
      console.log(`  },`);
    }

    console.log(`};`);

    console.log("");
    console.log("========================================");
    console.log(`TOTAL DE NPCs: ${npcs.length}`);
    console.log("========================================");
  } catch (error) {
    console.error("ERRO AO EXPORTAR NPC DEFAULTS:", error);
  }
}