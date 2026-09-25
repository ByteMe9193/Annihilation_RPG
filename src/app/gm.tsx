import React, { useEffect, useState } from "react";

import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

type SessionData = {
  bloqueada?: boolean;
};

export default function GM() {
  const [session, setSession] = useState<SessionData>({
    bloqueada: false,
  });

  const [loading, setLoading] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  /*
   * ============================================================
   * SINCRONIZAÇÃO DA SESSÃO
   * ============================================================
   */

  useEffect(() => {
    const sessionRef = doc(db, "game", "session");

    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSession({
            bloqueada: false,
          });

          return;
        }

        const data = snapshot.data();

        setSession({
          bloqueada: Boolean(data.bloqueada),
        });
      },
      (error) => {
        console.error(
          "❌ ERRO AO SINCRONIZAR GAME/SESSION:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * ============================================================
   * SNACKBAR
   * ============================================================
   */

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  /*
   * ============================================================
   * BLOQUEAR / DESBLOQUEAR SESSÃO
   * ============================================================
   */

  const toggleSessionLock = async () => {
    if (loading) {
      return;
    }

    try {
      const sessionRef = doc(db, "game", "session");

      const newState = !session.bloqueada;

      await setDoc(
        sessionRef,
        {
          bloqueada: newState,
        },
        {
          merge: true,
        },
      );

      showMessage(
        newState
          ? "Sessão bloqueada."
          : "Sessão desbloqueada.",
      );
    } catch (error) {
      console.error(
        "❌ ERRO AO ALTERAR BLOQUEIO DA SESSÃO:",
        error,
      );

      showMessage(
        "Erro ao alterar o estado da sessão.",
      );
    }
  };

  /*
   * ============================================================
   * REVELAR TODOS OS NPCs
   * ============================================================
   */

  const revealAllNPCs = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      console.log(
        "🟡 REVELANDO TODOS OS NPCs",
      );

      const npcCollection = collection(
        db,
        "npcCards",
      );

      const snapshot = await getDocs(
        npcCollection,
      );

      for (const npc of snapshot.docs) {
        await updateDoc(npc.ref, {
          descoberto: true,
        });
      }

      console.log(
        `✅ ${snapshot.size} NPCs revelados`,
      );

      showMessage(
        "Todos os NPCs foram revelados.",
      );
    } catch (error) {
      console.error(
        "❌ ERRO AO REVELAR NPCs:",
        error,
      );

      showMessage(
        "Erro ao revelar os NPCs.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * REVELAR TODAS AS INFORMAÇÕES DOS NPCs
   * ============================================================
   */

  const revealAllNPCInformation = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      console.log(
        "🟡 REVELANDO TODAS AS INFORMAÇÕES DOS NPCs",
      );

      const npcCollection = collection(
        db,
        "npcCards",
      );

      const snapshot = await getDocs(
        npcCollection,
      );

      for (const npc of snapshot.docs) {
        await updateDoc(npc.ref, {
          descoberto: true,

          revelado: {
            nome: true,
            arquetipo: true,
            status: true,
            nivelAcesso: true,
            relacao: true,
          },
        });
      }

      console.log(
        `✅ Informações de ${snapshot.size} NPCs reveladas`,
      );

      showMessage(
        "Todas as informações dos NPCs foram reveladas.",
      );
    } catch (error) {
      console.error(
        "❌ ERRO AO REVELAR INFORMAÇÕES DOS NPCs:",
        error,
      );

      showMessage(
        "Erro ao revelar informações dos NPCs.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * REVELAR TODAS AS SKILL CARDS
   * ============================================================
   */

  const revealAllSkillCards = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      console.log(
        "🟡 LIBERANDO TODAS AS SKILL CARDS",
      );

      for (const characterId of Object.keys(
        characterDefaults,
      )) {
        const characterRef = doc(
          db,
          "characters",
          characterId,
        );

        await setDoc(
          characterRef,
          {
            skillCardTiers: {
              tier1: true,
              tier2: true,
              tier3: true,
            },
          },
          {
            merge: true,
          },
        );

        console.log(
          `✅ SKILL CARDS LIBERADAS: ${characterId}`,
        );
      }

      showMessage(
        "Todas as Skill Cards foram liberadas.",
      );
    } catch (error) {
      console.error(
        "❌ ERRO AO REVELAR SKILL CARDS:",
        error,
      );

      showMessage(
        "Erro ao revelar as Skill Cards.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * RESET DE INVENTÁRIO
   * ============================================================
   */

  const resetInventory = async (
    characterId: string,
  ) => {
    const inventoryRef = collection(
      db,
      "characters",
      characterId,
      "inventory",
    );

    const snapshot = await getDocs(
      inventoryRef,
    );

    console.log(
      `📦 ${characterId}: ${snapshot.size} itens encontrados`,
    );

    for (const item of snapshot.docs) {
      await deleteDoc(item.ref);
    }

    const verificationSnapshot =
      await getDocs(inventoryRef);

    console.log(
      `🔎 ${characterId}: ${verificationSnapshot.size} itens restantes`,
    );
  };

  /*
   * ============================================================
   * RESET DOS PERSONAGENS
   * ============================================================
   */

  const resetCharacters = async () => {
    for (const [
      characterId,
      defaults,
    ] of Object.entries(characterDefaults)) {
      console.log(
        `🔄 RESETANDO PERSONAGEM: ${characterId}`,
      );

      const characterRef = doc(
        db,
        "characters",
        characterId,
      );

      await setDoc(characterRef, {
        ...defaults,
        ativo: false,
      });

      await resetInventory(characterId);
    }

    console.log(
      "✅ PERSONAGENS E INVENTÁRIOS RESETADOS",
    );
  };

  /*
   * ============================================================
   * RESET DOS NPCs
   * ============================================================
   */

  const resetNPCs = async () => {
    console.log(
      "🔄 RESETANDO NPCs",
    );

    const npcCollection = collection(
      db,
      "npcCards",
    );

    /*
     * Primeiro removemos os documentos atuais.
     * Isso garante que nenhum NPC antigo que eventualmente
     * exista no Firestore permaneça.
     */

    const currentNPCs = await getDocs(
      npcCollection,
    );

    console.log(
      `🗑️ ${currentNPCs.size} NPCs encontrados para reset`,
    );

    for (const npc of currentNPCs.docs) {
      await deleteDoc(npc.ref);
    }

    /*
     * Depois recriamos todos os NPCs usando npcDefaults.
     */

    for (const [
      npcId,
      npcData,
    ] of Object.entries(npcDefaults)) {
      await setDoc(
        doc(db, "npcCards", npcId),
        npcData,
      );

      console.log(
        `✅ NPC restaurado: ${npcId}`,
      );
    }

    /*
     * Verificação.
     */

    const verificationSnapshot =
      await getDocs(npcCollection);

    console.log(
      `🔎 NPCs após reset: ${verificationSnapshot.size}`,
    );

    console.log(
      "✅ NPCs RESETADOS",
    );
  };

  /*
   * ============================================================
   * RESET DA SESSÃO
   * ============================================================
   */

  const resetSession = async () => {
    console.log(
      "🔄 RESETANDO GAME/SESSION",
    );

    await setDoc(
      doc(db, "game", "session"),
      {
        bloqueada: false,
      },
      {
        merge: true,
      },
    );

    console.log(
      "✅ GAME/SESSION RESETADO",
    );
  };

  /*
   * ============================================================
   * RESET DO selectedCharacter
   * ============================================================
   */

  const resetLocalCharacter = async () => {
    console.log(
      "🔄 REMOVENDO PERSONAGEM LOCAL",
    );

    /*
     * AsyncStorage.
     */

    await AsyncStorage.removeItem(
      "selectedCharacter",
    );

    /*
     * No Web, garantimos diretamente que a chave
     * também seja removida do localStorage.
     */

    if (Platform.OS === "web") {
      try {
        window.localStorage.removeItem(
          "selectedCharacter",
        );

        console.log(
          "🌐 localStorage.selectedCharacter removido",
        );
      } catch (error) {
        console.error(
          "❌ ERRO AO REMOVER selectedCharacter DO LOCAL STORAGE:",
          error,
        );
      }
    }

    /*
     * Verificação através do AsyncStorage.
     */

    const remainingCharacter =
      await AsyncStorage.getItem(
        "selectedCharacter",
      );

    console.log(
      "🔎 selectedCharacter APÓS RESET:",
      remainingCharacter,
    );

    if (remainingCharacter === null) {
      console.log(
        "✅ PERSONAGEM LOCAL REMOVIDO",
      );
    } else {
      console.error(
        "❌ selectedCharacter AINDA EXISTE:",
        remainingCharacter,
      );
    }
  };

  /*
   * ============================================================
   * RESET COMPLETO
   * ============================================================
   */

  const resetSystem = async () => {
    if (loading) {
      return;
    }

    try {
      setLoading(true);

      console.log(
        "========================================",
      );
      console.log(
        "🔴 INICIANDO RESET COMPLETO DO SISTEMA",
      );
      console.log(
        "========================================",
      );

      /*
       * 1. Personagens
       */

      await resetCharacters();

      /*
       * 2. NPCs
       */

      await resetNPCs();

      /*
       * 3. Sessão
       */

      await resetSession();

      /*
       * 4. Armazenamento local
       */

      await resetLocalCharacter();

      console.log(
        "========================================",
      );
      console.log(
        "🟢 RESET COMPLETO FINALIZADO",
      );
      console.log(
        "========================================",
      );

      showMessage(
        "Sistema completamente reiniciado.",
      );

      /*
       * Pequeno intervalo para garantir que o Firebase
       * e o armazenamento local terminem antes da navegação.
       */

      await new Promise((resolve) =>
        setTimeout(resolve, 300),
      );

      router.replace("/");
    } catch (error) {
      console.error(
        "========================================",
      );

      console.error(
        "❌ ERRO AO RESETAR SISTEMA:",
        error,
      );

      console.error(
        "========================================",
      );

      showMessage(
        "Erro ao resetar o sistema.",
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * CONFIRMAÇÃO DO RESET
   * ============================================================
   */

  const confirmReset = () => {
    if (loading) {
      return;
    }

    Alert.alert(
      "RESETAR SISTEMA",
      "Isso irá restaurar personagens, inventários, NPCs, sessão e seleção local deste aparelho. Esta ação não pode ser desfeita.",
      [
        {
          text: "CANCELAR",
          style: "cancel",
        },

        {
          text: "RESETAR",
          style: "destructive",
          onPress: resetSystem,
        },
      ],
    );
  };

  /*
   * ============================================================
   * SAIR DO MENU DO MESTRE
   * ============================================================
   */

  const goBack = () => {
    if (loading) {
      return;
    }

    router.replace("/");
  };

  /*
   * ============================================================
   * INTERFACE
   * ============================================================
   */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>
          MENU DO MESTRE
        </Text>

        {/* ================================================= */}
        {/* CONTROLE DA SESSÃO */}
        {/* ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            CONTROLE DA SESSÃO
          </Text>

          <View style={styles.sessionStatus}>
            <View
              style={[
                styles.statusIndicator,

                session.bloqueada
                  ? styles.statusLocked
                  : styles.statusUnlocked,
              ]}
            />

            <Text style={styles.statusText}>
              {session.bloqueada
                ? "SESSÃO BLOQUEADA"
                : "SESSÃO DESBLOQUEADA"}
            </Text>
          </View>

          <Pressable
            onPress={toggleSessionLock}
            disabled={loading}
            style={[
              styles.actionButton,

              session.bloqueada
                ? styles.unlockButton
                : styles.lockButton,

              loading &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.actionButtonText}>
              {session.bloqueada
                ? "DESBLOQUEAR SESSÃO"
                : "BLOQUEAR SESSÃO"}
            </Text>
          </Pressable>
        </View>

        {/* ================================================= */}
        {/* PENDÊNCIAS */}
        {/* ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PENDÊNCIAS
          </Text>

          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              NENHUMA PENDÊNCIA CONFIGURADA.
            </Text>
          </View>
        </View>

        {/* ================================================= */}
        {/* TESTES */}
        {/* ================================================= */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            TESTES
          </Text>

          <Pressable
            onPress={revealAllSkillCards}
            disabled={loading}
            style={[
              styles.actionButton,
              loading &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.actionButtonText}>
              REVELAR TODAS AS SKILL CARDS
            </Text>
          </Pressable>

          <Pressable
            onPress={revealAllNPCs}
            disabled={loading}
            style={[
              styles.actionButton,
              loading &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.actionButtonText}>
              REVELAR TODOS OS NPCs
            </Text>
          </Pressable>

          <Pressable
            onPress={revealAllNPCInformation}
            disabled={loading}
            style={[
              styles.actionButton,
              loading &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.actionButtonText}>
              REVELAR TODAS AS INFORMAÇÕES DOS NPCs
            </Text>
          </Pressable>
        </View>

        {/* ================================================= */}
        {/* SISTEMA */}
        {/* ================================================= */}

        <View style={styles.dangerSection}>
          <Text style={styles.sectionTitle}>
            SISTEMA
          </Text>

          <Pressable
            onPress={confirmReset}
            disabled={loading}
            style={[
              styles.resetButton,
              loading &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.resetButtonText}>
              RESETAR SISTEMA
            </Text>
          </Pressable>
        </View>

        {/* ================================================= */}
        {/* SAIR */}
        {/* ================================================= */}

        <Pressable
          onPress={goBack}
          disabled={loading}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            SAIR DO MENU DO MESTRE
          </Text>
        </Pressable>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() =>
          setSnackbarVisible(false)
        }
        duration={2500}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  content: {
    paddingTop: 55,
    paddingHorizontal: 18,
    paddingBottom: 120,
  },

  title: {
    color: "#ffffff",
    fontSize: 20,
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 35,
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    color: "#888888",
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 12,
  },

  sessionStatus: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },

  statusLocked: {
    backgroundColor: "#aa4444",
  },

  statusUnlocked: {
    backgroundColor: "#777777",
  },

  statusText: {
    color: "#ffffff",
    fontSize: 11,
    letterSpacing: 1.5,
  },

  actionButton: {
    borderWidth: 1,
    borderColor: "#333333",
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginBottom: 8,
  },

  lockButton: {
    borderColor: "#555555",
  },

  unlockButton: {
    borderColor: "#777777",
  },

  disabledButton: {
    opacity: 0.45,
  },

  actionButtonText: {
    color: "#ffffff",
    fontSize: 10,
    letterSpacing: 1.5,
  },

  emptyBox: {
    borderWidth: 1,
    borderColor: "#181818",
    padding: 18,
  },

  emptyText: {
    color: "#444444",
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: "center",
  },

  dangerSection: {
    marginTop: 10,
    marginBottom: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#1c1c1c",
  },

  resetButton: {
    borderWidth: 1,
    borderColor: "#552222",
    paddingVertical: 15,
    paddingHorizontal: 14,
  },

  resetButtonText: {
    color: "#aa5555",
    fontSize: 10,
    letterSpacing: 1.5,
  },

  backButton: {
    paddingVertical: 15,
    alignItems: "center",
  },

  backButtonText: {
    color: "#555555",
    fontSize: 9,
    letterSpacing: 1.5,
  },
});