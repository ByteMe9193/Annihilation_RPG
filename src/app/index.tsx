import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router, useFocusEffect } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCallback, useEffect, useState } from "react";

import {
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

import { Snackbar } from "react-native-paper";

import { db } from "@/services/firebase/config";

const GM_PASSWORD = "3859";

export default function HomeScreen() {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );

  const [sessionLocked, setSessionLocked] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPasswordError, setMasterPasswordError] = useState(false);

  /*
   * ============================================================
   * CARREGA PERSONAGEM SELECIONADO
   * ============================================================
   */

  useFocusEffect(
    useCallback(() => {
      async function loadSelectedCharacter() {
        try {
          const character =
            await AsyncStorage.getItem("selectedCharacter");

          setSelectedCharacter(character);
        } catch (error) {
          console.error(
            "❌ ERRO AO CARREGAR PERSONAGEM:",
            error,
          );
        }
      }

      loadSelectedCharacter();
    }, []),
  );

  /*
   * ============================================================
   * SINCRONIZAÇÃO DO BLOQUEIO DA SESSÃO
   * ============================================================
   */

  useEffect(() => {
    const sessionRef = doc(db, "game", "session");

    const unsubscribe = onSnapshot(
      sessionRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSessionLocked(false);
          return;
        }

        const data = snapshot.data();

        setSessionLocked(data.bloqueada === true);
      },
      (error) => {
        console.error(
          "❌ ERRO AO SINCRONIZAR ESTADO DA SESSÃO:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, []);

  /*
   * ============================================================
   * CONTINUAR HISTÓRIA
   * ============================================================
   */

  const continueStory = async () => {
    try {
      /*
       * Faz uma verificação diretamente no Firebase
       * antes de permitir a entrada.
       */
      const sessionRef = doc(db, "game", "session");

      const sessionSnapshot =
        await getDoc(sessionRef);

      const bloqueada =
        sessionSnapshot.exists() &&
        sessionSnapshot.data().bloqueada === true;

      if (bloqueada) {
        setSessionLocked(true);
        return;
      }

      const character =
        await AsyncStorage.getItem(
          "selectedCharacter",
        );

      if (!character) {
        router.replace("/characters");
        return;
      }

      /*
       * Garante que este dispositivo está
       * sendo utilizado como jogador.
       */
      await AsyncStorage.setItem(
        "userMode",
        "player",
      );

      router.replace({
        pathname: "/characters/reveal",
        params: {
          character,
        },
      });
    } catch (error) {
      console.error(
        "❌ ERRO AO CONTINUAR HISTÓRIA:",
        error,
      );
    }
  };

  /*
   * ============================================================
   * JOGAR COMO PERSONAGEM
   * ============================================================
   */

  const openCharacterMode = async () => {
    try {
      /*
       * Verificação de segurança diretamente no Firebase.
       */
      const sessionRef = doc(db, "game", "session");

      const sessionSnapshot =
        await getDoc(sessionRef);

      const bloqueada =
        sessionSnapshot.exists() &&
        sessionSnapshot.data().bloqueada === true;

      if (bloqueada) {
        setSessionLocked(true);
        return;
      }

      /*
       * Este dispositivo passa a ser considerado
       * um jogador.
       */
      await AsyncStorage.setItem(
        "userMode",
        "player",
      );

      const character =
        await AsyncStorage.getItem(
          "selectedCharacter",
        );

      if (character) {
        router.replace({
          pathname: "/characters/reveal",
          params: {
            character,
          },
        });

        return;
      }

      router.replace("/characters");
    } catch (error) {
      console.error(
        "❌ ERRO AO ABRIR MODO PERSONAGEM:",
        error,
      );
    }
  };

  /*
   * ============================================================
   * MENU DO MESTRE
   * ============================================================
   */

  const openMasterMenu = () => {
    setMasterPassword("");
    setMasterPasswordError(false);
    setMasterModalVisible(true);
  };

  const enterMasterMenu = async () => {
    if (masterPassword === GM_PASSWORD) {
      /*
       * Marca este dispositivo como Mestre.
       * O bloqueio global da sessão não afeta o Mestre.
       */
      await AsyncStorage.setItem(
        "userMode",
        "gm",
      );

      setMasterModalVisible(false);
      setMasterPassword("");
      setMasterPasswordError(false);

      router.replace("/gm");

      return;
    }

    setMasterPasswordError(true);
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <View style={styles.container}>
      <Image
        source={require("@/assets/title.png")}
        style={styles.logo}
      />

      <Pressable
        onPress={openCharacterMode}
        disabled={sessionLocked}
        style={[
          styles.button,
          sessionLocked && styles.buttonLocked,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            sessionLocked && styles.buttonTextLocked,
          ]}
        >
          {sessionLocked
            ? "SESSÃO BLOQUEADA"
            : selectedCharacter
              ? "CONTINUAR HISTÓRIA"
              : "JOGAR COMO PERSONAGEM"}
        </Text>
      </Pressable>

      {sessionLocked && (
        <Text style={styles.lockedDescription}>
          A SESSÃO FOI BLOQUEADA PELO MESTRE.
        </Text>
      )}

      <Pressable
        onPress={openMasterMenu}
        style={styles.masterButton}
      >
        <Text style={styles.masterButtonText}>
          JOGAR COMO MESTRE
        </Text>
      </Pressable>

      <Modal
        visible={masterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setMasterModalVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.masterModal}>
            <Text style={styles.modalTitle}>
              ACESSO DO MESTRE
            </Text>

            <Text style={styles.modalDescription}>
              DIGITE A SENHA PARA ACESSAR O MENU DO MESTRE.
            </Text>

            <TextInput
              value={masterPassword}
              onChangeText={(text) => {
                setMasterPassword(text);
                setMasterPasswordError(false);
              }}
              secureTextEntry
              autoFocus
              placeholder="SENHA"
              placeholderTextColor="#555"
              selectionColor="#ffffff"
              style={styles.passwordInput}
              onSubmitEditing={enterMasterMenu}
            />

            {masterPasswordError && (
              <Text style={styles.errorText}>
                SENHA INCORRETA.
              </Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setMasterModalVisible(false);
                  setMasterPassword("");
                  setMasterPasswordError(false);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>
                  CANCELAR
                </Text>
              </Pressable>

              <Pressable
                onPress={enterMasterMenu}
                style={styles.enterButton}
              >
                <Text style={styles.enterButtonText}>
                  ENTRAR
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() =>
          setSnackbarVisible(false)
        }
        duration={2500}
      >
        Sistema reiniciado
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 300,
    height: 100,
    resizeMode: "contain",
    marginBottom: 40,
  },

  button: {
    borderWidth: 1,
    borderColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 30,
  },

  buttonLocked: {
    borderColor: "#444444",
    opacity: 0.55,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    letterSpacing: 2,
  },

  buttonTextLocked: {
    color: "#555555",
  },

  lockedDescription: {
    color: "#555555",
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 12,
  },

  masterButton: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  masterButtonText: {
    color: "#777777",
    fontSize: 11,
    letterSpacing: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  masterModal: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#333333",
    padding: 24,
  },

  modalTitle: {
    color: "#ffffff",
    fontSize: 17,
    letterSpacing: 3,
    textAlign: "center",
  },

  modalDescription: {
    color: "#777777",
    fontSize: 10,
    letterSpacing: 1.5,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 22,
  },

  passwordInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#555555",
    color: "#ffffff",
    fontSize: 16,
    letterSpacing: 4,
    paddingVertical: 10,
    textAlign: "center",
  },

  errorText: {
    color: "#aa4444",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 10,
  },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 24,
    gap: 18,
  },

  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  cancelButtonText: {
    color: "#666666",
    fontSize: 10,
    letterSpacing: 1.5,
  },

  enterButton: {
    borderWidth: 1,
    borderColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 18,
  },

  enterButtonText: {
    color: "#ffffff",
    fontSize: 10,
    letterSpacing: 1.5,
  },
});