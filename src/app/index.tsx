import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { router, useFocusEffect } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { characterDefaults } from "@/constants/characterDefaults";
import { db } from "@/services/firebase/config";

import { Snackbar } from "react-native-paper";

import { useCallback, useState } from "react";

export default function HomeScreen() {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );

  const [snackbarVisible, setSnackbarVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      async function loadSelectedCharacter() {
        const character = await AsyncStorage.getItem("selectedCharacter");

        setSelectedCharacter(character);
      }

      loadSelectedCharacter();
    }, []),
  );

  const continueStory = async () => {
    const character = await AsyncStorage.getItem("selectedCharacter");

    if (!character) {
      router.replace("/characters");
      return;
    }

    router.replace({
      pathname: "/characters/reveal",
      params: {
        character,
      },
    });
  };

  const resetSystem = async () => {
    try {
      console.log("🔴 INICIANDO RESET DO SISTEMA");

      await AsyncStorage.removeItem("selectedCharacter");
      setSelectedCharacter(null);

      for (const [characterId, defaults] of Object.entries(characterDefaults)) {
        console.log(`🔄 RESETANDO: ${characterId}`);

        await setDoc(doc(db, "characters", characterId), {
          ...defaults,
          ativo: false,
        });

        const inventoryRef = collection(
          db,
          "characters",
          characterId,
          "inventory",
        );

        const inventorySnapshot = await getDocs(inventoryRef);

        console.log(
          `📦 ITENS ENCONTRADOS EM ${characterId}: ${inventorySnapshot.size}`,
        );

        for (const inventoryItem of inventorySnapshot.docs) {
          console.log(
            `🗑️ EXCLUINDO: characters/${characterId}/inventory/${inventoryItem.id}`,
          );

          await deleteDoc(inventoryItem.ref);
        }

        const verificationSnapshot = await getDocs(inventoryRef);

        console.log(
          `🔎 ITENS RESTANTES EM ${characterId}: ${verificationSnapshot.size}`,
        );
      }

      console.log("🟢 RESET FINALIZADO");

      setSnackbarVisible(true);
    } catch (error) {
      console.error("❌ ERRO AO RESETAR SISTEMA:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("@/assets/title.png")} style={styles.logo} />

      {selectedCharacter ? (
        <Pressable onPress={continueStory} style={styles.button}>
          <Text style={styles.buttonText}>CONTINUAR HISTÓRIA</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => router.replace("/characters")}
          style={styles.button}
        >
          <Text style={styles.buttonText}>INICIAR SISTEMA</Text>
        </Pressable>
      )}

      <Pressable onPress={resetSystem} style={styles.resetButton}>
        <Text style={styles.resetButtonText}>RESETAR SISTEMA</Text>
      </Pressable>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
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

  button: {
    borderWidth: 1,
    borderColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 30,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    letterSpacing: 2,
  },

  logo: {
    width: 300,
    height: 100,
    resizeMode: "contain",
    marginBottom: 40,
  },

  resetButton: {
    marginTop: 30,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },

  resetButtonText: {
    color: "#555555",
    fontSize: 10,
    letterSpacing: 2,
  },
});
