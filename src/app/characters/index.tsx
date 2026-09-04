import React, { useState } from "react";
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
import { router } from "expo-router";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

const CARD_WIDTH = width * 0.8;
const CARD_HEIGHT = CARD_WIDTH * (16 / 9);
const CARD_MARGIN = 20;

const characters = [
  {
    name: "Ciborgue",
    back: require("@/assets/characters/cyborg-back.png"),
    front: require("@/assets/characters/cyborg.png"),
  },
  {
    name: "Tengu",
    back: require("@/assets/characters/tengu-back.png"),
    front: require("@/assets/characters/tengu.png"),
  },
  {
    name: "Elfo",
    back: require("@/assets/characters/elf-back.png"),
    front: require("@/assets/characters/elf.png"),
  },
  {
    name: "Tiefling",
    back: require("@/assets/characters/tiefling-back.png"),
    front: require("@/assets/characters/tiefling.png"),
  },
  {
    name: "Draconata",
    back: require("@/assets/characters/dragonborn-back.png"),
    front: require("@/assets/characters/dragonborn.png"),
  },
];

function CharacterCard({
  back,
  front,
  isSelected,
  hasSelection,
  onSelect,
}: {
  back: any;
  front?: any;
  isSelected: boolean;
  hasSelection: boolean;
  onSelect: () => void;
}) {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  const [showFront, setShowFront] = useState(false);

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
    }
  );
};

  React.useEffect(() => {
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
        { perspective: 1000 },
        { rotateY: `${rotation.value}deg` },
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
    null
  );

  const handleSelect = (name: string) => {
    if (selectedCharacter) return;

    setSelectedCharacter(name);

    setTimeout(() => {
      router.push({
        pathname: "/characters/reveal",
        params: {
          character: name,
        },
      });
    }, 2200);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SELEÇÃO</Text>

      <Text style={styles.subtitle}>Escolha seu personagem</Text>

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
              isSelected={selectedCharacter === item.name}
              hasSelection={selectedCharacter !== null}
              onSelect={() => handleSelect(item.name)}
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
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },
});