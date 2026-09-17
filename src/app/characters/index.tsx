import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable,
} from "react-native";
import { Card } from "react-native-paper";
import { FlatList } from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase/config";

const { width } = Dimensions.get("window");

const CARD_WIDTH = width * 0.8;
const CARD_HEIGHT = CARD_WIDTH * (16 / 9);
const CARD_MARGIN = 20;

const characters = [
  {
    name: "Ciborgue",
    id: "cyborg",
    back: require("@/assets/characters/cyborg-back.png"),
    front: require("@/assets/characters/cyborg.png"),
  },
  {
    name: "Tengu",
    id: "tengu",
    back: require("@/assets/characters/tengu-back.png"),
    front: require("@/assets/characters/tengu.png"),
  },
  {
    name: "Elfo",
    id: "elf",
    back: require("@/assets/characters/elf-back.png"),
    front: require("@/assets/characters/elf.png"),
  },
  {
    name: "Tiefling",
    id: "tiefling",
    back: require("@/assets/characters/tiefling-back.png"),
    front: require("@/assets/characters/tiefling.png"),
  },
  {
    name: "Draconata",
    id: "dragonborn",
    back: require("@/assets/characters/dragonborn-back.png"),
    front: require("@/assets/characters/dragonborn.png"),
  },
];

function CharacterCard({
  back,
  front,
  isSelected,
  hasSelection,
  resetSignal,
  onSelect,
}: {
  back: any;
  front?: any;
  isSelected: boolean;
  hasSelection: boolean;
  resetSignal: number;
  onSelect: () => void;
}) {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  const [showFront, setShowFront] = useState(false);

  useEffect(() => {
    rotation.value = 0;
    opacity.value = 1;
    setShowFront(false);
  }, [resetSignal]);

  const flip = () => {
    if (hasSelection || !front) {
      return;
    }

    onSelect();

    rotation.value = withTiming(
      90,
      {
        duration: 700,
      },
      (finished) => {
        if (!finished) return;

        runOnJS(setShowFront)(true);

        rotation.value = -90;

        rotation.value = withTiming(0, {
          duration: 700,
        });
      },
    );
  };

  useEffect(() => {
    if (hasSelection && !isSelected) {
      opacity.value = withTiming(0, {
        duration: 400,
      });
    }

    if (isSelected) {
      opacity.value = withTiming(1, {
        duration: 200,
      });
    }
  }, [hasSelection, isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        {
          perspective: 1000,
        },
        {
          rotateY: `${rotation.value}deg`,
        },
      ],
    };
  });

  return (
    <Pressable onPress={flip}>
      <Card style={styles.card}>
        <Animated.View style={[styles.face, animatedStyle]}>
          <Image
            source={showFront && front ? front : back}
            style={styles.cardImage}
            resizeMode="contain"
          />
        </Animated.View>
      </Card>
    </Pressable>
  );
}

export default function CharacterSelection() {
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );

  const [resetSignal, setResetSignal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function checkSelectedCharacter() {
        const storedCharacter =
          await AsyncStorage.getItem("selectedCharacter");

        if (!active) return;

        if (storedCharacter) {
          router.replace("/");
          return;
        }

        setSelectedCharacter(null);
        setResetSignal((current) => current + 1);
      }

      checkSelectedCharacter();

      return () => {
        active = false;
      };
    }, []),
  );

  const handleSelect = async (name: string) => {
    if (selectedCharacter) {
      return;
    }

    const character = characters.find(
      (item) => item.name === name,
    );

    if (!character) {
      return;
    }

    try {
      setSelectedCharacter(name);

      // Salva o personagem selecionado neste dispositivo
      await AsyncStorage.setItem(
        "selectedCharacter",
        name,
      );

      // Marca o personagem como ativo na sessão
      await updateDoc(
        doc(db, "characters", character.id),
        {
          ativo: true,
        },
      );

      console.log(
        `🟢 PERSONAGEM ATIVADO: ${name} (${character.id})`,
      );

      setTimeout(() => {
        router.replace({
          pathname: "/characters/reveal",
          params: {
            character: name,
          },
        });
      }, 2200);
    } catch (error) {
      console.error(
        "❌ ERRO AO ATIVAR PERSONAGEM:",
        error,
      );

      // Se falhar no Firestore, desfaz a seleção local
      setSelectedCharacter(null);
      await AsyncStorage.removeItem("selectedCharacter");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SELEÇÃO</Text>

      <Text style={styles.subtitle}>
        Escolha seu personagem
      </Text>

      <FlatList
        data={characters}
        keyExtractor={(item) => item.name}
        showsVerticalScrollIndicator={false}
        snapToInterval={CARD_HEIGHT + CARD_MARGIN * 2}
        decelerationRate="fast"
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <CharacterCard
              back={item.back}
              front={item.front}
              isSelected={
                selectedCharacter === item.name
              }
              hasSelection={
                selectedCharacter !== null
              }
              resetSignal={resetSignal}
              onSelect={() =>
                handleSelect(item.name)
              }
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingTop: 60,
  },

  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 6,
    textAlign: "center",
  },

  subtitle: {
    color: "#777",
    fontSize: 14,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  list: {
    width: "100%",
    alignItems: "center",
  },

  item: {
    width: "100%",
    alignItems: "center",
  },

  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginVertical: CARD_MARGIN,
    backgroundColor: "#111",
    overflow: "hidden",
  },

  face: {
    width: "100%",
    height: "100%",
    backfaceVisibility: "hidden",
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },
});