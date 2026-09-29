import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/services/firebase/config";
import { updateCharacter } from "@/services/firebase/characters";

type SkillCardEffect = {
  tipo: string;
  campo: string;
  valor: number;
  maximo?: number;
};

type SkillCardRecarga = {
  habilitada: boolean;
  segundos: number | null;
};

type SkillCard = {
  id: string;
  nome: string;
  descricao: string;
  imagem: string;
  personagem: string;
  tier: number;
  efeitos?: SkillCardEffect[];
  recarga?: SkillCardRecarga;
};

type TierKey = "tier1" | "tier2" | "tier3";

type SelectedCards = {
  tier1: SkillCard | null;
  tier2: SkillCard | null;
  tier3: SkillCard | null;
};

type UnlockedTiers = {
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
};

type Cooldowns = {
  tier1: number | null;
  tier2: number | null;
  tier3: number | null;
};

const skillCardImages: Record<string, any> = {
  acquiredImmunity: require("@/assets/skillCards/acquiredImmunity.png"),
  ancestralGrudge: require("@/assets/skillCards/ancestralGrudge.png"),
  bloodCorruption: require("@/assets/skillCards/bloodCorruption.png"),
  bornIntoTheHatred: require("@/assets/skillCards/bornIntoTheHatred.png"),
  demonShape: require("@/assets/skillCards/demonShape.png"),
  downToAFineArt: require("@/assets/skillCards/downToAFineArt.png"),
  draconicSpikes: require("@/assets/skillCards/draconicSpikes.png"),
  elementalHeritage: require("@/assets/skillCards/elementalHeritage.png"),
  extendedWarranty: require("@/assets/skillCards/extendedWarranty.png"),
  featheredDread: require("@/assets/skillCards/featheredDread.png"),
  feralInstinct: require("@/assets/skillCards/feralInstinct.png"),
  fledgling: require("@/assets/skillCards/fledgling.png"),
  gloryOfWar: require("@/assets/skillCards/gloryOfWar.png"),
  hardenedSkin: require("@/assets/skillCards/hardenedSkin.png"),
  holographicChip: require("@/assets/skillCards/holographicChip.png"),
  incantation: require("@/assets/skillCards/incantation.png"),
  lightBow: require("@/assets/skillCards/lightBow.png"),
  malware: require("@/assets/skillCards/malware.png"),
  mimicry: require("@/assets/skillCards/mimicry.png"),
  necrobioticCuirass: require("@/assets/skillCards/necrobioticCuirass.png"),
  necroticEmesis: require("@/assets/skillCards/necroticEmesis.png"),
  nowYouSeeMe: require("@/assets/skillCards/nowYouSeeMe.png"),
  opportunityStrike: require("@/assets/skillCards/opportunityStrike.png"),
  organicKnowledge: require("@/assets/skillCards/organicKnowledge.png"),
  overcharge: require("@/assets/skillCards/overcharge.png"),
  overclock: require("@/assets/skillCards/overclock.png"),
  performativeGenerosity: require("@/assets/skillCards/performativeGenerosity.png"),
  rancor: require("@/assets/skillCards/rancor.png"),
  terminator: require("@/assets/skillCards/terminator.png"),
  tribalAfflatus: require("@/assets/skillCards/tribalAfflatus.png"),
};

type NPCRevealed = {
  nome?: boolean;
  arquetipo?: boolean;
  status?: boolean;
  nivelAcesso?: boolean;
  relacao?: boolean;
};

type NPCAccessInfo = {
  nome?: boolean;
  arquetipo?: boolean;
  status?: boolean;
  nivelAcesso?: boolean;
  relacao?: boolean;
};

type NPCAccess = {
  descoberto?: boolean;
  informacoes?: NPCAccessInfo;
};

type NPC = {
  id: string;
  classe: string;
  nome: string;
  nomeVerdadeiro: string;
  arquetipo: string;
  status: string;
  nivelAcesso: number;
  relacao: string;
  imagem: string;
  video?: string;
  descoberto: boolean;
  videoDescobertaExibido?: boolean;
  revelado?: NPCRevealed;
};

const npcImages: Record<string, any> = {
  agnes: require("@/assets/npcs/agnes.png"),
  alice: require("@/assets/npcs/alice.png"),
  andrew: require("@/assets/npcs/andrew.png"),
  guest: require("@/assets/npcs/guest.png"),
  hana: require("@/assets/npcs/hana.png"),
  jordan: require("@/assets/npcs/jordan.png"),
  kasper: require("@/assets/npcs/kasper.png"),
  kenneth: require("@/assets/npcs/kenneth.png"),
  kiara: require("@/assets/npcs/kiara.png"),
  liam: require("@/assets/npcs/liam.png"),
  lochlan: require("@/assets/npcs/lochlan.png"),
  lorelai: require("@/assets/npcs/lorelai.png"),
  lucilla: require("@/assets/npcs/lucilla.png"),
  mikayla: require("@/assets/npcs/mikayla.png"),
  octavia: require("@/assets/npcs/octavia.png"),
  oliver: require("@/assets/npcs/oliver.png"),
  roy: require("@/assets/npcs/roy.png"),
};

const firebaseIds: Record<string, string> = {
  Ciborgue: "cyborg",
  Tengu: "tengu",
  Elfo: "elf",
  Tiefling: "tiefling",
  Draconata: "dragonborn",
};

const tierTitles: Record<TierKey, string> = {
  tier1: "TIER 1",
  tier2: "TIER 2",
  tier3: "TIER 3",
};

const SKILL_CARD_WIDTH = 330;
const SKILL_CARD_HEIGHT = 462;
const SKILL_CARD_GAP = 18;
const CARD_SNAP_INTERVAL = SKILL_CARD_WIDTH + SKILL_CARD_GAP;

const NPC_CARD_WIDTH = 210;
const NPC_CARD_HEIGHT = 315;
const NPC_CARD_GAP = 18;
const NPC_SNAP_INTERVAL = NPC_CARD_WIDTH + NPC_CARD_GAP;

export default function CardsScreen() {
  const { width } = useWindowDimensions();

  const [character, setCharacter] = useState<string | null>(null);

  const [cards, setCards] = useState<Record<TierKey, SkillCard[]>>({
    tier1: [],
    tier2: [],
    tier3: [],
  });

  const [chosenCards, setChosenCards] = useState<SelectedCards>({
    tier1: null,
    tier2: null,
    tier3: null,
  });

  const [unlockedTiers, setUnlockedTiers] = useState<UnlockedTiers>({
    tier1: false,
    tier2: false,
    tier3: false,
  });

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedChosenTier, setSelectedChosenTier] = useState<TierKey | null>(null);

  const [cooldowns, setCooldowns] = useState<Cooldowns>({
    tier1: null,
    tier2: null,
    tier3: null,
  });

  const [now, setNow] = useState(Date.now());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [npcAccess, setNpcAccess] = useState<Record<string, NPCAccess>>({});
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [npcClassOpen, setNpcClassOpen] = useState<Record<string, boolean>>({
    Guarda: true,
    Cientista: true,
    Operário: true,
    IA: true,
  });
  const [npcNotes, setNpcNotes] = useState("");
  const [savingNpcNotes, setSavingNpcNotes] = useState(false);

  useEffect(() => {
    loadCards();
  }, []);

  // Mantém os Tiers das Skill Cards sincronizados em tempo real com o GM.
  // Quando o GM libera/bloqueia um Tier em characters/{personagem},
  // a tela do jogador atualiza imediatamente.
  useEffect(() => {
    if (!character) return;

    const characterId = firebaseIds[character];
    if (!characterId) return;

    const unsubscribe = onSnapshot(
      doc(db, "characters", characterId),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();
        const firebaseTiers = data.skillCardTiers ?? {};

        setUnlockedTiers({
          tier1: firebaseTiers.tier1 === true,
          tier2: firebaseTiers.tier2 === true,
          tier3: firebaseTiers.tier3 === true,
        });
      },
      (err) => {
        console.error("ERRO AO SINCRONIZAR TIERS:", err);
      },
    );

    return () => unsubscribe();
  }, [character]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "npcCards"),
      (snapshot) => {
        setNpcs(
          snapshot.docs.map((npcDoc) => ({
            id: npcDoc.id,
            ...(npcDoc.data() as Omit<NPC, "id">),
          })),
        );
      },
      (err) => console.error("ERRO AO SINCRONIZAR NPCs:", err),
    );

    return () => unsubscribe();
  }, []);


  useEffect(() => {
    if (!character) {
      setNpcAccess({});
      return;
    }

    const characterId = firebaseIds[character];

    if (!characterId) {
      setNpcAccess({});
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "characters", characterId, "npcAccess"),
      (snapshot) => {
        const accessMap: Record<string, NPCAccess> = {};

        snapshot.docs.forEach((accessDoc) => {
          accessMap[accessDoc.id] = accessDoc.data() as NPCAccess;
        });

        setNpcAccess(accessMap);
      },
      (err) => {
        console.error("ERRO AO SINCRONIZAR ACESSO DOS NPCs:", err);
        setNpcAccess({});
      },
    );

    return () => unsubscribe();
  }, [character]);

  useEffect(() => {
    if (!selectedNpcId || !character) {
      setNpcNotes("");
      return;
    }

    const characterId = firebaseIds[character];
    if (!characterId) return;

    getDoc(doc(db, "characters", characterId, "npcNotes", selectedNpcId))
      .then((snapshot) => {
        setNpcNotes(snapshot.exists() ? (snapshot.data().texto ?? "") : "");
      })
      .catch((err) => console.error("ERRO AO CARREGAR NOTA:", err));
  }, [selectedNpcId, character]);

  function getNpcAccess(npc: NPC | null): NPCAccess {
    if (!npc) return {};
    return npcAccess[npc.id] ?? {};
  }

  function getNpcInfoName(npc: NPC) {
    return getNpcAccess(npc).informacoes?.nome === true
      ? npc.nomeVerdadeiro.toUpperCase()
      : "DESCONHECIDO";
  }

  async function saveNpcNotes() {
    if (!character || !selectedNpcId) return;
    const characterId = firebaseIds[character];
    if (!characterId) return;

    try {
      setSavingNpcNotes(true);
      await setDoc(
        doc(db, "characters", characterId, "npcNotes", selectedNpcId),
        { texto: npcNotes },
      );
    } catch (err) {
      console.error("ERRO AO SALVAR NOTA:", err);
    } finally {
      setSavingNpcNotes(false);
    }
  }

  /*
   * Mantém a interface atualizada enquanto houver
   * alguma habilidade em recarga.
   */
  useEffect(() => {
    const hasCooldown = Object.values(cooldowns).some(
      (value) => value !== null && value > Date.now(),
    );

    if (!hasCooldown) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldowns]);

  function formatCardName(name: string) {
    if (name === "downToAFineArt") {
      return "DOWN TO A FINE ART";
    }

    return name.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
  }

  function getCardImage(imageName: string) {
    return skillCardImages[imageName];
  }

  function getRemainingSeconds(tier: TierKey) {
    const cooldownEnd = cooldowns[tier];

    if (!cooldownEnd) {
      return 0;
    }

    return Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
  }

  function formatCooldown(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  async function loadCards() {
    try {
      setLoading(true);
      setError(null);

      const selectedCharacter = await AsyncStorage.getItem("selectedCharacter");

      if (!selectedCharacter) {
        setError("Nenhum personagem selecionado.");
        return;
      }

      setCharacter(selectedCharacter);

      const characterId = firebaseIds[selectedCharacter];

      if (!characterId) {
        setError("Personagem não configurado.");
        return;
      }

      const characterRef = await getDoc(doc(db, "characters", characterId));

      if (!characterRef.exists()) {
        setError("Personagem não encontrado.");
        return;
      }

      const characterData = characterRef.data();

      /*
       * =====================================================
       * TIERS LIBERADOS
       * =====================================================
       *
       * Tier 1 é controlado pelo Firebase também.
       *
       * Não existe fallback para true.
       *
       * Se estiver false, não aparece absolutamente nada
       * daquele Tier.
       */

      const firebaseTiers = characterData.skillCardTiers ?? {};

      const loadedUnlockedTiers: UnlockedTiers = {
        tier1: firebaseTiers.tier1 === true,
        tier2: firebaseTiers.tier2 === true,
        tier3: firebaseTiers.tier3 === true,
      };

      setUnlockedTiers(loadedUnlockedTiers);

      /*
       * =====================================================
       * CARTAS ESCOLHIDAS
       * =====================================================
       */

      const selectedCardIds = {
        tier1: characterData.skillCards?.tier1 ?? null,
        tier2: characterData.skillCards?.tier2 ?? null,
        tier3: characterData.skillCards?.tier3 ?? null,
      };

      const loadedChosenCards: SelectedCards = {
        tier1: null,
        tier2: null,
        tier3: null,
      };

      for (const tier of ["tier1", "tier2", "tier3"] as TierKey[]) {
        const cardId = selectedCardIds[tier];

        if (!cardId) {
          continue;
        }

        const selectedCardRef = await getDoc(doc(db, "skillCards", cardId));

        if (selectedCardRef.exists()) {
          loadedChosenCards[tier] = {
            id: selectedCardRef.id,
            ...(selectedCardRef.data() as Omit<SkillCard, "id">),
          };
        }
      }

      setChosenCards(loadedChosenCards);

      /*
       * =====================================================
       * COOLDOWNS
       * =====================================================
       */

      const savedCooldowns = characterData.skillCardCooldowns ?? {};

      setCooldowns({
        tier1: savedCooldowns.tier1 ?? null,
        tier2: savedCooldowns.tier2 ?? null,
        tier3: savedCooldowns.tier3 ?? null,
      });

      /*
       * =====================================================
       * RECURSOS DE CARTAS PASSIVAS
       * =====================================================
       *
       * Se uma carta já estiver escolhida e possuir um efeito
       * de recurso, garantimos que o recurso exista no personagem.
       * Isso também corrige personagens que escolheram a carta
       * antes da estrutura { atual, maximo } ser implementada.
       */

      const currentResources = characterData.recursos ?? {};
      const repairedResources = { ...currentResources };
      let resourcesNeedRepair = false;

      for (const tier of ["tier1", "tier2", "tier3"] as TierKey[]) {
        const chosenCard = loadedChosenCards[tier];

        if (!chosenCard) {
          continue;
        }

        for (const effect of chosenCard.efeitos ?? []) {
          if (effect.tipo !== "recurso") {
            continue;
          }

          const existing = repairedResources[effect.campo];

          if (existing === undefined) {
            repairedResources[effect.campo] = {
              atual: effect.valor,
              ...(effect.maximo !== undefined ? { maximo: effect.maximo } : {}),
            };
            resourcesNeedRepair = true;
          } else if (typeof existing !== "object" || existing === null) {
            repairedResources[effect.campo] = {
              atual: Number(existing) || effect.valor,
              ...(effect.maximo !== undefined ? { maximo: effect.maximo } : {}),
            };
            resourcesNeedRepair = true;
          }
        }
      }

      if (resourcesNeedRepair) {
        await updateCharacter(characterId, {
          recursos: repairedResources,
        });
      }

      /*
       * =====================================================
       * CARTAS DISPONÍVEIS
       * =====================================================
       */

      const loadedCards: Record<TierKey, SkillCard[]> = {
        tier1: [],
        tier2: [],
        tier3: [],
      };

      for (const tierNumber of [1, 2, 3]) {
        const tierKey = `tier${tierNumber}` as TierKey;

        /*
         * Tier bloqueado = não carrega nada.
         */

        if (!loadedUnlockedTiers[tierKey]) {
          continue;
        }

        /*
         * Se já existe carta escolhida nesse Tier,
         * não mostramos a seleção novamente.
         */

        if (selectedCardIds[tierKey]) {
          continue;
        }

        const cardsQuery = query(
          collection(db, "skillCards"),
          where("personagem", "==", selectedCharacter),
          where("tier", "==", tierNumber),
        );

        const snapshot = await getDocs(cardsQuery);

        loadedCards[tierKey] = snapshot.docs.map((cardDoc) => ({
          id: cardDoc.id,
          ...(cardDoc.data() as Omit<SkillCard, "id">),
        }));
      }

      setCards(loadedCards);
    } catch (err) {
      console.error("ERRO AO CARREGAR CARTAS:", err);

      setError("Não foi possível carregar as cartas.");
    } finally {
      setLoading(false);
    }
  }

  function toggleCard(cardId: string) {
    if (saving) {
      return;
    }

    setSelectedCard((current) => (current === cardId ? null : cardId));
  }

  async function chooseCard(card: SkillCard, tier: TierKey) {
    if (!character || saving || chosenCards[tier]) {
      return;
    }

    const characterId = firebaseIds[character];

    if (!characterId) {
      return;
    }

    try {
      setSaving(true);

      /*
       * =====================================================
       * CARREGA O PERSONAGEM
       * =====================================================
       */

      const characterRef = await getDoc(doc(db, "characters", characterId));

      if (!characterRef.exists()) {
        return;
      }

      const characterData = characterRef.data();

      /*
       * =====================================================
       * ATUALIZAÇÕES
       * =====================================================
       */

      const updates: Record<string, any> = {};

      /*
       * =====================================================
       * SALVA A CARTA ESCOLHIDA
       * =====================================================
       */

      updates[`skillCards.${tier}`] = card.id;

      /*
       * =====================================================
       * ESTADOS
       * =====================================================
       *
       * Estados de Armadura/Escudo são criados
       * AUTOMATICAMENTE quando a carta é escolhida.
       *
       * Isso faz com que o Reveal e a Ficha já mostrem:
       *
       * ARMADURA 10/10
       * ou
       * ESCUDO 10/10
       *
       * imediatamente após a escolha.
       */

      const currentStates = characterData.estados ?? {};

      const updatedStates = {
        ...currentStates,
      };

      let statesChanged = false;

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "estado") {
          continue;
        }

        /*
         * PELE ENDURECIDA
         *
         * Cria ARMADURA 10/10.
         */

        if (effect.campo === "armadura") {
          if (updatedStates.armadura === undefined) {
            updatedStates.armadura = {
              atual: effect.valor,
              maximo: effect.maximo ?? 10,
            };

            statesChanged = true;
          }
        }

        /*
         * COURAÇA NECROBIÓTICA
         *
         * Cria ESCUDO 10/10.
         */

        if (effect.campo === "escudo") {
          if (updatedStates.escudo === undefined) {
            updatedStates.escudo = {
              atual: effect.valor,
              maximo: effect.maximo ?? 10,
            };

            statesChanged = true;
          }
        }
      }

      if (statesChanged) {
        updates.estados = updatedStates;
      }

      /*
       * =====================================================
       * RECURSOS
       * =====================================================
       *
       * Continua funcionando para Rancor,
       * Flechas de Luz, Energia etc.
       */

      const currentResources = characterData.recursos ?? {};

      const updatedResources = {
        ...currentResources,
      };

      let resourcesChanged = false;

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "recurso") {
          continue;
        }

        if (updatedResources[effect.campo] === undefined) {
          updatedResources[effect.campo] = {
            atual: effect.valor,
            ...(effect.maximo !== undefined
              ? {
                  maximo: effect.maximo,
                }
              : {}),
          };

          resourcesChanged = true;
        }
      }

      if (resourcesChanged) {
        updates.recursos = updatedResources;
      }

      /*
       * =====================================================
       * SALVA TUDO
       * =====================================================
       */

      await updateCharacter(characterId, updates);

      /*
       * =====================================================
       * ATUALIZA A INTERFACE
       * =====================================================
       */

      setChosenCards((current) => ({
        ...current,
        [tier]: card,
      }));

      setCards((current) => ({
        ...current,
        [tier]: [],
      }));

      setSelectedCard(null);
    } catch (err) {
      console.error("ERRO AO SALVAR CARTA:", err);

      setError("Não foi possível salvar sua escolha.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * ATIVAÇÃO DA HABILIDADE
   * =========================================================
   */

  async function activateCard(card: SkillCard, tier: TierKey) {
    if (!character || saving) {
      return;
    }

    const remainingSeconds = getRemainingSeconds(tier);

    if (remainingSeconds > 0) {
      return;
    }

    const characterId = firebaseIds[character];

    if (!characterId) {
      return;
    }

    try {
      setSaving(true);

      const characterRef = await getDoc(doc(db, "characters", characterId));

      if (!characterRef.exists()) {
        return;
      }

      const characterData = characterRef.data();

      const updates: Record<string, any> = {};

      /*
       * =====================================================
       * ESTADOS ATUAIS
       * =====================================================
       */

      const currentStates = characterData.estados ?? {};

      const updatedStates = {
        ...currentStates,
      };

      let statesChanged = false;

      /*
       * =====================================================
       * PELE ENDURECIDA
       * =====================================================
       *
       * Primeira ativação:
       * ARMADURA 10/10
       *
       * Ativações seguintes:
       * +2 ARMADURA
       *
       * Máximo: 10
       */

      if (card.imagem === "hardenedSkin") {
        const currentArmor = updatedStates.armadura;

        const currentValue = currentArmor?.atual ?? 0;

        const maximo = currentArmor?.maximo ?? 10;

        const newValue =
          currentArmor === undefined ? 10 : Math.min(currentValue + 2, maximo);

        updatedStates.armadura = {
          atual: newValue,
          maximo: maximo,
        };

        statesChanged = true;
      }

      /*
       * =====================================================
       * COURAÇA NECROBIÓTICA
       * =====================================================
       *
       * Primeira ativação:
       * ESCUDO 10/10
       *
       * Ativações seguintes:
       * +3 ESCUDO
       *
       * Máximo: 10
       */

      if (card.imagem === "necrobioticCuirass") {
        const currentShield = updatedStates.escudo;

        const currentValue = currentShield?.atual ?? 0;

        const maximo = currentShield?.maximo ?? 10;

        const newValue =
          currentShield === undefined ? 10 : Math.min(currentValue + 3, maximo);

        updatedStates.escudo = {
          atual: newValue,
          maximo: maximo,
        };

        statesChanged = true;
      }

      /*
       * =====================================================
       * OUTROS EFEITOS DE ESTADO
       * =====================================================
       *
       * Mantém o sistema genérico para futuras cartas
       * que utilizem outros estados.
       */

      for (const effect of card.efeitos ?? []) {
        if (
          effect.tipo === "estado" &&
          effect.campo !== "armadura" &&
          effect.campo !== "escudo"
        ) {
          const existingState = updatedStates[effect.campo];

          const currentValue = existingState?.atual ?? 0;

          let newValue =
            existingState === undefined
              ? effect.valor
              : currentValue + effect.valor;

          if (effect.maximo !== undefined) {
            newValue = Math.min(newValue, effect.maximo);
          }

          updatedStates[effect.campo] = {
            atual: Math.max(0, newValue),
            ...(effect.maximo !== undefined
              ? {
                  maximo: effect.maximo,
                }
              : {}),
          };

          statesChanged = true;
        }
      }

      /*
       * =====================================================
       * RECURSOS
       * =====================================================
       */

      const currentResources = characterData.recursos ?? {};

      const updatedResources = {
        ...currentResources,
      };

      let resourcesChanged = false;

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "recurso") {
          continue;
        }

        const existing = updatedResources[effect.campo];

        const currentValue = existing?.atual ?? effect.valor;

        let newValue = currentValue + effect.valor;

        if (effect.maximo !== undefined) {
          newValue = Math.min(newValue, effect.maximo);
        }

        newValue = Math.max(0, newValue);

        updatedResources[effect.campo] = {
          atual: newValue,
          ...(effect.maximo !== undefined
            ? {
                maximo: effect.maximo,
              }
            : existing?.maximo !== undefined
              ? {
                  maximo: existing.maximo,
                }
              : {}),
        };

        resourcesChanged = true;
      }

      /*
       * =====================================================
       * ATRIBUTOS
       * =====================================================
       */

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "atributo") {
          continue;
        }

        const currentValue = characterData[effect.campo] ?? 0;

        updates[effect.campo] = currentValue + effect.valor;
      }

      /*
       * =====================================================
       * SALVA ESTADOS
       * =====================================================
       */

      if (statesChanged) {
        updates.estados = updatedStates;
      }

      /*
       * =====================================================
       * SALVA RECURSOS
       * =====================================================
       */

      if (resourcesChanged) {
        updates.recursos = updatedResources;
      }

      /*
       * =====================================================
       * COOLDOWN
       * =====================================================
       */

      let cooldownEnd: number | null = null;

      if (
        card.recarga?.habilitada &&
        card.recarga.segundos &&
        card.recarga.segundos > 0
      ) {
        cooldownEnd = Date.now() + card.recarga.segundos * 1000;

        updates[`skillCardCooldowns.${tier}`] = cooldownEnd;
      } else {
        updates[`skillCardCooldowns.${tier}`] = null;
      }

      /*
       * =====================================================
       * SALVA TUDO NO FIREBASE
       * =====================================================
       */

      console.log("💾 ATUALIZAÇÃO DA HABILIDADE:", {
        card: card.imagem,
        states: updates.estados,
        resources: updates.recursos,
      });

      await updateCharacter(characterId, updates);

      /*
       * Atualiza cooldown localmente.
       */

      setCooldowns((current) => ({
        ...current,
        [tier]: cooldownEnd,
      }));

      setNow(Date.now());
    } catch (err) {
      console.error("❌ ERRO AO ATIVAR CARTA:", err);

      setError("Não foi possível ativar a habilidade.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * RENDERIZA CARTAS ESCOLHIDAS
   * =========================================================
   */

  function renderChosenCards() {
    const selectedEntries = (["tier1", "tier2", "tier3"] as TierKey[])
      .map((tier) => ({ tier, card: chosenCards[tier] }))
      .filter(
        (entry): entry is { tier: TierKey; card: SkillCard } =>
          entry.card !== null,
      );

    if (selectedEntries.length === 0) return null;

    const selectedEntry =
      selectedEntries.find((entry) => entry.tier === selectedChosenTier) ?? null;

    const selectedCardData = selectedEntry?.card ?? null;
    const selectedTier = selectedEntry?.tier ?? null;

    const remainingSeconds = selectedCardData && selectedTier
      ? getRemainingSeconds(selectedTier)
      : 0;

    const isOnCooldown = remainingSeconds > 0;
    const hasCooldown =
      selectedCardData?.recarga?.habilitada === true &&
      (selectedCardData?.recarga?.segundos ?? 0) > 0;

    const stateEffect = selectedCardData
      ? (selectedCardData.efeitos ?? []).find(
          (effect) =>
            effect.tipo === "estado" &&
            (effect.campo === "armadura" || effect.campo === "escudo"),
        )
      : null;

    const isSceneRecovery = !!stateEffect;

    const sceneRecoveryText = stateEffect
      ? stateEffect.campo === "armadura"
        ? "RECUPERA +2 ARMADURA POR CENA • MÁX. 10"
        : "RECUPERA +3 ESCUDO POR CENA • MÁX. 10"
      : null;

    return (
      <View style={styles.activeCardsSection}>
        <Text style={styles.subtitle}>SELECIONADAS</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_SNAP_INTERVAL}
          snapToAlignment="start"
          contentContainerStyle={[
            styles.skillCarouselContent,
            {
              paddingLeft: Math.max(
                0,
                (width - 40 - SKILL_CARD_WIDTH) / 2,
              ),
              paddingRight: Math.max(
                0,
                (width - 40 - SKILL_CARD_WIDTH) / 2,
              ),
            },
          ]}
          nestedScrollEnabled
        >
          {selectedEntries.map(({ tier, card }) => {
            const selected = selectedChosenTier === tier;
            const image = getCardImage(card.imagem);

            return (
              <View key={tier} style={styles.cardPage}>
                <Pressable
                  style={[
                    styles.skillCardSelectable,
                    selected && styles.skillCardSelectableSelected,
                  ]}
                  onPress={() =>
                    setSelectedChosenTier((current) =>
                      current === tier ? null : tier,
                    )
                  }
                >
                  {image ? (
                    <Image
                      source={image}
                      style={styles.skillCardImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.placeholderText}>
                        IMAGEM NÃO ENCONTRADA
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>

        {selectedCardData && selectedTier && (
          <View style={styles.selectedSkillInfoPanel}>
            <View style={styles.selectedSkillHeader}>
              <View style={styles.selectedSkillHeaderAccent} />
              <View style={styles.selectedSkillHeaderText}>
                <Text style={styles.selectedSkillEyebrow}>
                  HABILIDADE SELECIONADA
                </Text>
                <Text style={styles.selectedSkillTitle}>
                  {formatCardName(selectedCardData.imagem)}
                </Text>
                <Text style={styles.selectedSkillTier}>
                  {tierTitles[selectedTier]}
                </Text>
              </View>
            </View>

            <Text style={styles.selectedSkillDescription}>
              {selectedCardData.descricao}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.activateButton,
                isOnCooldown && styles.activateButtonDisabled,
                pressed && !isOnCooldown && styles.activateButtonPressed,
              ]}
              onPress={() => activateCard(selectedCardData, selectedTier)}
              disabled={saving || isOnCooldown}
            >
              <Text
                style={[
                  styles.activateButtonText,
                  isOnCooldown && styles.activateButtonTextDisabled,
                ]}
              >
                {isOnCooldown
                  ? "EM RECARGA"
                  : saving
                    ? "PROCESSANDO..."
                    : isSceneRecovery
                      ? "PASSAR CENA"
                      : "ATIVAR HABILIDADE"}
              </Text>
            </Pressable>

            {hasCooldown && isOnCooldown && (
              <View style={styles.cooldownContainer}>
                <Text style={styles.cooldownLabel}>RECARGA</Text>
                <Text style={styles.cooldownValue}>
                  {formatCooldown(remainingSeconds)}
                </Text>
              </View>
            )}

            {isSceneRecovery ? (
              <Text style={styles.noCooldownText}>{sceneRecoveryText}</Text>
            ) : !hasCooldown ? (
              <Text style={styles.noCooldownText}>SEM RECARGA</Text>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  /*
   * =========================================================
   * RENDERIZA SELEÇÃO
   * =========================================================
   */

  function renderTierSelection(tier: TierKey) {
    /*
     * Tier falso = absolutamente nada.
     */

    if (!unlockedTiers[tier]) {
      return null;
    }

    /*
     * Carta já escolhida = painel de ativação.
     */

    if (chosenCards[tier]) {
      return null;
    }

    const tierCards = cards[tier];

    /*
     * Tier liberado mas sem cartas.
     */

    if (tierCards.length === 0) {
      return (
        <View key={tier} style={styles.emptyTierContainer}>
          <Text style={styles.subtitle}>{tierTitles[tier]}</Text>

          <Text style={styles.emptyText}>NENHUMA CARTA DISPONÍVEL</Text>
        </View>
      );
    }

    /*
     * Seleção de cartas.
     */

    return (
      <View key={tier} style={styles.selectionSection}>
        <Text style={styles.subtitle}>{tierTitles[tier]}</Text>

        <Text style={styles.instruction}>
          Escolha uma das duas cartas disponíveis.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={CARD_SNAP_INTERVAL}
          snapToAlignment="center"
          contentContainerStyle={[styles.skillCarouselContent, { paddingHorizontal: Math.max(0, (width - SKILL_CARD_WIDTH) / 2) }]}
          nestedScrollEnabled
        >
          {tierCards.map((item) => (
            <View
              key={item.id}
              style={styles.cardPage}
            >
              <Pressable onPress={() => toggleCard(item.id)} disabled={saving}>
                {getCardImage(item.imagem) ? (
                  <Image
                    source={getCardImage(item.imagem)}
                    style={styles.skillCardImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>
                      IMAGEM NÃO ENCONTRADA
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.cardName}>{formatCardName(item.imagem)}</Text>

              {selectedCard === item.id && (
                <View style={styles.descriptionContainer}>
                  <View style={styles.separator} />

                  <Text style={styles.descriptionLabel}>DESCRIÇÃO</Text>

                  <Text style={styles.description}>{item.descricao}</Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.chooseButton,
                      pressed && styles.chooseButtonPressed,
                    ]}
                    onPress={() => chooseCard(item, tier)}
                    disabled={saving}
                  >
                    <Text style={styles.chooseButtonText}>
                      {saving ? "SALVANDO..." : "SELECIONAR HABILIDADE"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />

        <Text style={styles.loadingText}>CARREGANDO CARTAS...</Text>
      </View>
    );
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  /*
   * A descoberta individual vem EXCLUSIVAMENTE de:
   * characters/{personagem}/npcAccess/{npc}.descoberto
   *
   * O campo `descoberto` de npcCards é global e não controla
   * se este personagem pode ver o NPC.
   */
  const discoveredNpcs = npcs.filter(
    (npc) => npcAccess[npc.id]?.descoberto === true,
  );

  const npcClasses = ["Guarda", "Cientista", "Operário", "IA"];

  const npcsByClass = npcClasses.reduce<Record<string, NPC[]>>(
    (acc, classe) => {
      if (classe === "Operário") {
        acc[classe] = discoveredNpcs.filter(
          (npc) =>
            npc.classe === "Operário" ||
            npc.classe === "Operária",
        );
      } else {
        acc[classe] = discoveredNpcs.filter(
          (npc) => npc.classe === classe,
        );
      }

      return acc;
    },
    {},
  );

  function isNpcInClass(npc: NPC | null, classe: string) {
    if (!npc) return false;

    if (classe === "Operário") {
      return npc.classe === "Operário" || npc.classe === "Operária";
    }

    return npc.classe === classe;
  }

  const selectedNpc =
    discoveredNpcs.find((npc) => npc.id === selectedNpcId) ?? null;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageContent}
      >
        <Text style={styles.title}>CARTAS</Text>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>HABILIDADES</Text>
        </View>

        <View style={styles.skillsContent}>
          {renderChosenCards()}
          {renderTierSelection("tier1")}
          {renderTierSelection("tier2")}
          {renderTierSelection("tier3")}
        </View>

        <View style={styles.sectionTitle}>
          <Text style={styles.sectionTitleText}>PERSONAGENS</Text>
        </View>

        <View style={styles.npcsContent}>
            {discoveredNpcs.length === 0 ? (
              <Text style={styles.emptyNpcText}>
                NENHUM PERSONAGEM DESCOBERTO
              </Text>
            ) : (
              <>
                {npcClasses.map((classe) => {
                  const classNpcs = npcsByClass[classe] ?? [];

                  if (classNpcs.length === 0) {
                    return null;
                  }

                  return (
                    <View key={classe} style={styles.npcClassSection}>
                      <Pressable
                        style={styles.npcClassHeader}
                        onPress={() => {
                          const willOpen = !(npcClassOpen[classe] ?? true);

                          setNpcClassOpen((current) => ({
                            ...current,
                            [classe]: willOpen,
                          }));

                          // Se o NPC selecionado pertence a esta classe e ela
                          // está sendo fechada, fecha também as informações.
                          if (!willOpen && selectedNpcId) {
                            const selected = discoveredNpcs.find(
                              (npc) => npc.id === selectedNpcId,
                            );

                            if (isNpcInClass(selected ?? null, classe)) {
                              setSelectedNpcId(null);
                            }
                          }
                        }}
                      >
                        <Text style={styles.npcClassTitle}>
                          {classe === "Operário" ? "OPERÁRIOS" : classe.toUpperCase()}
                        </Text>
                        <Text style={styles.npcClassArrow}>
                          {(npcClassOpen[classe] ?? true) ? "−" : "+"}
                        </Text>
                      </Pressable>

                      {(npcClassOpen[classe] ?? true) && (
                        <FlatList
                          data={classNpcs}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          snapToInterval={NPC_SNAP_INTERVAL}
                          snapToAlignment="center"
                          decelerationRate="fast"
                          contentContainerStyle={styles.npcListContent}
                          keyExtractor={(item) => item.id}
                          renderItem={({ item: npc }) => {
                            const image = npcImages[npc.imagem];
                            const selected = selectedNpcId === npc.id;

                            return (
                              <View style={styles.npcEntry}>
                                <Pressable
                                  style={[
                                    styles.npcCard,
                                    selected && styles.npcCardSelected,
                                  ]}
                                  onPress={() =>
                                    setSelectedNpcId((current) =>
                                      current === npc.id ? null : npc.id,
                                    )
                                  }
                                >
                                  {image ? (
                                    <Image
                                      source={image}
                                      style={styles.npcImage}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View style={styles.npcPlaceholder}>
                                      <Text style={styles.npcPlaceholderText}>
                                        {npc.imagem}
                                      </Text>
                                    </View>
                                  )}
                                </Pressable>
                              </View>
                            );
                          }}
                        />
                      )}

                      {isNpcInClass(selectedNpc, classe) && (
                        <View style={styles.npcInfoPanel}>
                          <View style={styles.npcInfoHeader}>
                            <View style={styles.npcInfoHeaderAccent} />
                            <View style={styles.npcInfoHeaderText}>
                              <Text style={styles.npcInfoEyebrow}>REGISTRO DE PERSONAGEM</Text>
                              <Text style={styles.npcInfoTitle}>{getNpcInfoName(selectedNpc)}</Text>
                              <Text style={styles.npcInfoClass}>{selectedNpc.classe.toUpperCase()}</Text>
                            </View>
                          </View>

                          <View style={styles.npcInfoGrid}>
                            {selectedNpc.classe === "Guarda" && (
                              <View style={styles.npcInfoCell}>
                                <Text style={styles.npcInfoCellLabel}>ARQUÉTIPO</Text>
                                <Text style={styles.npcInfoCellValue}>
                                  {getNpcAccess(selectedNpc).informacoes?.arquetipo
                                    ? selectedNpc.arquetipo.toUpperCase()
                                    : "DESCONHECIDO"}
                                </Text>
                              </View>
                            )}

                            <View style={styles.npcInfoCell}>
                              <Text style={styles.npcInfoCellLabel}>STATUS</Text>
                              <Text style={styles.npcInfoCellValue}>
                                {getNpcAccess(selectedNpc).informacoes?.status
                                  ? selectedNpc.status.toUpperCase()
                                  : "DESCONHECIDO"}
                              </Text>
                            </View>

                            <View style={styles.npcInfoCell}>
                              <Text style={styles.npcInfoCellLabel}>NÍVEL DE ACESSO</Text>
                              <Text style={styles.npcInfoCellValue}>
                                {getNpcAccess(selectedNpc).informacoes?.nivelAcesso
                                  ? String(selectedNpc.nivelAcesso).toUpperCase()
                                  : "DESCONHECIDO"}
                              </Text>
                            </View>

                            <View style={styles.npcInfoCell}>
                              <Text style={styles.npcInfoCellLabel}>RELAÇÃO</Text>
                              <Text style={styles.npcInfoCellValue}>
                                {getNpcAccess(selectedNpc).informacoes?.relacao
                                  ? selectedNpc.relacao.toUpperCase()
                                  : "DESCONHECIDO"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.npcObservationHeader}>
                            <Text style={styles.npcObservationLabel}>OBSERVAÇÕES</Text>
                            {savingNpcNotes && (
                              <Text style={styles.npcSavingText}>SALVANDO...</Text>
                            )}
                          </View>

                          <TextInput
                            value={npcNotes}
                            onChangeText={setNpcNotes}
                            onBlur={saveNpcNotes}
                            multiline
                            placeholder="ADICIONE SUAS OBSERVAÇÕES..."
                            placeholderTextColor="#555555"
                            style={styles.npcNotes}
                            selectionColor="#ffffff"
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  pageContent: {
    paddingBottom: 110,
  },

  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 15,
  },

  subtitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 10,
  },

  instruction: {
    color: "#777777",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 25,
  },

  selectionSection: {
    marginBottom: 55,
  },

  activeCardsSection: {
    marginBottom: 55,
  },

  skillCardSelectable: {
    width: SKILL_CARD_WIDTH,
    height: SKILL_CARD_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 0,
    borderColor: "transparent",
  },

  skillCardSelectableSelected: {
    borderWidth: 2,
    borderColor: "#888888",
  },

  cardTierLabel: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 10,
  },

  selectedSkillInfoPanel: {
    width: "100%",
    marginTop: 18,
    padding: 18,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: "#333333",
  },

  selectedSkillHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    paddingBottom: 15,
    marginBottom: 15,
  },

  selectedSkillHeaderAccent: {
    width: 4,
    backgroundColor: "#bdbdbd",
    marginRight: 14,
  },

  selectedSkillHeaderText: {
    flex: 1,
    justifyContent: "center",
  },

  selectedSkillEyebrow: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 5,
  },

  selectedSkillTitle: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: 2,
  },

  selectedSkillTier: {
    color: "#888888",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 5,
  },

  selectedSkillDescription: {
    color: "#cccccc",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  emptyTierContainer: {
    alignItems: "center",
    marginBottom: 45,
    paddingVertical: 30,
  },

  emptyText: {
    color: "#444444",
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 20,
  },

  skillCarouselContent: {
    paddingHorizontal: 0,
  },

  cardPage: {
    width: SKILL_CARD_WIDTH,
    alignItems: "center",
    marginRight: SKILL_CARD_GAP,
  },

  skillCardImage: {
    width: SKILL_CARD_WIDTH,
    height: SKILL_CARD_HEIGHT,
  },

  cardName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 12,
  },

  descriptionContainer: {
    width: "100%",
    paddingHorizontal: 5,
    marginTop: 20,
    alignItems: "center",
  },

  separator: {
    width: "100%",
    height: 1,
    backgroundColor: "#292929",
    marginBottom: 18,
  },

  descriptionLabel: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 10,
  },

  description: {
    color: "#cccccc",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },

  chooseButton: {
    width: "100%",
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#777777",
    backgroundColor: "#090909",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    marginBottom: 10,
    paddingHorizontal: 15,
  },

  chooseButtonPressed: {
    backgroundColor: "#161616",
    borderColor: "#ffffff",
  },

  chooseButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },

  /*
   * =====================================================
   * CARTA ATIVA
   * =====================================================
   */

  activeCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "#090909",
    marginTop: 20,
    overflow: "hidden",
  },

  activeCardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#292929",
    paddingVertical: 14,
    paddingHorizontal: 15,
  },

  activeCardTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },

  activeCardBody: {
    flexDirection: "column",
    padding: 15,
    alignItems: "center",
  },

  activeCardImage: {
    width: 220,
    height: 315,
    marginBottom: 20,
  },

  activeCardInfo: {
    width: "100%",
    alignItems: "center",
  },

  activeCardDescription: {
    width: "100%",
    color: "#aaaaaa",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  activateButton: {
    width: "100%",
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#777777",
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 10,
  },

  activateButtonPressed: {
    backgroundColor: "#1a1a1a",
    borderColor: "#ffffff",
  },

  activateButtonDisabled: {
    borderColor: "#333333",
    backgroundColor: "#080808",
  },

  activateButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  activateButtonTextDisabled: {
    color: "#555555",
  },

  cooldownContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 14,
  },

  cooldownLabel: {
    color: "#555555",
    fontSize: 8,
    letterSpacing: 2,
  },

  cooldownValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 3,
  },

  noCooldownText: {
    width: "100%",
    color: "#444444",
    fontSize: 8,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 12,
  },

  /*
   * =====================================================
   * CARTA ESCOLHIDA / PLACEHOLDER
   * =====================================================
   */

  imagePlaceholder: {
    width: SKILL_CARD_WIDTH,
    height: SKILL_CARD_HEIGHT,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  imagePlaceholderSmall: {
    width: 115,
    height: 165,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: "#555555",
    fontSize: 9,
    textAlign: "center",
  },

  sectionTitle: {
    width: "100%",
    marginTop: 18,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#303030",
  },

  sectionTitleText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
  },

  skillsContent: {
    width: "100%",
  },

  npcsContent: {
    width: "100%",
    paddingTop: 4,
  },

  emptyNpcText: {
    color: "#555555",
    fontSize: 10,
    letterSpacing: 2,
    textAlign: "center",
    paddingVertical: 30,
  },

  npcClassSection: {
    width: "100%",
    marginTop: 12,
  },

  npcClassHeader: {
    width: "100%",
    minHeight: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#262626",
    backgroundColor: "#070707",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  npcClassTitle: {
    color: "#dddddd",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 2,
  },

  npcClassArrow: {
    color: "#888888",
    fontSize: 22,
    lineHeight: 22,
  },

  npcListContent: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 0,
  },

  npcEntry: {
    width: NPC_CARD_WIDTH,
    alignItems: "center",
    marginRight: NPC_CARD_GAP,
  },

  npcCard: {
    width: NPC_CARD_WIDTH,
    height: NPC_CARD_HEIGHT,
    padding: 0,
    margin: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#111111",
    borderWidth: 0,
  },

  npcCardSelected: {
    borderWidth: 2,
    borderColor: "#888888",
  },

  npcImage: {
    width: "100%",
    height: "100%",
  },

  npcPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111111",
  },

  npcPlaceholderText: {
    color: "#555555",
    fontSize: 9,
    textAlign: "center",
  },

  npcName: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textAlign: "center",
    marginTop: 1,
  },

  npcInfoPanel: {
    width: "100%",
    marginTop: 10,
    padding: 18,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: "#333333",
  },

  npcInfoHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 78,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
    paddingBottom: 16,
    marginBottom: 16,
  },

  npcInfoHeaderAccent: {
    width: 4,
    backgroundColor: "#bdbdbd",
    marginRight: 14,
  },

  npcInfoHeaderText: {
    flex: 1,
    justifyContent: "center",
  },

  npcInfoEyebrow: {
    color: "#666666",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
    marginBottom: 5,
  },

  npcInfoTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
  },

  npcInfoClass: {
    color: "#888888",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 5,
  },

  npcInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#252525",
  },

  npcInfoCell: {
    width: "50%",
    minHeight: 78,
    paddingHorizontal: 12,
    paddingVertical: 11,
    justifyContent: "center",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#252525",
    backgroundColor: "#0d0d0d",
  },

  npcInfoCellLabel: {
    color: "#666666",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.8,
    marginBottom: 7,
  },

  npcInfoCellValue: {
    color: "#dddddd",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  npcObservationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 8,
  },

  npcObservationLabel: {
    color: "#777777",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.5,
  },

  npcNotes: {
    minHeight: 125,
    color: "#d0d0d0",
    fontSize: 14,
    lineHeight: 21,
    textAlignVertical: "top",
    backgroundColor: "#0f0f0f",
    borderWidth: 1,
    borderColor: "#292929",
    padding: 12,
  },

  npcSavingText: {
    color: "#555555",
    fontSize: 8,
    letterSpacing: 1.5,
    textAlign: "right",
  },

  loadingText: {
    color: "#777777",
    textAlign: "center",
    marginTop: 15,
    fontSize: 11,
    letterSpacing: 2,
  },

  errorText: {
    color: "#ffffff",
    textAlign: "center",
    marginTop: 50,
    fontSize: 14,
  },
});
