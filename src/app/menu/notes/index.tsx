import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { db } from "@/services/firebase/config";
import { updateCharacter } from "@/services/firebase/characters";

const firebaseIds: Record<string, string> = {
  Ciborgue: "cyborg",
  Tengu: "tengu",
  Elfo: "elf",
  Tiefling: "tiefling",
  Draconata: "dragonborn",
};

export default function NotesScreen() {
  const insets = useSafeAreaInsets();

  const [character, setCharacter] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const notesRef = useRef("");

  /*
   * Carrega o personagem selecionado.
   */
  useEffect(() => {
    let mounted = true;

    async function loadCharacter() {
      try {
        const selected =
          await AsyncStorage.getItem("selectedCharacter");

        if (!mounted) return;

        setCharacter(selected);
      } catch (error) {
        console.error(
          "Erro ao carregar personagem:",
          error
        );
      }
    }

    loadCharacter();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Escuta as notas do personagem em tempo real.
   */
  useEffect(() => {
    if (!character) return;

    const characterId = firebaseIds[character];

    if (!characterId) return;

    const characterRef = doc(
      db,
      "characters",
      characterId
    );

    const unsubscribe = onSnapshot(
      characterRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const data = snapshot.data();

        const firebaseNotes =
          typeof data.notas === "string"
            ? data.notas
            : "";

        /*
         * Só atualiza a tela se o conteúdo recebido
         * realmente for diferente do que já temos.
         */
        if (firebaseNotes !== notesRef.current) {
          notesRef.current = firebaseNotes;
          setNotes(firebaseNotes);
        }
      },
      (error) => {
        console.error(
          "Erro ao sincronizar notas:",
          error
        );
      }
    );

    return () => {
      unsubscribe();
    };
  }, [character]);

  /*
   * Salva automaticamente após 600ms sem digitação.
   */
  const saveNotes = useCallback(
    (value: string) => {
      if (!character) return;

      const characterId = firebaseIds[character];

      if (!characterId) return;

      notesRef.current = value;
      setNotes(value);
      setSaving(true);

      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }

      saveTimeout.current = setTimeout(
        async () => {
          try {
            await updateCharacter(characterId, {
              notas: value,
            });
          } catch (error) {
            console.error(
              "Erro ao salvar notas:",
              error
            );
          } finally {
            setSaving(false);
          }
        },
        600
      );
    },
    [character]
  );

  /*
   * Limpa o timeout quando sair da tela.
   */
  useEffect(() => {
    return () => {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
    };
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View>
            <Text style={styles.headerSmall}>
              PERSONAL LOG
            </Text>

            <Text style={styles.headerTitle}>
              NOTAS
            </Text>
          </View>

          <Text
            style={[
              styles.saveStatus,
              saving
                ? styles.saving
                : styles.saved,
            ]}
          >
            {saving
              ? "SALVANDO"
              : "SINCRONIZADO"}
          </Text>
        </View>

        <View style={styles.headerLine} />

        {/* ÁREA DAS ANOTAÇÕES */}

        <View style={styles.notesContainer}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.paper}>
              {/* LINHAS DO PAPEL */}

              <View
                pointerEvents="none"
                style={styles.lines}
              >
                {Array.from({
                  length: 100,
                }).map((_, index) => (
                  <View
                    key={index}
                    style={styles.paperLine}
                  />
                ))}
              </View>

              {/* EDITOR */}

              <TextInput
                style={styles.input}
                multiline
                value={notes}
                onChangeText={saveNotes}
                placeholder="Escreva suas anotações..."
                placeholderTextColor="#4A4A4A"
                textAlignVertical="top"
                autoCorrect={false}
                autoCapitalize="sentences"
                scrollEnabled={false}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },

  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  /*
   * HEADER
   */

  header: {
    minHeight: 74,

    paddingHorizontal: 20,
    paddingBottom: 12,

    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },

  headerSmall: {
    color: "#666666",

    fontSize: 10,
    fontWeight: "700",

    letterSpacing: 2,

    marginBottom: 2,
  },

  headerTitle: {
    color: "#E8E8E8",

    fontSize: 25,
    fontWeight: "300",

    letterSpacing: 3,
  },

  saveStatus: {
    fontSize: 9,
    fontWeight: "700",

    letterSpacing: 1.5,

    marginBottom: 5,
  },

  saving: {
    color: "#777777",
  },

  saved: {
    color: "#4D4D4D",
  },

  headerLine: {
    height: 1,

    backgroundColor: "#222222",

    marginHorizontal: 20,
  },

  /*
   * NOTAS
   */

  notesContainer: {
    flex: 1,

    marginTop: 14,
    marginHorizontal: 16,

    /*
     * Espaço para o BottomNavigation.
     */
    marginBottom: 110,

    borderWidth: 1,
    borderColor: "#202020",

    backgroundColor: "#050505",

    overflow: "hidden",
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
  },

  /*
   * PAPEL
   */

  paper: {
    minHeight: 320,

    position: "relative",

    backgroundColor: "#050505",
  },

  /*
   * LINHAS HORIZONTAIS
   */

  lines: {
    position: "absolute",

    top: 0,
    left: 0,
    right: 0,

    paddingTop: 8,

    zIndex: 0,
  },

  paperLine: {
    height: 32,

    borderBottomWidth: 1,
    borderBottomColor: "#161616",
  },

  /*
   * CAMPO DE TEXTO
   */

  input: {
    minHeight: 320,

    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 20,

    color: "#D0D0D0",

    fontSize: 15,
    lineHeight: 32,

    fontFamily:
      Platform.OS === "ios"
        ? "Courier New"
        : "monospace",

    backgroundColor: "transparent",

    zIndex: 1,
  },
});