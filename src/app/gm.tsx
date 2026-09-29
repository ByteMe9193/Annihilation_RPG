import React, { useEffect, useMemo, useState } from "react";

import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { Snackbar } from "react-native-paper";

import { characterDefaults } from "@/constants/characterDefaults";
import { npcDefaults } from "@/constants/npcDefaults";
import { db } from "@/services/firebase/config";

type CharacterData = {
  id: string;
  nome?: string;
  raca?: string;
  ativo?: boolean;
  skillCards?: {
    tier1?: string | null;
    tier2?: string | null;
    tier3?: string | null;
  };
  skillCardTiers?: {
    tier1?: boolean;
    tier2?: boolean;
    tier3?: boolean;
  };
  efeitosAtivos?: string;
  modificacoes?: string;
  classe?: string | null;
  eventoClasseLiberado?: boolean;
};

type NPCData = {
  id: string;
  nome?: string;
  nomeVerdadeiro?: string;
  classe?: string;
  nivelAcesso?: number | string;
  arquetipo?: string;
  status?: string;
  relacao?: string;
};

type SkillCardData = {
  id: string;
  personagem?: string;
  tier?: number;
  nome?: string;
};

type NPCInfoAccess = {
  nome?: boolean;
  arquetipo?: boolean;
  status?: boolean;
  nivelAcesso?: boolean;
  relacao?: boolean;
};

type PendingData = {
  id: string;
  characterId?: string;
  characterName?: string;
  titulo?: string;
  habilidade?: string;
  observacao?: string;
  lembrete?: string;
  criadoEm?: number;
  expiraEm?: number | null;
  concluida?: boolean;
};

type SessionData = {
  bloqueada?: boolean;
};

type AlertData = {
  ativo?: boolean;
  porcentagem?: number;
  disparo?: number;
};

const firebaseIds: Record<string, string> = {
  Ciborgue: "cyborg",
  Tengu: "tengu",
  Elfo: "elf",
  Tiefling: "tiefling",
  Draconata: "dragonborn",
};

const characterLabels: Record<string, string> = {
  cyborg: "CIBORGUE",
  tengu: "TENGU",
  elf: "ELFO",
  tiefling: "TIEFLING",
  dragonborn: "DRACONATA",
};

const npcInfoFields: Array<{
  key: keyof NPCInfoAccess;
  label: string;
}> = [
  { key: "nome", label: "NOME REAL" },
  { key: "arquetipo", label: "ARQUÉTIPO" },
  { key: "status", label: "STATUS" },
  { key: "nivelAcesso", label: "NÍVEL DE ACESSO" },
  { key: "relacao", label: "RELAÇÃO" },
];

function displayCharacter(character: CharacterData) {
  return (
    character.nome ||
    characterLabels[character.id] ||
    character.id.toUpperCase()
  );
}

function displayNpcRealName(npc: NPCData) {
  return npc.nomeVerdadeiro || npc.nome || npc.id;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s,
    ).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GM() {
  const [session, setSession] = useState<SessionData>({ bloqueada: false });

  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [npcs, setNpcs] = useState<NPCData[]>([]);
  const [skillCards, setSkillCards] = useState<SkillCardData[]>([]);
  const [pendencias, setPendencias] = useState<PendingData[]>([]);
  const [alerta, setAlerta] = useState<AlertData>({
    ativo: false,
    porcentagem: 0,
    disparo: 0,
  });

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const [actionModal, setActionModal] = useState<
    null | "cards" | "npcs" | "evidencias" | "eventos"
  >(null);

  const [releaseMode, setReleaseMode] = useState<"individual" | "massa">(
    "individual",
  );

  const [npcOperationType, setNpcOperationType] = useState<"npc" | "info">(
    "npc",
  );

  const [releaseAction, setReleaseAction] = useState<"liberar" | "bloquear">(
    "liberar",
  );

  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [npcInfoField, setNpcInfoField] =
    useState<keyof NPCInfoAccess>("nome");

  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingObservation, setPendingObservation] = useState("");
  const [pendingReminder, setPendingReminder] = useState("");
  const [pendingDuration, setPendingDuration] = useState("");

  const activeCharacters = useMemo(
    () => characters.filter((character) => character.ativo === true),
    [characters],
  );

  const selectedCharacter = useMemo(
    () =>
      activeCharacters.find(
        (character) => character.id === selectedCharacterId,
      ) || null,
    [activeCharacters, selectedCharacterId],
  );

  const selectedNpc = useMemo(
    () => npcs.find((npc) => npc.id === selectedNpcId) || null,
    [npcs, selectedNpcId],
  );

  const selectedCharacterCards = useMemo(() => {
    if (!selectedCharacter?.skillCards) return [];

    return Object.values(selectedCharacter.skillCards)
      .filter(Boolean)
      .map((id) => skillCards.find((card) => card.id === id))
      .filter(Boolean) as SkillCardData[];
  }, [selectedCharacter, skillCards]);

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  /*
   * ============================================================
   * SINCRONIZAÇÃO DO PAINEL
   *
   * Os estados dos personagens, NPCs e pendências podem ser
   * observados em tempo real para o painel do GM.
   *
   * A LIBERAÇÃO das Skill Cards, entretanto, é uma escrita
   * explícita no documento do personagem; não depende de
   * onSnapshot para executar a operação.
   * ============================================================
   */

  useEffect(() => {
    const unsubSession = onSnapshot(
      doc(db, "game", "session"),
      (snapshot) => {
        setSession({
          bloqueada: snapshot.exists()
            ? Boolean(snapshot.data().bloqueada)
            : false,
        });
      },
    );

    const unsubAlerta = onSnapshot(
      doc(db, "game", "alert"),
      (snapshot) => {
        if (!snapshot.exists()) {
          setAlerta({ ativo: false, porcentagem: 0, disparo: 0 });
          return;
        }

        const data = snapshot.data();
        setAlerta({
          ativo: data.ativo === true,
          porcentagem: Math.max(0, Math.min(100, Number(data.porcentagem) || 0)),
          disparo: Number(data.disparo) || 0,
        });
      },
      (error) => console.error("ERRO ALERTA:", error),
    );

    const unsubCharacters = onSnapshot(collection(db, "characters"), (snapshot) => {
      const list = snapshot.docs.map((item) => ({
        id: item.id,
        ...(item.data() as Omit<CharacterData, "id">),
      }));

      setCharacters(list);

      if (
        selectedCharacterId &&
        !list.some(
          (character) =>
            character.id === selectedCharacterId && character.ativo === true,
        )
      ) {
        setSelectedCharacterId(null);
      }
    });

    const unsubNPCs = onSnapshot(collection(db, "npcCards"), (snapshot) => {
      setNpcs(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<NPCData, "id">),
        })),
      );
    });

    const unsubPendencias = onSnapshot(
      collection(db, "game", "pendencias", "items"),
      (snapshot) => {
        setPendencias(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...(item.data() as Omit<PendingData, "id">),
            }))
            .sort(
              (a, b) =>
                (a.expiraEm || Infinity) - (b.expiraEm || Infinity),
            ),
        );
      },
    );

    // Catálogo de Skill Cards: carregamento pontual, não listener.
    getDocs(collection(db, "skillCards"))
      .then((snapshot) => {
        setSkillCards(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<SkillCardData, "id">),
          })),
        );
      })
      .catch((error) => console.error("ERRO SKILL CARDS:", error));

    return () => {
      unsubSession();
      unsubAlerta();
      unsubCharacters();
      unsubNPCs();
      unsubPendencias();
    };
  }, [selectedCharacterId]);

  /*
   * ============================================================
   * SESSÃO
   * ============================================================
   */

  const toggleSessionLock = async () => {
    if (loading) return;

    try {
      await setDoc(
        doc(db, "game", "session"),
        { bloqueada: !session.bloqueada },
        { merge: true },
      );

      showMessage(
        session.bloqueada
          ? "Sessão desbloqueada."
          : "Sessão bloqueada. Alterações dos jogadores devem ficar desabilitadas.",
      );
    } catch (error) {
      console.error(error);
      showMessage("Erro ao alterar o bloqueio da sessão.");
    }
  };

  /*
   * ============================================================
   * OPERAÇÕES DE LIBERAÇÃO / BLOQUEIO
   * ============================================================
   */

  const openActionModal = (
    action: "cards" | "npcs" | "evidencias" | "eventos",
  ) => {
    if ((action === "cards" || action === "npcs") && !selectedCharacterId) {
      showMessage("Selecione um personagem alvo primeiro.");
      return;
    }

    setActionModal(action);

    if (action === "cards") {
      setReleaseMode("individual");
      setReleaseAction("liberar");
      setSelectedTier(1);
      setSelectedCardId(null);
    }

    if (action === "npcs") {
      setReleaseMode("individual");
      setNpcOperationType("npc");
      setReleaseAction("liberar");
      setSelectedNpcId(null);
      setNpcInfoField("nome");
    }
  };

  const closeActionModal = () => {
    if (loading) return;
    setActionModal(null);
  };

  /*
   * SKILL CARDS
   *
   * Individual = uma Skill Card específica.
   * Massa = Tier específico ou todos os Tiers.
   */
  const applySkillCardOperation = async () => {
    if (!selectedCharacterId || loading) {
      showMessage("Selecione um personagem alvo.");
      return;
    }

    try {
      setLoading(true);

      const characterRef = doc(db, "characters", selectedCharacterId);
      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedCardId) {
          showMessage("Selecione uma Skill Card.");
          return;
        }

        const card = skillCards.find((item) => item.id === selectedCardId);

        if (!card) {
          showMessage("Skill Card não encontrada.");
          return;
        }

        const tier = card.tier as 1 | 2 | 3 | undefined;

        if (!tier) {
          showMessage("Essa Skill Card não possui Tier definido.");
          return;
        }

        await updateDoc(characterRef, {
          [`skillCardTiers.tier${tier}`]: value,
        });

        showMessage(
          `${value ? "Liberado" : "Bloqueado"}: ${card.nome || card.id}.`,
        );
      } else {
        if (selectedTier === 1 || selectedTier === 2 || selectedTier === 3) {
          await updateDoc(characterRef, {
            [`skillCardTiers.tier${selectedTier}`]: value,
          });

          showMessage(
            `Tier ${selectedTier} ${
              value ? "liberado" : "bloqueado"
            } para ${displayCharacter(selectedCharacter!)}.`,
          );
        }
      }
    } catch (error) {
      console.error("ERRO SKILL CARD:", error);
      showMessage("Não foi possível alterar a liberação da Skill Card.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * NPCs
   *
   * O acesso é gravado SOMENTE em:
   * characters/{characterId}/npcAccess/{npcId}
   *
   * Isso evita alterar o catálogo global npcCards e garante
   * que a liberação seja específica para cada personagem.
   */
  const getNpcAccessRef = (characterId: string, npcId: string) =>
    doc(db, "characters", characterId, "npcAccess", npcId);

  const applyNpcOperation = async () => {
    if (!selectedCharacterId || loading) {
      showMessage("Selecione um personagem alvo.");
      return;
    }

    try {
      setLoading(true);

      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedNpcId) {
          showMessage("Selecione um NPC.");
          return;
        }

        await setDoc(
          getNpcAccessRef(selectedCharacterId, selectedNpcId),
          { descoberto: value },
          { merge: true },
        );

        const npc = npcs.find((item) => item.id === selectedNpcId);

        showMessage(
          `${npc ? displayNpcRealName(npc) : "NPC"} ${
            value ? "liberado" : "bloqueado"
          }.`,
        );
      } else {
        if (npcs.length === 0) {
          showMessage("Nenhum NPC cadastrado.");
          return;
        }

        await Promise.all(
          npcs.map((npc) =>
            setDoc(
              getNpcAccessRef(selectedCharacterId, npc.id),
              { descoberto: value },
              { merge: true },
            ),
          ),
        );

        showMessage(
          `${npcs.length} NPCs ${
            value ? "liberados" : "bloqueados"
          } para ${displayCharacter(selectedCharacter!)}.`,
        );
      }
    } catch (error) {
      console.error("ERRO NPC:", error);
      showMessage(
        "Não foi possível alterar a liberação do NPC. Verifique a conexão com o Firebase.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * INFOS DE NPC
   *
   * Individual = uma informação de um NPC.
   * Massa = uma informação em TODOS os NPCs.
   */
  const applyNpcInfoOperation = async () => {
    if (!selectedCharacterId || loading) {
      showMessage("Selecione um personagem alvo.");
      return;
    }

    try {
      setLoading(true);

      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedNpcId) {
          showMessage("Selecione um NPC.");
          return;
        }

        await setDoc(
          getNpcAccessRef(selectedCharacterId, selectedNpcId),
          {
            informacoes: {
              [npcInfoField]: value,
            },
          },
          { merge: true },
        );

        const npc = npcs.find((item) => item.id === selectedNpcId);

        showMessage(
          `${npc ? displayNpcRealName(npc) : "NPC"} — ${
            npcInfoFields.find((field) => field.key === npcInfoField)?.label
          } ${value ? "liberado" : "bloqueado"}.`,
        );
      } else {
        if (npcs.length === 0) {
          showMessage("Nenhum NPC cadastrado.");
          return;
        }

        await Promise.all(
          npcs.map((npc) =>
            setDoc(
              getNpcAccessRef(selectedCharacterId, npc.id),
              {
                informacoes: {
                  [npcInfoField]: value,
                },
              },
              { merge: true },
            ),
          ),
        );

        showMessage(
          `${npcInfoFields.find((field) => field.key === npcInfoField)?.label} ${
            value ? "liberado" : "bloqueado"
          } para todos os NPCs.`,
        );
      }
    } catch (error) {
      console.error("ERRO INFO NPC:", error);
      showMessage(
        "Não foi possível alterar a informação do NPC.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * EVENTO — ESCOLHA DE CLASSE
   * ============================================================
   */

  const applyClassEventOperation = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedCharacterId) {
          showMessage("Selecione um personagem alvo.");
          return;
        }

        const character = characters.find((item) => item.id === selectedCharacterId);
        if (!character) {
          showMessage("Personagem não encontrado.");
          return;
        }

        if (value && character.classe) {
          showMessage(`${displayCharacter(character)} já possui a classe ${character.classe}.`);
          return;
        }

        await updateDoc(doc(db, "characters", selectedCharacterId), {
          eventoClasseLiberado: value,
        });

        showMessage(
          value
            ? `Escolha de classe liberada para ${displayCharacter(character)}.`
            : `Escolha de classe bloqueada para ${displayCharacter(character)}.`,
        );
        return;
      }

      if (activeCharacters.length === 0) {
        showMessage("Nenhum personagem ativo.");
        return;
      }

      const charactersToUpdate = value
        ? activeCharacters.filter((character) => !character.classe)
        : activeCharacters;

      if (charactersToUpdate.length === 0) {
        showMessage("Todos os personagens ativos já possuem uma classe.");
        return;
      }

      await Promise.all(
        charactersToUpdate.map((character) =>
          updateDoc(doc(db, "characters", character.id), {
            eventoClasseLiberado: value,
          }),
        ),
      );

      showMessage(
        value
          ? `Escolha de classe liberada para ${charactersToUpdate.length} personagem(ns).`
          : `Escolha de classe bloqueada para ${charactersToUpdate.length} personagem(ns).`,
      );
    } catch (error) {
      console.error("ERRO EVENTO DE CLASSE:", error);
      showMessage("Não foi possível alterar o evento de escolha de classe.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * EVENTO — BARRA DE ALERTA
   * ============================================================
   */

  const iniciarAlerta = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await setDoc(
        doc(db, "game", "alert"),
        { ativo: true, porcentagem: 0 },
        { merge: true },
      );
      showMessage("Barra de alerta iniciada.");
    } catch (error) {
      console.error("ERRO AO INICIAR ALERTA:", error);
      showMessage("Não foi possível iniciar a barra de alerta.");
    } finally {
      setLoading(false);
    }
  };

  const encerrarAlerta = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await setDoc(
        doc(db, "game", "alert"),
        { ativo: false, porcentagem: 0 },
        { merge: true },
      );
      showMessage("Barra de alerta encerrada.");
    } catch (error) {
      console.error("ERRO AO ENCERRAR ALERTA:", error);
      showMessage("Não foi possível encerrar a barra de alerta.");
    } finally {
      setLoading(false);
    }
  };

  const alterarAlerta = async (delta: number) => {
    if (loading || !alerta.ativo) return;

    const atual = Math.max(0, Math.min(100, Number(alerta.porcentagem) || 0));
    const proximo = Math.max(0, Math.min(100, atual + delta));

    if (proximo === atual) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, "game", "alert"), {
        porcentagem: proximo,
      });
    } catch (error) {
      console.error("ERRO AO ALTERAR ALERTA:", error);
      showMessage("Não foi possível alterar a barra de alerta.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * PENDÊNCIAS
   * ============================================================
   */

  const openPendingModal = (skillName?: string, characterId?: string) => {
    if (characterId) setSelectedCharacterId(characterId);

    setPendingTitle(skillName || "");
    setPendingObservation("");
    setPendingReminder("");
    setPendingDuration("");
    setPendingModalVisible(true);
  };

  const createPending = async () => {
    if (!selectedCharacterId) {
      showMessage("Selecione um personagem ativo.");
      return;
    }

    if (!pendingTitle.trim()) {
      showMessage("Dê um nome para a pendência.");
      return;
    }

    const seconds = Number(pendingDuration.replace(",", "."));

    if (
      pendingDuration.trim() &&
      (!Number.isFinite(seconds) || seconds <= 0)
    ) {
      showMessage("A duração precisa ser um número em segundos.");
      return;
    }

    try {
      setLoading(true);

      const now = Date.now();
      const expiresAt =
        pendingDuration.trim() && Number.isFinite(seconds)
          ? now + seconds * 1000
          : null;

      const pendingRef = doc(
        collection(db, "game", "pendencias", "items"),
      );

      await setDoc(pendingRef, {
        characterId: selectedCharacterId,
        characterName: displayCharacter(selectedCharacter!),
        titulo: pendingTitle.trim(),
        habilidade: pendingTitle.trim(),
        observacao: pendingObservation.trim(),
        lembrete: pendingReminder.trim(),
        criadoEm: now,
        expiraEm: expiresAt,
        concluida: false,
      });

      setPendingModalVisible(false);
      showMessage("Pendência criada.");
    } catch (error) {
      console.error(error);
      showMessage("Erro ao criar pendência.");
    } finally {
      setLoading(false);
    }
  };

  const completePending = async (id: string) => {
    try {
      await updateDoc(doc(db, "game", "pendencias", "items", id), {
        concluida: true,
      });
    } catch (error) {
      console.error(error);
      showMessage("Erro ao concluir pendência.");
    }
  };

  const deletePending = async (id: string) => {
    try {
      await deleteDoc(doc(db, "game", "pendencias", "items", id));
    } catch (error) {
      console.error(error);
      showMessage("Erro ao excluir pendência.");
    }
  };

  /*
   * ============================================================
   * RESET
   * ============================================================
   */

  const deleteSubcollection = async (
    characterId: string,
    subcollectionName: string,
  ) => {
    const snapshot = await getDocs(
      collection(db, "characters", characterId, subcollectionName),
    );

    for (const item of snapshot.docs) {
      await deleteDoc(item.ref);
    }
  };

  const resetCharacters = async () => {
    for (const [characterId, defaults] of Object.entries(characterDefaults)) {
      await setDoc(doc(db, "characters", characterId), {
        ...defaults,
        ativo: false,
        classe: null,
        eventoClasseLiberado: false,
      });

      await deleteSubcollection(characterId, "inventory");
      await deleteSubcollection(characterId, "npcAccess");
      await deleteSubcollection(characterId, "npcNotes");
    }
  };

  const resetNPCs = async () => {
    const current = await getDocs(collection(db, "npcCards"));

    for (const item of current.docs) {
      await deleteDoc(item.ref);
    }

    for (const [npcId, npcData] of Object.entries(npcDefaults)) {
      await setDoc(doc(db, "npcCards", npcId), npcData);
    }
  };

  const resetPendencias = async () => {
    const current = await getDocs(
      collection(db, "game", "pendencias", "items"),
    );

    for (const item of current.docs) {
      await deleteDoc(item.ref);
    }
  };

  const resetSystem = async () => {
    if (loading) return;

    try {
      setLoading(true);

      await resetCharacters();
      await resetNPCs();
      await resetPendencias();

      await setDoc(
        doc(db, "game", "session"),
        { bloqueada: false },
        { merge: true },
      );

      await AsyncStorage.removeItem("selectedCharacter");

      if (Platform.OS === "web") {
        try {
          window.localStorage.removeItem("selectedCharacter");
        } catch {}
      }

      showMessage("Sistema completamente reiniciado.");

      await new Promise((resolve) => setTimeout(resolve, 400));
      router.replace("/");
    } catch (error) {
      console.error("ERRO NO RESET:", error);
      showMessage("Erro ao resetar o sistema.");
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = () => {
    if (loading) return;

    Alert.alert(
      "RESETAR SISTEMA",
      "Isso restaura personagens, inventários, NPCs, acessos individuais, notas, pendências e sessão.",
      [
        { text: "CANCELAR", style: "cancel" },
        {
          text: "RESETAR",
          style: "destructive",
          onPress: resetSystem,
        },
      ],
    );
  };

  const selectedCharacterLabel = selectedCharacter
    ? displayCharacter(selectedCharacter)
    : "NENHUM PERSONAGEM";

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ANIQUILAÇÃO // MESTRE</Text>
          <Text style={styles.title}>CONTROLE</Text>
        </View>

        {/* SESSÃO */}
        <View
          style={[
            styles.sessionCard,
            session.bloqueada && styles.sessionCardLocked,
          ]}
        >
          <View style={styles.sessionMain}>
            <View
              style={[
                styles.sessionDot,
                session.bloqueada
                  ? styles.sessionDotLocked
                  : styles.sessionDotOpen,
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>
                {session.bloqueada ? "SESSÃO BLOQUEADA" : "SESSÃO ABERTA"}
              </Text>
              <Text style={styles.sessionSubtitle}>
                {session.bloqueada
                  ? "ALTERAÇÕES DOS JOGADORES DESABILITADAS"
                  : "SISTEMA OPERACIONAL"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={toggleSessionLock}
            disabled={loading}
            style={styles.sessionButton}
          >
            <Text style={styles.sessionButtonText}>
              {session.bloqueada ? "DESBLOQUEAR" : "BLOQUEAR"}
            </Text>
          </Pressable>
        </View>

        {/* PENDÊNCIAS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.kicker}>MESTRE</Text>
              <Text style={styles.sectionTitle}>PENDÊNCIAS</Text>
            </View>
            <Text style={styles.counter}>
              {pendencias.filter((item) => !item.concluida).length}
            </Text>
          </View>

          {pendencias.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>NENHUMA PENDÊNCIA ATIVA</Text>
            </View>
          ) : (
            pendencias.map((pending) => (
              <PendingCard
                key={pending.id}
                pending={pending}
                onComplete={() => completePending(pending.id)}
                onDelete={() => deletePending(pending.id)}
              />
            ))
          )}

          <Pressable
            onPress={() => openPendingModal()}
            disabled={!selectedCharacterId || loading}
            style={[
              styles.secondaryButton,
              (!selectedCharacterId || loading) && styles.disabled,
            ]}
          >
            <Text style={styles.secondaryButtonText}>
              + NOVA PENDÊNCIA PARA {selectedCharacterLabel}
            </Text>
          </Pressable>
        </View>

        {/* QUATRO OPERAÇÕES PRINCIPAIS */}
        <View style={styles.section}>
          <Text style={styles.kicker}>CONTROLE DO JOGO</Text>
          <Text style={styles.sectionTitle}>OPERAÇÕES</Text>

          <View style={styles.bigActionGrid}>
            <BigActionButton
              title="SKILL CARDS"
              subtitle="LIBERAÇÕES E BLOQUEIOS"
              onPress={() => openActionModal("cards")}
              disabled={!selectedCharacterId}
            />

            <BigActionButton
              title="NPCs E INFOS"
              subtitle="NPCs · NOME · STATUS · ACESSO"
              onPress={() => openActionModal("npcs")}
              disabled={!selectedCharacterId}
            />

            <BigActionButton
              title="EVIDÊNCIAS"
              subtitle="LIBERAÇÕES DE EVIDÊNCIAS"
              onPress={() => openActionModal("evidencias")}
            />

            <BigActionButton
              title="EVENTOS"
              subtitle="CONTROLE DE EVENTOS"
              onPress={() => openActionModal("eventos")}
            />
          </View>
        </View>

        {/* PERSONAGEM ALVO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.kicker}>ALVO DAS OPERAÇÕES</Text>
              <Text style={styles.sectionTitle}>PERSONAGEM</Text>
            </View>
            <Text style={styles.counter}>{activeCharacters.length} ATIVOS</Text>
          </View>

          {activeCharacters.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>NENHUM PERSONAGEM ATIVO</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playerList}
            >
              {activeCharacters.map((character) => {
                const selected = character.id === selectedCharacterId;

                return (
                  <Pressable
                    key={character.id}
                    onPress={() => setSelectedCharacterId(character.id)}
                    style={[
                      styles.playerCard,
                      selected && styles.playerCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.playerDot,
                        selected && styles.playerDotSelected,
                      ]}
                    />
                    <Text style={styles.playerName}>
                      {displayCharacter(character)}
                    </Text>
                    <Text style={styles.playerRace}>
                      {character.raca || character.id}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.targetBar}>
            <Text style={styles.targetLabel}>ALVO ATUAL</Text>
            <Text style={styles.targetValue}>{selectedCharacterLabel}</Text>
          </View>
        </View>

        {/* MONITORAMENTO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.kicker}>MONITORAMENTO</Text>
              <Text style={styles.sectionTitle}>HABILIDADES ATIVAS</Text>
            </View>
          </View>

          {activeCharacters.map((character) => {
            const selectedCards = Object.values(
              character.skillCards || {},
            ).filter(Boolean);

            return (
              <View key={character.id} style={styles.monitorCard}>
                <View style={styles.monitorHeader}>
                  <View>
                    <Text style={styles.monitorName}>
                      {displayCharacter(character)}
                    </Text>
                    <Text style={styles.monitorSub}>
                      {character.raca || character.id}
                    </Text>
                  </View>

                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ATIVO</Text>
                  </View>
                </View>

                {selectedCards.length === 0 &&
                !character.efeitosAtivos?.trim() &&
                !character.modificacoes?.trim() ? (
                  <Text style={styles.mutedText}>
                    Nenhuma habilidade/alteração registrada.
                  </Text>
                ) : null}

                {selectedCards.map((cardId) => {
                  const card = skillCards.find((item) => item.id === cardId);

                  return (
                    <View key={String(cardId)} style={styles.effectRow}>
                      <View style={styles.effectMain}>
                        <Text style={styles.effectTitle}>
                          {card?.nome || String(cardId)}
                        </Text>
                        <Text style={styles.effectSub}>
                          SKILL CARD ATIVA
                        </Text>
                      </View>

                      <Pressable
                        onPress={() =>
                          openPendingModal(
                            card?.nome || String(cardId),
                            character.id,
                          )
                        }
                        style={styles.smallButton}
                      >
                        <Text style={styles.smallButtonText}>
                          + PENDÊNCIA
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}

                {character.efeitosAtivos?.trim() ? (
                  <View style={styles.manualBlock}>
                    <Text style={styles.manualLabel}>EFEITOS ATIVOS</Text>
                    <Text style={styles.manualText}>
                      {character.efeitosAtivos}
                    </Text>
                  </View>
                ) : null}

                {character.modificacoes?.trim() ? (
                  <View style={styles.manualBlock}>
                    <Text style={styles.manualLabel}>MODIFICAÇÕES</Text>
                    <Text style={styles.manualText}>
                      {character.modificacoes}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ESTADO */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.kicker}>DEBUG</Text>
              <Text style={styles.sectionTitle}>ESTADO DO SISTEMA</Text>
            </View>
          </View>

          <View style={styles.debugGrid}>
            <DebugCell value={activeCharacters.length} label="ATIVOS" />
            <DebugCell value={npcs.length} label="NPCs" />
            <DebugCell value={skillCards.length} label="SKILL CARDS" />
            <DebugCell
              value={pendencias.filter((item) => !item.concluida).length}
              label="PENDÊNCIAS"
            />
          </View>
        </View>

        {/* RESET / EXIT */}
        <View style={styles.dangerSection}>
          <Text style={styles.kicker}>SISTEMA</Text>
          <Text style={styles.sectionTitle}>RESET</Text>

          <Pressable
            onPress={confirmReset}
            disabled={loading}
            style={[styles.resetButton, loading && styles.disabled]}
          >
            <Text style={styles.resetTitle}>RESETAR SISTEMA COMPLETO</Text>
            <Text style={styles.resetSubtitle}>
              PERSONAGENS · INVENTÁRIOS · NPCs · ACESSOS · NOTAS · PENDÊNCIAS
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => router.replace("/")} style={styles.exitButton}>
          <Text style={styles.exitText}>SAIR DO MENU DO MESTRE</Text>
        </Pressable>
      </ScrollView>

      {/* MODAL DAS OPERAÇÕES */}
      <Modal
        visible={actionModal !== null}
        transparent
        animationType="slide"
        onRequestClose={closeActionModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.operationModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalKicker}>CONTROLE DO MESTRE</Text>
                <Text style={styles.modalTitle}>
                  {actionModal === "cards"
                    ? "SKILL CARDS"
                    : actionModal === "npcs"
                      ? "NPCs E INFOS"
                      : actionModal === "evidencias"
                        ? "EVIDÊNCIAS"
                        : "EVENTOS"}
                </Text>
              </View>

              <Pressable
                onPress={closeActionModal}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              {(actionModal === "cards" || actionModal === "npcs") && (
                <>
                  <Text style={styles.modalSectionTitle}>
                    PERSONAGEM ALVO
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.modalPlayerList}
                  >
                    {activeCharacters.map((character) => {
                      const selected = character.id === selectedCharacterId;

                      return (
                        <Pressable
                          key={character.id}
                          onPress={() =>
                            setSelectedCharacterId(character.id)
                          }
                          style={[
                            styles.modalPlayer,
                            selected && styles.modalPlayerSelected,
                          ]}
                        >
                          <Text style={styles.modalPlayerName}>
                            {displayCharacter(character)}
                          </Text>
                          <Text style={styles.modalPlayerRace}>
                            {character.raca || character.id}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.modalTarget}>
                    <Text style={styles.modalTargetLabel}>ALVO</Text>
                    <Text style={styles.modalTargetValue}>
                      {selectedCharacterLabel}
                    </Text>
                  </View>
                </>
              )}

              {actionModal === "cards" && (
                <>
                  <Text style={styles.modalSectionTitle}>AÇÃO</Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="LIBERAR"
                      selected={releaseAction === "liberar"}
                      onPress={() => setReleaseAction("liberar")}
                    />
                    <SegmentButton
                      title="BLOQUEAR"
                      selected={releaseAction === "bloquear"}
                      onPress={() => setReleaseAction("bloquear")}
                    />
                  </View>

                  <Text style={styles.modalSectionTitle}>ESCOPO</Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="INDIVIDUAL"
                      selected={releaseMode === "individual"}
                      onPress={() => setReleaseMode("individual")}
                    />
                    <SegmentButton
                      title="EM MASSA"
                      selected={releaseMode === "massa"}
                      onPress={() => setReleaseMode("massa")}
                    />
                  </View>

                  {releaseMode === "individual" ? (
                    <>
                      <Text style={styles.modalSectionTitle}>
                        SKILL CARD
                      </Text>

                      {skillCards
                        .filter((card) => {
                          if (!selectedCharacter) return false;
                          if (!card.personagem) return true;

                          const values = [
                            selectedCharacter.id,
                            selectedCharacter.raca,
                            displayCharacter(selectedCharacter),
                          ]
                            .filter(Boolean)
                            .map((value) => String(value).toLowerCase());

                          return values.includes(
                            String(card.personagem).toLowerCase(),
                          );
                        })
                        .sort((a, b) => (a.tier || 0) - (b.tier || 0))
                        .map((card) => (
                          <Pressable
                            key={card.id}
                            onPress={() => setSelectedCardId(card.id)}
                            style={[
                              styles.selectionRow,
                              selectedCardId === card.id &&
                                styles.selectionRowSelected,
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.selectionTitle}>
                                {card.nome || card.id}
                              </Text>
                              <Text style={styles.selectionSub}>
                                TIER {card.tier || "—"}
                              </Text>
                            </View>
                            <Text style={styles.selectionMark}>
                              {selectedCardId === card.id ? "●" : "○"}
                            </Text>
                          </Pressable>
                        ))}
                    </>
                  ) : (
                    <>
                      <Text style={styles.modalSectionTitle}>
                        O QUE ALTERAR EM MASSA?
                      </Text>

                      <View style={styles.segmentColumn}>
                        {[1, 2, 3].map((tier) => (
                          <Pressable
                            key={tier}
                            onPress={() =>
                              setSelectedTier(tier as 1 | 2 | 3)
                            }
                            style={[
                              styles.largeChoice,
                              selectedTier === tier &&
                                styles.largeChoiceSelected,
                            ]}
                          >
                            <Text style={styles.largeChoiceTitle}>
                              TIER {tier}
                            </Text>
                            <Text style={styles.largeChoiceSub}>
                              {selectedTier === tier
                                ? "SELECIONADO"
                                : "ALTERAR ESTE TIER"}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}

                  <Pressable
                    onPress={applySkillCardOperation}
                    disabled={loading || !selectedCharacterId}
                    style={[
                      styles.modalExecute,
                      (!selectedCharacterId || loading) &&
                        styles.disabled,
                    ]}
                  >
                    <Text style={styles.modalExecuteText}>
                      {releaseAction === "liberar"
                        ? "LIBERAR"
                        : "BLOQUEAR"}{" "}
                      {releaseMode === "individual"
                        ? "SKILL CARD"
                        : `TIER ${selectedTier}`}
                    </Text>
                  </Pressable>
                </>
              )}

              {actionModal === "npcs" && (
                <>
                  <Text style={styles.modalSectionTitle}>
                    O QUE VOCÊ QUER CONTROLAR?
                  </Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="NPC"
                      selected={npcOperationType === "npc"}
                      onPress={() => {
                        setNpcOperationType("npc");
                        setSelectedNpcId(null);
                      }}
                    />
                    <SegmentButton
                      title="INFORMAÇÃO"
                      selected={npcOperationType === "info"}
                      onPress={() => {
                        setNpcOperationType("info");
                        setSelectedNpcId(null);
                      }}
                    />
                  </View>

                  <Text style={styles.modalSectionTitle}>AÇÃO</Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="LIBERAR"
                      selected={releaseAction === "liberar"}
                      onPress={() => setReleaseAction("liberar")}
                    />
                    <SegmentButton
                      title="BLOQUEAR"
                      selected={releaseAction === "bloquear"}
                      onPress={() => setReleaseAction("bloquear")}
                    />
                  </View>

                  <Text style={styles.modalSectionTitle}>ESCOPO</Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="INDIVIDUAL"
                      selected={releaseMode === "individual"}
                      onPress={() => {
                        setReleaseMode("individual");
                        setSelectedNpcId(null);
                      }}
                    />
                    <SegmentButton
                      title="EM MASSA"
                      selected={releaseMode === "massa"}
                      onPress={() => setReleaseMode("massa")}
                    />
                  </View>

                  {npcOperationType === "npc" ? (
                    <>
                      {releaseMode === "individual" ? (
                        <>
                          <Text style={styles.modalSectionTitle}>
                            NPC ALVO
                          </Text>

                          {npcs.map((npc) => (
                            <Pressable
                              key={npc.id}
                              onPress={() => setSelectedNpcId(npc.id)}
                              style={[
                                styles.selectionRow,
                                selectedNpcId === npc.id &&
                                  styles.selectionRowSelected,
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.selectionTitle}>
                                  {displayNpcRealName(npc)}
                                </Text>
                                <Text style={styles.selectionSub}>
                                  {npc.classe || "SEM CLASSE"} · NÍVEL DE
                                  ACESSO {npc.nivelAcesso ?? "—"}
                                </Text>
                              </View>

                              <Text style={styles.selectionMark}>
                                {selectedNpcId === npc.id ? "●" : "○"}
                              </Text>
                            </Pressable>
                          ))}
                        </>
                      ) : (
                        <View style={styles.largeChoiceSelected}>
                          <Text style={styles.largeChoiceTitle}>
                            TODOS OS NPCs
                          </Text>
                          <Text style={styles.largeChoiceSub}>
                            A operação será aplicada a todos os NPCs deste
                            personagem.
                          </Text>
                        </View>
                      )}

                      <Pressable
                        onPress={applyNpcOperation}
                        disabled={
                          loading ||
                          !selectedCharacterId ||
                          (releaseMode === "individual" && !selectedNpcId)
                        }
                        style={[
                          styles.modalExecute,
                          (loading ||
                            !selectedCharacterId ||
                            (releaseMode === "individual" &&
                              !selectedNpcId)) &&
                            styles.disabled,
                        ]}
                      >
                        <Text style={styles.modalExecuteText}>
                          {releaseAction === "liberar"
                            ? "LIBERAR NPC"
                            : "BLOQUEAR NPC"}
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Text style={styles.modalSectionTitle}>
                        QUAL INFORMAÇÃO?
                      </Text>

                      {npcInfoFields.map((field) => (
                        <Pressable
                          key={field.key}
                          onPress={() => setNpcInfoField(field.key)}
                          style={[
                            styles.selectionRow,
                            npcInfoField === field.key &&
                              styles.selectionRowSelected,
                          ]}
                        >
                          <Text style={styles.selectionTitle}>
                            {field.label}
                          </Text>

                          <Text style={styles.selectionMark}>
                            {npcInfoField === field.key ? "●" : "○"}
                          </Text>
                        </Pressable>
                      ))}

                      {releaseMode === "individual" && (
                        <>
                          <Text style={styles.modalSectionTitle}>
                            NPC ALVO
                          </Text>

                          {npcs.map((npc) => (
                            <Pressable
                              key={npc.id}
                              onPress={() => setSelectedNpcId(npc.id)}
                              style={[
                                styles.selectionRow,
                                selectedNpcId === npc.id &&
                                  styles.selectionRowSelected,
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.selectionTitle}>
                                  {displayNpcRealName(npc)}
                                </Text>
                                <Text style={styles.selectionSub}>
                                  {npc.classe || "SEM CLASSE"} · NÍVEL DE
                                  ACESSO {npc.nivelAcesso ?? "—"}
                                </Text>
                              </View>

                              <Text style={styles.selectionMark}>
                                {selectedNpcId === npc.id ? "●" : "○"}
                              </Text>
                            </Pressable>
                          ))}
                        </>
                      )}

                      {releaseMode === "massa" && (
                        <View style={styles.largeChoiceSelected}>
                          <Text style={styles.largeChoiceTitle}>
                            TODOS OS NPCs
                          </Text>
                          <Text style={styles.largeChoiceSub}>
                            A informação será liberada/bloqueada em todos os
                            NPCs deste personagem.
                          </Text>
                        </View>
                      )}

                      <Pressable
                        onPress={applyNpcInfoOperation}
                        disabled={
                          loading ||
                          !selectedCharacterId ||
                          (releaseMode === "individual" && !selectedNpcId)
                        }
                        style={[
                          styles.modalExecute,
                          (loading ||
                            !selectedCharacterId ||
                            (releaseMode === "individual" &&
                              !selectedNpcId)) &&
                            styles.disabled,
                        ]}
                      >
                        <Text style={styles.modalExecuteText}>
                          {releaseAction === "liberar"
                            ? "LIBERAR INFORMAÇÃO"
                            : "BLOQUEAR INFORMAÇÃO"}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}

              {actionModal === "evidencias" && (
                <View style={styles.placeholderPanel}>
                  <Text style={styles.placeholderTitle}>
                    EVIDÊNCIAS
                  </Text>
                  <Text style={styles.placeholderText}>
                    O modal está preparado para o sistema de liberação de
                    Evidências. A coleção e a estrutura de dados ainda não
                    foram definidas neste projeto.
                  </Text>
                </View>
              )}

              {actionModal === "eventos" && (
                <>
                  <Text style={styles.modalSectionTitle}>EVENTOS DISPONÍVEIS</Text>

                  <Pressable
                    onPress={() => {
                      // A seleção abaixo define qual evento está sendo controlado.
                    }}
                    style={styles.eventChoiceSelected}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.largeChoiceTitle}>BARRA DE ALERTA</Text>
                      <Text style={styles.largeChoiceSub}>
                        Controle manual do progresso do alerta transmitido aos jogadores.
                      </Text>
                    </View>
                    <Text style={styles.eventChoiceMark}>●</Text>
                  </Pressable>

                  <View style={styles.alertPanel}>
                    <View style={styles.alertPanelHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertPanelLabel}>STATUS DO EVENTO</Text>
                        <Text style={styles.alertPanelStatus}>
                          {alerta.ativo ? "ATIVO" : "INATIVO"}
                        </Text>
                      </View>
                      <Text style={styles.alertPanelPercent}>{alerta.porcentagem}%</Text>
                    </View>

                    <View style={styles.alertTrack}>
                      <View style={[styles.alertFill, { width: `${alerta.porcentagem}%` }]} />
                    </View>

                    <View style={styles.alertControlRow}>
                      <Pressable
                        onPress={() => alterarAlerta(-10)}
                        disabled={loading || !alerta.ativo || alerta.porcentagem <= 0}
                        style={[styles.alertControlButton, (loading || !alerta.ativo || alerta.porcentagem <= 0) && styles.disabled]}
                      >
                        <Text style={styles.alertControlSymbol}>−</Text>
                        <Text style={styles.alertControlLabel}>10%</Text>
                      </Pressable>

                      <View style={styles.alertValueBox}>
                        <Text style={styles.alertValue}>{alerta.porcentagem}%</Text>
                      </View>

                      <Pressable
                        onPress={() => alterarAlerta(10)}
                        disabled={loading || !alerta.ativo || alerta.porcentagem >= 100}
                        style={[styles.alertControlButton, (loading || !alerta.ativo || alerta.porcentagem >= 100) && styles.disabled]}
                      >
                        <Text style={styles.alertControlSymbol}>+</Text>
                        <Text style={styles.alertControlLabel}>10%</Text>
                      </Pressable>
                    </View>

                    <View style={styles.alertActionRow}>
                      <Pressable
                        onPress={iniciarAlerta}
                        disabled={loading || alerta.ativo}
                        style={[styles.modalPrimaryButton, (loading || alerta.ativo) && styles.disabled]}
                      >
                        <Text style={styles.modalPrimaryText}>INICIAR ALERTA</Text>
                      </Pressable>

                      <Pressable
                        onPress={encerrarAlerta}
                        disabled={loading || !alerta.ativo}
                        style={[styles.modalDangerButton, (loading || !alerta.ativo) && styles.disabled]}
                      >
                        <Text style={styles.modalDangerText}>ENCERRAR</Text>
                      </Pressable>
                    </View>
                  </View>

                  <Text style={styles.modalSectionTitle}>ESCOLHA DE CLASSE</Text>

                  <View style={styles.largeChoiceSelected}>
                    <Text style={styles.largeChoiceTitle}>ESCOLHA DE CLASSE</Text>
                    <Text style={styles.largeChoiceSub}>
                      Libera para o personagem o evento em que ele recuperará
                      suas memórias e escolherá uma classe.
                    </Text>
                  </View>

                  <Text style={styles.modalSectionTitle}>PERSONAGEM ALVO</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalPlayerList}>
                    {activeCharacters.map((character) => {
                      const selected = character.id === selectedCharacterId;
                      const hasClass = Boolean(character.classe);
                      const eventReleased = character.eventoClasseLiberado === true;

                      return (
                        <Pressable
                          key={character.id}
                          onPress={() => setSelectedCharacterId(character.id)}
                          style={[styles.modalPlayer, selected && styles.modalPlayerSelected]}
                        >
                          <Text style={styles.modalPlayerName}>{displayCharacter(character)}</Text>
                          <Text style={styles.modalPlayerRace}>{character.raca || character.id}</Text>
                          <Text style={styles.eventCharacterStatus}>
                            {hasClass ? `CLASSE: ${character.classe}` : eventReleased ? "ESCOLHA LIBERADA" : "BLOQUEADO"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.modalTarget}>
                    <Text style={styles.modalTargetLabel}>ALVO ATUAL</Text>
                    <Text style={styles.modalTargetValue}>{selectedCharacterLabel}</Text>
                  </View>

                  <Text style={styles.modalSectionTitle}>ESCOPO</Text>
                  <View style={styles.segmentRow}>
                    <SegmentButton title="INDIVIDUAL" selected={releaseMode === "individual"} onPress={() => setReleaseMode("individual")} />
                    <SegmentButton title="EM MASSA" selected={releaseMode === "massa"} onPress={() => setReleaseMode("massa")} />
                  </View>

                  <Text style={styles.modalSectionTitle}>AÇÃO</Text>
                  <View style={styles.segmentRow}>
                    <SegmentButton title="LIBERAR" selected={releaseAction === "liberar"} onPress={() => setReleaseAction("liberar")} />
                    <SegmentButton title="BLOQUEAR" selected={releaseAction === "bloquear"} onPress={() => setReleaseAction("bloquear")} />
                  </View>

                  <View style={styles.eventWarning}>
                    <Text style={styles.eventWarningText}>
                      O Mestre apenas libera o evento.
                      {"\n"}
                      A classe será escolhida pelo próprio jogador.
                    </Text>
                  </View>

                  <Pressable
                    onPress={applyClassEventOperation}
                    disabled={loading || (releaseMode === "individual" && !selectedCharacterId)}
                    style={[styles.modalExecute, (loading || (releaseMode === "individual" && !selectedCharacterId)) && styles.disabled]}
                  >
                    <Text style={styles.modalExecuteText}>
                      {releaseAction === "liberar" ? "LIBERAR ESCOLHA DE CLASSE" : "BLOQUEAR ESCOLHA DE CLASSE"}
                    </Text>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE PENDÊNCIA */}
      <Modal
        visible={pendingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.pendingModal}>
            <Text style={styles.modalKicker}>EFEITO / LEMBRETE</Text>
            <Text style={styles.modalTitle}>NOVA PENDÊNCIA</Text>

            <Text style={styles.inputLabel}>HABILIDADE / TÍTULO</Text>
            <TextInput
              value={pendingTitle}
              onChangeText={setPendingTitle}
              placeholder="Ex.: +3 Presença"
              placeholderTextColor="#444"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>OBSERVAÇÃO</Text>
            <TextInput
              value={pendingObservation}
              onChangeText={setPendingObservation}
              placeholder="O que precisa ser revertido?"
              placeholderTextColor="#444"
              multiline
              style={[styles.input, styles.multiline]}
            />

            <Text style={styles.inputLabel}>DURAÇÃO — SEGUNDOS</Text>
            <TextInput
              value={pendingDuration}
              onChangeText={setPendingDuration}
              placeholder="Ex.: 600"
              placeholderTextColor="#444"
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>REMINDER</Text>
            <TextInput
              value={pendingReminder}
              onChangeText={setPendingReminder}
              placeholder="Ex.: voltar Presença ao valor original"
              placeholderTextColor="#444"
              multiline
              style={[styles.input, styles.multiline]}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setPendingModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </Pressable>

              <Pressable
                onPress={createPending}
                disabled={loading}
                style={styles.modalConfirm}
              >
                <Text style={styles.modalConfirmText}>CRIAR</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

function BigActionButton({
  title,
  subtitle,
  onPress,
  disabled,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.bigActionButton, disabled && styles.disabled]}
    >
      <Text style={styles.bigActionTitle}>{title}</Text>
      <Text style={styles.bigActionSubtitle}>{subtitle}</Text>
      <Text style={styles.bigActionArrow}>›</Text>
    </Pressable>
  );
}

function SegmentButton({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        selected && styles.segmentButtonSelected,
      ]}
    >
      <Text
        style={[
          styles.segmentButtonText,
          selected && styles.segmentButtonTextSelected,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function PendingCard({
  pending,
  onComplete,
  onDelete,
}: {
  pending: PendingData;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    pending.expiraEm
      ? Math.max(0, Math.ceil((pending.expiraEm - Date.now()) / 1000))
      : 0,
  );

  useEffect(() => {
    if (!pending.expiraEm || pending.concluida) {
      setRemaining(0);
      return;
    }

    const update = () => {
      setRemaining(
        Math.max(0, Math.ceil((pending.expiraEm! - Date.now()) / 1000)),
      );
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [pending.expiraEm, pending.concluida]);

  const expired =
    Boolean(pending.expiraEm) && remaining <= 0 && !pending.concluida;

  return (
    <View
      style={[
        styles.pendingCard,
        pending.concluida && styles.pendingCompleted,
        expired && styles.pendingExpired,
      ]}
    >
      <View style={styles.pendingHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.pendingCharacter}>
            {pending.characterName || pending.characterId}
          </Text>
          <Text style={styles.pendingTitle}>
            {pending.titulo || pending.habilidade || "PENDÊNCIA"}
          </Text>
        </View>

        {pending.expiraEm && !pending.concluida ? (
          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>
              {expired ? "EXPIROU" : "RESTANTE"}
            </Text>
            <Text style={styles.countdownValue}>
              {formatTime(remaining)}
            </Text>
          </View>
        ) : (
          <Text style={styles.manualBadge}>
            {pending.concluida ? "CONCLUÍDA" : "MANUAL"}
          </Text>
        )}
      </View>

      {pending.observacao ? (
        <Text style={styles.pendingObservation}>{pending.observacao}</Text>
      ) : null}

      {pending.lembrete ? (
        <View style={styles.reminder}>
          <Text style={styles.reminderLabel}>REMINDER</Text>
          <Text style={styles.reminderText}>{pending.lembrete}</Text>
        </View>
      ) : null}

      {!pending.concluida && (
        <View style={styles.pendingActions}>
          <Pressable onPress={onComplete} style={styles.completeButton}>
            <Text style={styles.completeText}>CONCLUIR</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>EXCLUIR</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function DebugCell({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.debugCell}>
      <Text style={styles.debugValue}>{value}</Text>
      <Text style={styles.debugLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  content: {
    paddingTop: 38,
    paddingHorizontal: 18,
    paddingBottom: 130,
  },

  header: {
    marginBottom: 20,
  },

  eyebrow: {
    color: "#444",
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 7,
  },

  title: {
    color: "#eee",
    fontSize: 29,
    fontWeight: "300",
    letterSpacing: 4,
  },

  sessionCard: {
    borderWidth: 1,
    borderColor: "#252525",
    backgroundColor: "#090909",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  sessionCardLocked: {
    borderColor: "#5b3030",
  },

  sessionMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },

  sessionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
  },

  sessionDotOpen: {
    backgroundColor: "#788577",
  },

  sessionDotLocked: {
    backgroundColor: "#a14e4e",
  },

  sessionTitle: {
    color: "#ddd",
    fontSize: 12,
    letterSpacing: 1.4,
  },

  sessionSubtitle: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },

  sessionButton: {
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  sessionButtonText: {
    color: "#aaa",
    fontSize: 9,
    letterSpacing: 1.2,
  },

  section: {
    marginBottom: 27,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 11,
  },

  kicker: {
    color: "#4d4d4d",
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 5,
  },

  sectionTitle: {
    color: "#e4e4e4",
    fontSize: 17,
    letterSpacing: 2,
  },

  counter: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.2,
  },

  emptyBox: {
    borderWidth: 1,
    borderColor: "#181818",
    padding: 17,
  },

  emptyText: {
    color: "#444",
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.3,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#282828",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 9,
  },

  secondaryButtonText: {
    color: "#888",
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  disabled: {
    opacity: 0.35,
  },

  playerList: {
    gap: 8,
  },

  playerCard: {
    width: 145,
    minHeight: 70,
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#080808",
    padding: 11,
    justifyContent: "center",
  },

  playerCardSelected: {
    borderColor: "#777",
    backgroundColor: "#101010",
  },

  playerDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#333",
  },

  playerDotSelected: {
    backgroundColor: "#bbb",
  },

  playerName: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 1.2,
  },

  playerRace: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 5,
  },

  targetBar: {
    borderLeftWidth: 2,
    borderLeftColor: "#666",
    marginTop: 10,
    paddingLeft: 9,
  },

  targetLabel: {
    color: "#444",
    fontSize: 8,
    letterSpacing: 1.5,
  },

  targetValue: {
    color: "#bbb",
    fontSize: 9,
    letterSpacing: 1.1,
    marginTop: 3,
  },

  actionCard: {
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#080808",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  actionCardMain: {
    flex: 1,
  },

  actionCardTitle: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 1.4,
  },

  actionCardSubtitle: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 5,
  },

  actionArrow: {
    color: "#777",
    fontSize: 22,
    fontWeight: "200",
    marginLeft: 10,
  },

  monitorCard: {
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#080808",
    padding: 12,
    marginBottom: 8,
  },

  monitorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    marginBottom: 2,
  },

  monitorName: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 1.2,
  },

  monitorSub: {
    color: "#555",
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.8,
  },

  activeBadge: {
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  activeBadgeText: {
    color: "#777",
    fontSize: 8,
    letterSpacing: 1.2,
  },

  effectRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
    paddingVertical: 9,
  },

  effectMain: {
    flex: 1,
    paddingRight: 8,
  },

  effectTitle: {
    color: "#bbb",
    fontSize: 8,
    letterSpacing: 1,
  },

  effectSub: {
    color: "#4b4b4b",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 3,
  },

  smallButton: {
    borderWidth: 1,
    borderColor: "#292929",
    paddingVertical: 7,
    paddingHorizontal: 7,
  },

  smallButtonText: {
    color: "#777",
    fontSize: 8,
    letterSpacing: 0.8,
  },

  manualBlock: {
    borderLeftWidth: 1,
    borderLeftColor: "#333",
    paddingLeft: 8,
    marginTop: 9,
  },

  manualLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  manualText: {
    color: "#888",
    fontSize: 8,
    lineHeight: 13,
  },

  mutedText: {
    color: "#444",
    fontSize: 8,
    lineHeight: 14,
  },

  pendingCard: {
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#080808",
    padding: 12,
    marginBottom: 8,
  },

  pendingCompleted: {
    opacity: 0.42,
  },

  pendingExpired: {
    borderColor: "#603a3a",
  },

  pendingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  pendingCharacter: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  pendingTitle: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1,
  },

  countdown: {
    alignItems: "flex-end",
  },

  countdownLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  countdownValue: {
    color: "#ccc",
    fontSize: 13,
    letterSpacing: 1.2,
    marginTop: 2,
  },

  manualBadge: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  pendingObservation: {
    color: "#777",
    fontSize: 8,
    lineHeight: 14,
    marginTop: 9,
  },

  reminder: {
    borderLeftWidth: 2,
    borderLeftColor: "#555",
    paddingLeft: 8,
    marginTop: 9,
  },

  reminderLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.4,
    marginBottom: 3,
  },

  reminderText: {
    color: "#aaa",
    fontSize: 8,
    lineHeight: 14,
  },

  pendingActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },

  completeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    paddingVertical: 8,
  },

  completeText: {
    color: "#888",
    fontSize: 8,
    letterSpacing: 1.1,
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: "#382323",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 13,
  },

  deleteText: {
    color: "#744",
    fontSize: 8,
    letterSpacing: 1.1,
  },

  debugGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#1a1a1a",
  },

  debugCell: {
    width: "50%",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
  },

  debugValue: {
    color: "#ccc",
    fontSize: 17,
  },

  debugLabel: {
    color: "#4d4d4d",
    fontSize: 8,
    letterSpacing: 1.3,
    marginTop: 4,
  },

  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: "#202020",
    paddingTop: 20,
    marginTop: 5,
  },

  resetButton: {
    borderWidth: 1,
    borderColor: "#552727",
    backgroundColor: "#0b0606",
    padding: 14,
    marginTop: 9,
  },

  resetTitle: {
    color: "#a45a5a",
    fontSize: 8,
    letterSpacing: 1.4,
    textAlign: "center",
  },

  resetSubtitle: {
    color: "#4d3333",
    fontSize: 8,
    letterSpacing: 0.7,
    textAlign: "center",
    marginTop: 6,
  },

  exitButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  exitText: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1.4,
  },

  bigActionGrid: {
    gap: 10,
    marginTop: 12,
  },

  bigActionButton: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    backgroundColor: "#090909",
    paddingHorizontal: 16,
    paddingVertical: 15,
    justifyContent: "center",
  },

  bigActionTitle: {
    color: "#e2e2e2",
    fontSize: 15,
    letterSpacing: 2,
  },

  bigActionSubtitle: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 1.1,
    marginTop: 6,
  },

  bigActionArrow: {
    position: "absolute",
    right: 15,
    top: 28,
    color: "#666",
    fontSize: 30,
    fontWeight: "200",
  },

  operationModal: {
    maxHeight: "92%",
    borderTopWidth: 1,
    borderColor: "#333",
    backgroundColor: "#080808",
  },

  modalPlayerList: {
    gap: 8,
    paddingBottom: 3,
  },

  modalPlayer: {
    minWidth: 125,
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#090909",
    padding: 12,
  },

  modalPlayerSelected: {
    borderColor: "#777",
    backgroundColor: "#111",
  },

  modalPlayerName: {
    color: "#ddd",
    fontSize: 11,
    letterSpacing: 1.1,
  },

  modalPlayerRace: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 5,
  },

  modalTarget: {
    borderLeftWidth: 2,
    borderLeftColor: "#777",
    paddingLeft: 9,
    marginTop: 10,
  },

  modalTargetLabel: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1.4,
  },

  modalTargetValue: {
    color: "#ddd",
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 3,
  },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },

  segmentColumn: {
    gap: 7,
  },

  segmentButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#252525",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  segmentButtonSelected: {
    borderColor: "#777",
    backgroundColor: "#141414",
  },

  segmentButtonText: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 1.1,
  },

  segmentButtonTextSelected: {
    color: "#ddd",
  },

  selectionRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
    paddingVertical: 10,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  selectionRowSelected: {
    backgroundColor: "#101010",
    borderLeftWidth: 2,
    borderLeftColor: "#777",
  },

  selectionTitle: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 0.9,
  },

  selectionSub: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 5,
  },

  selectionMark: {
    color: "#aaa",
    fontSize: 16,
    marginLeft: 10,
  },

  largeChoice: {
    borderWidth: 1,
    borderColor: "#252525",
    padding: 13,
  },

  largeChoiceSelected: {
    borderColor: "#777",
    backgroundColor: "#111",
  },

  largeChoiceTitle: {
    color: "#ddd",
    fontSize: 11,
    letterSpacing: 1.2,
  },

  largeChoiceSub: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  modalExecute: {
    borderWidth: 1,
    borderColor: "#555",
    backgroundColor: "#151515",
    paddingVertical: 15,
    marginTop: 18,
  },

  modalExecuteText: {
    color: "#eee",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
  },

  eventChoiceSelected: {
    borderWidth: 1,
    borderColor: "#777",
    backgroundColor: "#111",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  eventChoiceMark: {
    color: "#aaa",
    fontSize: 15,
    marginLeft: 10,
  },

  alertPanel: {
    borderWidth: 1,
    borderColor: "#252525",
    backgroundColor: "#090909",
    padding: 13,
  },

  alertPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  alertPanelLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.4,
  },

  alertPanelStatus: {
    color: "#ccc",
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 4,
  },

  alertPanelPercent: {
    color: "#ddd",
    fontSize: 20,
    letterSpacing: 1,
  },

  alertTrack: {
    height: 12,
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#050505",
    overflow: "hidden",
  },

  alertFill: {
    height: "100%",
    backgroundColor: "#777",
  },

  alertControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },

  alertControlButton: {
    width: 70,
    height: 54,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },

  alertControlSymbol: {
    color: "#ddd",
    fontSize: 22,
    lineHeight: 24,
  },

  alertControlLabel: {
    color: "#555",
    fontSize: 7,
    letterSpacing: 1,
  },

  alertValueBox: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: "#1d1d1d",
    alignItems: "center",
    justifyContent: "center",
  },

  alertValue: {
    color: "#bbb",
    fontSize: 18,
    letterSpacing: 1.4,
  },

  alertActionRow: {
    flexDirection: "row",
    gap: 8,
  },

  eventCharacterStatus: {
    color: "#777",
    fontSize: 7,
    letterSpacing: 0.8,
    marginTop: 8,
  },

  eventWarning: {
    borderLeftWidth: 2,
    borderLeftColor: "#555",
    backgroundColor: "#0a0a0a",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 16,
  },

  eventWarningText: {
    color: "#666",
    fontSize: 8,
    lineHeight: 14,
    letterSpacing: 0.5,
  },

  placeholderPanel: {
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#090909",
    padding: 18,
  },

  placeholderTitle: {
    color: "#ddd",
    fontSize: 14,
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  placeholderText: {
    color: "#777",
    fontSize: 10,
    lineHeight: 17,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.86)",
    justifyContent: "flex-end",
  },

  releaseModal: {
    maxHeight: "92%",
    borderTopWidth: 1,
    borderColor: "#333",
    backgroundColor: "#080808",
  },

  pendingModal: {
    margin: 18,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#090909",
    padding: 17,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },

  modalKicker: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.8,
    marginBottom: 4,
  },

  modalTitle: {
    color: "#ddd",
    fontSize: 14,
    letterSpacing: 1.8,
  },

  closeButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: "#777",
    fontSize: 24,
    fontWeight: "200",
  },

  modalTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },

  modalTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
  },

  modalTabSelected: {
    borderBottomWidth: 2,
    borderBottomColor: "#777",
  },

  modalTabText: {
    color: "#4b4b4b",
    fontSize: 9,
    letterSpacing: 1.2,
  },

  modalTabTextSelected: {
    color: "#ddd",
  },

  modalContent: {
    padding: 16,
    paddingBottom: 35,
  },

  modalSectionTitle: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1.7,
    marginTop: 14,
    marginBottom: 8,
  },

  modalCurrentState: {
    borderWidth: 1,
    borderColor: "#202020",
    padding: 11,
  },

  currentStateLabel: {
    color: "#444",
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 9,
  },

  currentTierRow: {
    flexDirection: "row",
    gap: 7,
  },

  currentTier: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1b1b1b",
    padding: 8,
  },

  currentTierLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  currentTierValue: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  currentTierEnabled: {
    color: "#bbb",
  },

  modalActionRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
  },

  modalPrimaryButton: {
    borderWidth: 1,
    borderColor: "#454545",
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 10,
    flex: 1,
    marginTop: 8,
  },

  modalPrimaryText: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  modalDangerButton: {
    borderWidth: 1,
    borderColor: "#4a2929",
    backgroundColor: "#0c0606",
    paddingVertical: 12,
    paddingHorizontal: 10,
    flex: 1,
    marginTop: 8,
  },

  modalDangerText: {
    color: "#9b5b5b",
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  tierControl: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    paddingVertical: 11,
  },

  tierControlTitle: {
    color: "#ccc",
    fontSize: 9,
    letterSpacing: 1,
  },

  tierControlSub: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  tierToggle: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 9,
  },

  tierToggleEnabled: {
    borderColor: "#5b3535",
  },

  tierToggleText: {
    color: "#888",
    fontSize: 8,
    letterSpacing: 1,
  },

  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    paddingVertical: 9,
  },

  cardInfoName: {
    color: "#aaa",
    fontSize: 8,
  },

  cardInfoTier: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  modalSecondaryWide: {
    borderWidth: 1,
    borderColor: "#292929",
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginTop: 8,
  },

  modalSecondaryText: {
    color: "#888",
    fontSize: 9,
    letterSpacing: 1.1,
    textAlign: "center",
  },

  npcRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    paddingVertical: 11,
    paddingHorizontal: 8,
  },

  npcRowSelected: {
    backgroundColor: "#101010",
    borderLeftWidth: 2,
    borderLeftColor: "#777",
  },

  npcRealName: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1,
  },

  npcMeta: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },

  npcSelect: {
    color: "#777",
    fontSize: 14,
    marginLeft: 8,
  },

  npcEditor: {
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#0a0a0a",
    padding: 12,
    marginTop: 12,
  },

  npcEditorName: {
    color: "#eee",
    fontSize: 12,
    letterSpacing: 1.2,
  },

  npcEditorMeta: {
    color: "#666",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 5,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  checkboxChecked: {
    backgroundColor: "#222",
    borderColor: "#777",
  },

  checkMark: {
    color: "#ddd",
    fontSize: 11,
  },

  checkLabel: {
    color: "#aaa",
    fontSize: 8,
    letterSpacing: 1,
  },

  inputLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.3,
    marginTop: 9,
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: "#252525",
    backgroundColor: "#050505",
    color: "#ddd",
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  multiline: {
    minHeight: 58,
    textAlignVertical: "top",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 17,
  },

  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#252525",
    paddingVertical: 12,
    alignItems: "center",
  },

  modalCancelText: {
    color: "#666",
    fontSize: 9,
    letterSpacing: 1.2,
  },

  modalConfirm: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#555",
    backgroundColor: "#151515",
    paddingVertical: 12,
    alignItems: "center",
  },

  modalConfirmText: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1.2,
  },
});
