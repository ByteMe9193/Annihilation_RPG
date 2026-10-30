import {
  Image,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import * as Updates from "expo-updates";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

import { Snackbar } from "react-native-paper";

import { db } from "@/services/firebase/config";
import { isGmPasswordValid } from "@/services/gmAccess";
import { useAppTheme } from "@/theme/AppTheme";
import type { AppThemeColors } from "@/theme/AppTheme";

type UpdateStatus = "idle" | "checking" | "available" | "downloading" | "ready" | "none" | "unsupported" | "error";


export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, mode, ready, setTheme } = useAppTheme();
  const themeStyles = createHomeThemeStyles(colors);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );

  const [sessionLocked, setSessionLocked] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const [masterModalVisible, setMasterModalVisible] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPasswordError, setMasterPasswordError] = useState(false);
  const [masterLoginError, setMasterLoginError] = useState("");
  const [masterLoading, setMasterLoading] = useState(false);
  const gmNavigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [lightThemeWarningVisible, setLightThemeWarningVisible] = useState(false);

  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>("idle");
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    return () => {
      if (gmNavigationTimer.current) clearTimeout(gmNavigationTimer.current);
    };
  }, []);

  const updateBusy = updateStatus === "checking" || updateStatus === "downloading";

  const checkUpdates = async () => {
    if (updateBusy) return;
    setUpdateError("");

    if (Platform.OS === "web" || __DEV__ || !Updates.isEnabled) {
      setUpdateStatus("unsupported");
      return;
    }

    setUpdateStatus("checking");
    try {
      const result = await Updates.checkForUpdateAsync();
      setUpdateStatus(result.isAvailable ? "available" : "none");
    } catch (error) {
      console.error("ERRO AO VERIFICAR OTA:", error);
      setUpdateError("Não foi possível consultar o servidor de atualizações. Verifique sua conexão e a configuração do EAS Update.");
      setUpdateStatus("error");
    }
  };

  const openUpdateModal = () => {
    setUpdateModalVisible(true);
    void checkUpdates();
  };

  const downloadUpdate = async () => {
    if (updateStatus !== "available") return;
    setUpdateStatus("downloading");
    try {
      const result = await Updates.fetchUpdateAsync();
      if (result.isNew) {
        setUpdateStatus("ready");
      } else {
        setUpdateStatus("none");
      }
    } catch (error) {
      console.error("ERRO AO BAIXAR OTA:", error);
      setUpdateError("Falha no download. Tente novamente com uma conexão estável.");
      setUpdateStatus("error");
    }
  };

  const applyUpdate = async () => {
    if (updateStatus !== "ready") return;
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error("ERRO AO APLICAR OTA:", error);
      setUpdateError("A atualização foi baixada, mas não foi possível reiniciar o aplicativo. Feche-o completamente e abra novamente.");
      setUpdateStatus("error");
    }
  };

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

  const continueStory = async () => {
    try {

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
      const characterIds: Record<string, string> = {
        ciborgue: "cyborg", cyborg: "cyborg", tengu: "tengu", elfo: "elf", elf: "elf",
        tiefling: "tiefling", draconata: "dragonborn", dragonborn: "dragonborn",
      };
      const characterId = characterIds[character.toLowerCase()];
      const profile = characterId ? await getDoc(doc(db, "characters", characterId)) : null;
      if (!profile?.exists() || profile.data().ativo !== true) {
        await AsyncStorage.removeItem("selectedCharacter");
        setSelectedCharacter(null);
        router.replace("/characters");
        return;
      }

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

  const openCharacterMode = async () => {
    try {

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


      await AsyncStorage.setItem(
        "userMode",
        "player",
      );

      const character =
        await AsyncStorage.getItem(
          "selectedCharacter",
        );

      if (character) {
        const characterIds: Record<string, string> = {
          ciborgue: "cyborg", cyborg: "cyborg", tengu: "tengu", elfo: "elf", elf: "elf",
          tiefling: "tiefling", draconata: "dragonborn", dragonborn: "dragonborn",
        };
        const characterId = characterIds[character.toLowerCase()];
        const profile = characterId ? await getDoc(doc(db, "characters", characterId)) : null;
        if (!profile?.exists() || profile.data().ativo !== true) {
          await AsyncStorage.removeItem("selectedCharacter");
          setSelectedCharacter(null);
          router.replace("/characters");
          return;
        }
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

  const openMasterMenu = () => {
    if (masterLoading) return;
    setMasterPassword("");
    setMasterPasswordError(false);
    setMasterLoginError("");
    setMasterModalVisible(true);
  };

  const closeMasterMenu = () => {
    if (masterLoading) return;
    Keyboard.dismiss();
    setMasterModalVisible(false);
    setMasterPassword("");
    setMasterPasswordError(false);
    setMasterLoginError("");
  };

  const enterMasterMenu = async () => {
    if (masterLoading) return;

    if (!isGmPasswordValid(masterPassword)) {
      setMasterPasswordError(true);
      setMasterLoginError("");
      return;
    }

    setMasterLoading(true);
    setMasterPasswordError(false);
    setMasterLoginError("");

    try {
      const sessionSnapshot = await getDoc(doc(db, "game", "session"));
      const resetVersion = Number(sessionSnapshot.data()?.resetVersion) || 0;
      await AsyncStorage.setItem("gmSessionVersion", String(resetVersion));
      await AsyncStorage.setItem("userMode", "gm");
      Keyboard.dismiss();
      setMasterModalVisible(false);
      setMasterPassword("");

      if (gmNavigationTimer.current) clearTimeout(gmNavigationTimer.current);
      gmNavigationTimer.current = setTimeout(() => {
        gmNavigationTimer.current = null;
        try {
          router.replace("/gm");
        } catch (error) {
          console.error("Erro ao abrir o menu do Mestre:", error);
          setMasterLoginError("Não foi possível abrir o menu do Mestre.");
          setMasterModalVisible(true);
        } finally {
          setMasterLoading(false);
        }
      }, 350);
    } catch (error) {
      console.error("Erro ao salvar modo do usuário:", error);
      setMasterLoginError("Falha ao acessar o Mestre. Tente novamente.");
      setMasterLoading(false);
    }
  };

  const handleThemeToggle = () => {
    if (!ready) return;

    if (mode === "dark") {
      setLightThemeWarningVisible(true);
      return;
    }

    setLightThemeWarningVisible(false);
    setTheme("dark");
  };

  const confirmLightTheme = () => {
    setLightThemeWarningVisible(false);
    setTheme("light");
  };

  return (
    <View style={[styles.container, themeStyles.container]}>
      <Image
        source={require("@/assets/title.png")}
        style={styles.logo}
      />

      <Pressable
        onPress={openCharacterMode}
        disabled={sessionLocked}
        style={[
          styles.button,
          themeStyles.button,
          sessionLocked && styles.buttonLocked,
          sessionLocked && themeStyles.buttonLocked,
        ]}
      >
        <Text
          style={[
            styles.buttonText,
            themeStyles.buttonText,
            sessionLocked && styles.buttonTextLocked,
            sessionLocked && themeStyles.buttonTextLocked,
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
        <Text style={[styles.lockedDescription, themeStyles.lockedDescription]}>
          A SESSÃO FOI BLOQUEADA PELO MESTRE.
        </Text>
      )}

      <Pressable
        onPress={openMasterMenu}
        style={styles.masterButton}
      >
        <Text style={[styles.masterButtonText, themeStyles.masterButtonText]}>
          JOGAR COMO MESTRE
        </Text>
      </Pressable>

      <Pressable
        onPress={handleThemeToggle}
        disabled={!ready}
        accessibilityRole="switch"
        accessibilityState={{ checked: mode === "light", disabled: !ready }}
        accessibilityLabel="Modo claro"
        accessibilityHint="Alterna entre os modos claro e escuro"
        style={({ pressed }) => [
          styles.themeToggle,
          themeStyles.themeToggle,
          pressed && styles.themeTogglePressed,
          !ready && styles.updateDisabled,
        ]}
      >
        <Ionicons
          name={mode === "dark" ? "moon-outline" : "sunny-outline"}
          size={17}
          color={colors.textMuted}
        />
        <Text style={[styles.themeToggleText, themeStyles.themeToggleText]}>
          {mode === "dark" ? "MODO ESCURO" : "MODO CLARO"}
        </Text>
        <Ionicons name="swap-horizontal-outline" size={15} color={colors.accent} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Verificar atualizações"
        accessibilityHint="Procura uma nova versão do aplicativo"
        onPress={openUpdateModal}
        style={({ pressed }) => [
          styles.updateFab,
          themeStyles.updateFab,
          { bottom: Math.max(insets.bottom + 16, 28) },
          pressed && styles.updateFabPressed,
          pressed && themeStyles.updateFabPressed,
        ]}
      >
        <View style={styles.updateFabAccent} />
        <Ionicons name="download-outline" size={26} color={colors.text} />
        <View style={styles.updateFabLed} />
      </Pressable>


      <Modal
        visible={lightThemeWarningVisible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => setLightThemeWarningVisible(false)}
      >
        <View style={styles.themeWarningOverlay}>
          <View style={styles.themeWarningPanel}>
            <View style={styles.themeWarningAccent} />

            <View style={styles.themeWarningIcon}>
              <Ionicons name="alert-outline" size={26} color="#cb777b" />
            </View>

            <Text style={styles.themeWarningKicker}>
              VALTESIA RESEARCH // CONFIGURAÇÕES
            </Text>
            <Text style={styles.themeWarningTitle}>MODO CLARO</Text>
            <Text style={styles.themeWarningSubtitle}>
              AVISO SOBRE A EXPERIÊNCIA
            </Text>

            <View style={styles.themeWarningDivider} />

            <Text style={styles.themeWarningBody}>
              Aniquilação foi desenvolvido e pensado para ser jogado no modo escuro.
              Ao utilizar o modo claro, podem ocorrer bugs ou inconsistências visuais
              que prejudiquem a experiência de jogo.
            </Text>
            <Text style={styles.themeWarningNote}>
              Esta alteração pode ser desfeita a qualquer momento pelo menu principal.
            </Text>

            <View style={styles.themeWarningActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setLightThemeWarningVisible(false)}
                style={({ pressed }) => [
                  styles.themeWarningCancel,
                  pressed && styles.themeWarningPressed,
                ]}
              >
                <Text style={styles.themeWarningCancelText}>CANCELAR</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmLightTheme}
                style={({ pressed }) => [
                  styles.themeWarningConfirm,
                  pressed && styles.themeWarningPressed,
                ]}
              >
                <Text style={styles.themeWarningConfirmText}>ATIVAR MODO CLARO</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={updateModalVisible}
        transparent
        statusBarTranslucent
        animationType="fade"
        onRequestClose={() => { if (!updateBusy) setUpdateModalVisible(false); }}
      >
        <View style={[styles.updateBackdrop, themeStyles.updateBackdrop]}>
          <View style={[styles.updateModal, themeStyles.updateModal]}>
            <View style={[styles.updateTopLine, themeStyles.updateTopLine]} />
            <Text style={[styles.updateKicker, themeStyles.updateKicker]}>VALTESIA RESEARCH // SISTEMA</Text>
            <Text style={[styles.updateTitle, themeStyles.updateTitle]}>ATUALIZAÇÕES</Text>
            <Text style={[styles.updateSubtitle, themeStyles.updateSubtitle]}>VERIFICAÇÃO DE VERSÃO</Text>
            <View style={[styles.updateDivider, themeStyles.updateDivider]} />

            {updateBusy ? (
              <View style={styles.updateStatusBox}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={[styles.updateStatusText, themeStyles.updateStatusText]}>
                  {updateStatus === "checking" ? "PROCURANDO ATUALIZAÇÕES..." : "BAIXANDO ATUALIZAÇÃO..."}
                </Text>
              </View>
            ) : (
              <View style={styles.updateStatusBox}>
                <Text style={[styles.updateStatusSymbol, themeStyles.updateStatusSymbol]}>
                  {updateStatus === "available" ? "↓" : updateStatus === "ready" ? "✓" : updateStatus === "none" ? "✓" : "!"}
                </Text>
                <Text style={[styles.updateStatusText, themeStyles.updateStatusText]}>
                  {updateStatus === "available"
                    ? "NOVA ATUALIZAÇÃO DISPONÍVEL"
                    : updateStatus === "ready"
                      ? "DOWNLOAD CONCLUÍDO"
                      : updateStatus === "none"
                        ? "SISTEMA ATUALIZADO"
                        : updateStatus === "unsupported"
                          ? "OTA INDISPONÍVEL NESTA BUILD"
                          : updateStatus === "error"
                            ? "FALHA NA VERIFICAÇÃO"
                            : "AGUARDANDO VERIFICAÇÃO"}
                </Text>
              </View>
            )}

            <Text style={[styles.updateDescription, themeStyles.updateDescription]}>
              {updateStatus === "available"
                ? "Um novo pacote foi encontrado. Baixe-o para atualizar o aplicativo."
                : updateStatus === "ready"
                  ? "A atualização está pronta. O aplicativo será reiniciado para aplicar o pacote."
                  : updateStatus === "none"
                    ? "Nenhuma atualização compatível foi encontrada para esta instalação."
                    : updateStatus === "unsupported"
                      ? "A verificação manual exige uma build Android de distribuição com EAS Update configurado. Não funciona pelo servidor Metro na Development Build."
                      : updateStatus === "error"
                        ? updateError
                        : updateStatus === "checking"
                          ? "Consultando o servidor de distribuição..."
                          : updateStatus === "downloading"
                            ? "Aguarde até a transferência terminar."
                            : "Conecte-se à internet para procurar atualizações."}
            </Text>

            <View style={styles.updateActions}>
              <Pressable
                disabled={updateBusy}
                onPress={() => setUpdateModalVisible(false)}
                style={[styles.updateSecondaryButton, themeStyles.updateSecondaryButton, updateBusy && styles.updateDisabled]}
              >
                <Text style={[styles.updateSecondaryText, themeStyles.updateSecondaryText]}>FECHAR</Text>
              </Pressable>

              {updateStatus === "available" && (
                <Pressable onPress={downloadUpdate} style={[styles.updatePrimaryButton, themeStyles.updatePrimaryButton]}>
                  <Text style={[styles.updatePrimaryText, themeStyles.updatePrimaryText]}>BAIXAR AGORA</Text>
                </Pressable>
              )}
              {updateStatus === "ready" && (
                <Pressable onPress={applyUpdate} style={[styles.updatePrimaryButton, themeStyles.updatePrimaryButton]}>
                  <Text style={[styles.updatePrimaryText, themeStyles.updatePrimaryText]}>APLICAR E REINICIAR</Text>
                </Pressable>
              )}
              {(updateStatus === "none" || updateStatus === "error") && (
                <Pressable onPress={checkUpdates} style={[styles.updatePrimaryButton, themeStyles.updatePrimaryButton]}>
                  <Text style={[styles.updatePrimaryText, themeStyles.updatePrimaryText]}>VERIFICAR NOVAMENTE</Text>
                </Pressable>
              )}
            </View>
            <Text style={[styles.updateFooter, themeStyles.updateFooter]}>ANIQUILAÇÃO // CENTRAL DE ATUALIZAÇÕES</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={masterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMasterMenu}
      >
        <KeyboardAvoidingView
          style={styles.masterKeyboard}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            keyboardShouldPersistTaps="always"
            bounces={false}
            contentContainerStyle={[styles.masterScrollContent, themeStyles.masterScrollContent]}
          >
            <View style={[styles.masterModal, themeStyles.masterModal]}>
              <Text style={[styles.modalTitle, themeStyles.modalTitle]}>ACESSO DO MESTRE</Text>
              <Text style={[styles.modalDescription, themeStyles.modalDescription]}>
                DIGITE A SENHA PARA ACESSAR O MENU DO MESTRE.
              </Text>

              <TextInput
                value={masterPassword}
                onChangeText={(text) => {
                  setMasterPassword(text);
                  setMasterPasswordError(false);
                  setMasterLoginError("");
                }}
                editable={!masterLoading}
                secureTextEntry
                keyboardType="number-pad"
                returnKeyType="done"
                autoComplete="off"
                placeholder="SENHA"
                placeholderTextColor={colors.placeholder}
                selectionColor={colors.accent}
                style={[styles.passwordInput, themeStyles.passwordInput]}
                onSubmitEditing={() => void enterMasterMenu()}
              />

              {masterPasswordError && (
                <Text style={[styles.errorText, themeStyles.errorText]}>SENHA INCORRETA.</Text>
              )}
              {!!masterLoginError && (
                <Text style={[styles.errorText, themeStyles.errorText]}>{masterLoginError}</Text>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={closeMasterMenu}
                  disabled={masterLoading}
                  style={[styles.cancelButton, masterLoading && styles.updateDisabled]}
                >
                  <Text style={[styles.cancelButtonText, themeStyles.cancelButtonText]}>CANCELAR</Text>
                </Pressable>
                <Pressable
                  onPress={() => void enterMasterMenu()}
                  disabled={masterLoading}
                  style={[styles.enterButton, themeStyles.enterButton, masterLoading && styles.updateDisabled]}
                >
                  <Text style={[styles.enterButtonText, themeStyles.enterButtonText]}>
                    {masterLoading ? "AGUARDE..." : "ENTRAR"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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

function createHomeThemeStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background },
    button: { borderColor: colors.text },
    buttonLocked: { borderColor: colors.border },
    buttonText: { color: colors.text },
    buttonTextLocked: { color: colors.textFaint },
    lockedDescription: { color: colors.textFaint },
    masterButtonText: { color: colors.textMuted },
    updateFab: { backgroundColor: colors.surface, borderColor: colors.accent },
    updateFabPressed: { backgroundColor: colors.surfaceRaised },
    updateTopLine: { backgroundColor: colors.accent },
    updateBackdrop: { backgroundColor: colors.overlay },
    updateModal: { backgroundColor: colors.surface, borderColor: colors.border },
    updateKicker: { color: colors.accent },
    updateTitle: { color: colors.text },
    updateSubtitle: { color: colors.textFaint },
    updateDivider: { backgroundColor: colors.border },
    updateStatusSymbol: { color: colors.text },
    updateStatusText: { color: colors.text },
    updateDescription: { color: colors.textMuted },
    updateSecondaryButton: { borderColor: colors.borderStrong },
    updatePrimaryButton: { backgroundColor: colors.accentBackground, borderColor: colors.accent },
    updatePrimaryText: { color: colors.accentText },
    updateSecondaryText: { color: colors.textMuted },
    updateFooter: { color: colors.textFaint },
    masterScrollContent: { backgroundColor: colors.overlay },
    masterModal: { backgroundColor: colors.surface, borderColor: colors.border },
    modalTitle: { color: colors.text },
    modalDescription: { color: colors.textMuted },
    passwordInput: { borderBottomColor: colors.borderStrong, color: colors.text },
    errorText: { color: colors.accent },
    cancelButtonText: { color: colors.textMuted },
    enterButton: { borderColor: colors.text },
    enterButtonText: { color: colors.text },
    themeToggle: { backgroundColor: colors.surface, borderColor: colors.border },
    themeToggleText: { color: colors.textMuted },
  });
}

const styles = StyleSheet.create({
  themeWarningOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.86)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  themeWarningPanel: {
    width: "100%",
    maxWidth: 410,
    backgroundColor: "#0b0909",
    borderWidth: 1,
    borderColor: "#513033",
    borderRadius: 5,
    paddingTop: 24,
    paddingHorizontal: 22,
    paddingBottom: 22,
    overflow: "hidden",
    alignItems: "center",
  },
  themeWarningAccent: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: "#94434b",
  },
  themeWarningIcon: {
    width: 52,
    height: 52,
    borderWidth: 1,
    borderColor: "#713b40",
    backgroundColor: "#221214",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 17,
  },
  themeWarningKicker: {
    color: "#a25b63",
    fontSize: 8,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  themeWarningTitle: {
    color: "#f1e9e9",
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: 3,
    marginTop: 12,
    textAlign: "center",
  },
  themeWarningSubtitle: {
    color: "#977c7f",
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 8,
    textAlign: "center",
  },
  themeWarningDivider: {
    width: "100%",
    height: 1,
    backgroundColor: "#342528",
    marginTop: 22,
    marginBottom: 20,
  },
  themeWarningBody: {
    color: "#dbd0d1",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },
  themeWarningNote: {
    color: "#a59b9c",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 15,
    textAlign: "center",
  },
  themeWarningActions: {
    width: "100%",
    flexDirection: "row",
    gap: 9,
    marginTop: 26,
  },
  themeWarningCancel: {
    flex: 1,
    minHeight: 49,
    borderWidth: 1,
    borderColor: "#50484a",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  themeWarningConfirm: {
    flex: 1.4,
    minHeight: 49,
    backgroundColor: "#54242a",
    borderWidth: 1,
    borderColor: "#a0565c",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  themeWarningCancelText: {
    color: "#aaa1a2",
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "600",
  },
  themeWarningConfirmText: {
    color: "#f5e9eb",
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: "700",
    textAlign: "center",
  },
  themeWarningPressed: {
    opacity: 0.72,
  },
  themeToggle: {
    marginTop: 10,
    minHeight: 42,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 5,
  },
  themeToggleText: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "600",
  },
  themeTogglePressed: { opacity: 0.65 },
  updateFab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#622d31",
    backgroundColor: "#0c090a",
    alignItems: "center",
    justifyContent: "center",
    elevation: 7,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    zIndex: 10,
    overflow: "hidden",
  },
  updateFabPressed: {
    backgroundColor: "#261113",
    transform: [{ scale: 0.95 }],
  },
  updateFabAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#9d4145",
  },
  updateFabLed: {
    position: "absolute",
    right: 7,
    bottom: 7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#a44548",
  },
  updateBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  updateModal: {
    width: "100%",
    maxWidth: 420,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 17,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: "#333",
    overflow: "hidden",
  },
  updateTopLine: {
    backgroundColor: "#772b2b",
    height: 2,
    marginTop: -20,
    marginHorizontal: -22,
    marginBottom: 24,
  },
  updateKicker: { color: "#774141", fontSize: 9, letterSpacing: 1.9, textAlign: "center" },
  updateTitle: { color: "#eee", fontSize: 22, fontWeight: "300", letterSpacing: 3, textAlign: "center", marginTop: 10 },
  updateSubtitle: { color: "#666", fontSize: 8, letterSpacing: 1.6, textAlign: "center", marginTop: 8 },
  updateDivider: { height: 1, backgroundColor: "#262626", marginVertical: 20 },
  updateStatusBox: { minHeight: 72, alignItems: "center", justifyContent: "center", gap: 10 },
  updateStatusSymbol: { color: "#c4c4c4", fontSize: 28 },
  updateStatusText: { color: "#d2d2d2", fontSize: 10, letterSpacing: 1.4, textAlign: "center" },
  updateDescription: { color: "#888", fontSize: 11, lineHeight: 18, textAlign: "center", marginTop: 13 },
  updateActions: { flexDirection: "row", gap: 8, marginTop: 26 },
  updateSecondaryButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  updatePrimaryButton: {
    flex: 1.5,
    minHeight: 46,
    backgroundColor: "#241010",
    borderWidth: 1,
    borderColor: "#793030",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  updatePrimaryText: { color: "#e1d7d7", fontSize: 9, letterSpacing: 1, textAlign: "center" },
  updateSecondaryText: { color: "#999", fontSize: 9, letterSpacing: 1.2 },
  updateDisabled: { opacity: 0.35 },
  updateFooter: { color: "#4b3b3b", fontSize: 7, letterSpacing: 1.2, marginTop: 19, textAlign: "center" },

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

  masterKeyboard: {
    flex: 1,
  },

  masterScrollContent: {
    flexGrow: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
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