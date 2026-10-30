import { useThemedStyles } from "@/theme/useThemedStyles";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
  Pressable,
  Platform,
  Modal,
  FlatList,
} from "react-native";

import { Card } from "react-native-paper";

import { router, useFocusEffect } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { Asset } from "expo-asset";

import { useAudioPlayer } from "expo-audio";

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { collection, doc, onSnapshot, runTransaction } from "firebase/firestore";

import { db } from "@/services/firebase/config";

const { width } = Dimensions.get("window");

const CARD_WIDTH = width * 0.8;

const CARD_HEIGHT = CARD_WIDTH * (16 / 9);

const CARD_SIDE_GAP = width * 0.06;

const SNAP_INTERVAL = CARD_WIDTH + CARD_SIDE_GAP * 2;

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

function CharacterImage({ source }: { source: any }) {
  const styles = useThemedStyles(baseStyles);

  const [uri, setUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadAsset() {
      try {
        const asset = Asset.fromModule(source);

        await asset.downloadAsync();

        if (mounted) {
          setUri(asset.uri);
        }
      } catch (error) {
        console.error("❌ ERRO AO CARREGAR IMAGEM DO PERSONAGEM:", error);
      }
    }

    loadAsset();

    return () => {
      mounted = false;
    };
  }, [source]);

  if (Platform.OS === "web") {
    if (!uri) {
      return <View style={styles.cardImage} />;
    }

    return (
      <img
        src={uri}
        style={{
          width: "100%",

          height: "100%",

          objectFit: "contain",

          display: "block",
        }}
      />
    );
  }

  return (
    <Image source={source} style={styles.cardImage} resizeMode="contain" />
  );
}

function CharacterCard({
  back,

  front,

  isSelected,

  resetSignal,

  shouldFlip,

  onFlipComplete,
}: {
  back: any;

  front?: any;

  isSelected: boolean;

  resetSignal: number;

  shouldFlip: boolean;

  onFlipComplete: () => void;
}) {
  const styles = useThemedStyles(baseStyles);

  const rotation = useSharedValue(0);

  const opacity = useSharedValue(1);

  const [showFront, setShowFront] = useState(false);

  useEffect(() => {
    rotation.value = 0;

    opacity.value = 1;

    setShowFront(false);
  }, [resetSignal]);

  useEffect(() => {
    if (!shouldFlip || !front) {
      return;
    }

    rotation.value = withTiming(
      90,

      {
        duration: 700,
      },

      (finished) => {
        if (!finished) {
          return;
        }

        runOnJS(setShowFront)(true);

        rotation.value = -90;

        rotation.value = withTiming(0, {
          duration: 700,
        });
      },
    );

    const timer = setTimeout(() => {
      onFlipComplete();
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, [shouldFlip, front]);

  useEffect(() => {
    if (!isSelected) {
      return;
    }

    opacity.value = withTiming(1, {
      duration: 200,
    });
  }, [isSelected]);

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
    <Card style={styles.card}>
      <Animated.View style={[styles.face, animatedStyle]}>
        <CharacterImage source={showFront && front ? front : back} />
      </Animated.View>
    </Card>
  );
}

export default function CharacterSelection() {
  const styles = useThemedStyles(baseStyles);

  const cardFlipPlayer = useAudioPlayer(require("@/assets/sfx/card flip.mp3"));

  const playCardFlip = () => {

    void cardFlipPlayer.seekTo(0)
      .then(() => cardFlipPlayer.play())
      .catch((error) => console.error("ERRO NO SOM DE GIRO DA CARTA:", error));
  };

  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );

  const [pendingCharacter, setPendingCharacter] = useState<
    (typeof characters)[number] | null
  >(null);

  const [confirmedCharacterId, setConfirmedCharacterId] = useState<
    string | null
  >(null);

  const [pendingDifficulty, setPendingDifficulty] = useState<string | null>(
    null,
  );
  const [loadingDifficulty, setLoadingDifficulty] = useState(false);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [reservingId, setReservingId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
        const nextIds = snapshot.docs
          .filter((item) => item.data().ativo === true)
          .map((item) => item.id)
          .sort();
        setActiveIds((previous) =>
          previous.length === nextIds.length && previous.every((id, index) => id === nextIds[index])
            ? previous
            : nextIds,
        );
        setAvailabilityError(false);
        setAvailabilityLoaded(true);
      },
      (error) => {
        console.error("Erro ao sincronizar personagens ativos:", error);
        setAvailabilityError(true);
        setAvailabilityLoaded(true);
      },
    );
  }, []);

  const availableCharacters = useMemo(
    () => characters.filter((character) =>
      !activeIds.includes(character.id) ||
      character.id === reservingId ||
      character.id === confirmedCharacterId,
    ),
    [activeIds, reservingId, confirmedCharacterId],
  );
  const carouselCharacters = useMemo(
    () => Array.from({ length: 7 }, () => availableCharacters).flat(),
    [availableCharacters],
  );
  const initialIndex = availableCharacters.length * 3;
  const carouselKey = availableCharacters.map((item) => item.id).join("-");
  const pendingAlreadyActive = pendingCharacter !== null && activeIds.includes(pendingCharacter.id);


  const difficultyColors: Record<string, string> = {
    Facil: "#4CAF50",
    Fácil: "#4CAF50",
    Media: "#E0B341",
    Média: "#E0B341",
    "Media - Dificil": "#F28C38",
    "Média - Difícil": "#F28C38",
    Dificil: "#D94343",
    Difícil: "#D94343",
  };

  const [resetSignal, setResetSignal] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function checkSelectedCharacter() {
        const storedCharacter = await AsyncStorage.getItem("selectedCharacter");

        if (!active) {
          return;
        }

        if (storedCharacter) {
          router.replace("/");

          return;
        }

        setSelectedCharacter(null);

        setPendingCharacter(null);

        setConfirmedCharacterId(null);

        setResetSignal((current) => current + 1);

      }

      checkSelectedCharacter();

      return () => {
        active = false;
      };
    }, []),
  );

  const handleMomentumEnd = (event: any) => {
    const count = availableCharacters.length;
    if (count === 0) return;

    const rawIndex = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    const characterIndex = ((rawIndex % count) + count) % count;
    if (rawIndex < count || rawIndex >= count * 6) {
      flatListRef.current?.scrollToIndex({
        index: initialIndex + characterIndex,
        animated: false,
      });
    }
  };

  const handleCardPress = (character: (typeof characters)[number]) => {
    if (selectedCharacter || loadingDifficulty || selectionBusy ||
      !availabilityLoaded || availabilityError || activeIds.includes(character.id)) return;
    setSelectionError("");
    setPendingCharacter(character);
    setPendingDifficulty(null);
    setLoadingDifficulty(true);
  };

  useEffect(() => {
    if (!pendingCharacter) return;

    const unsubscribe = onSnapshot(
      doc(db, "characters", pendingCharacter.id),
      (snapshot) => {
        setPendingDifficulty(snapshot.exists() ? snapshot.data().dificuldade ?? null : null);
        setLoadingDifficulty(false);
      },
      (error) => {
        console.error("Erro ao sincronizar dificuldade do personagem:", error);
        setLoadingDifficulty(false);
      },
    );

    return unsubscribe;
  }, [pendingCharacter?.id]);

  const confirmSelection = async () => {
    if (!pendingCharacter || selectionBusy || loadingDifficulty ||
      !availabilityLoaded || availabilityError) return;

    const character = pendingCharacter;
    if (activeIds.includes(character.id)) {
      setSelectionError("Este personagem já foi escolhido por outro jogador.");
      return;
    }

    setSelectionError("");
    setSelectionBusy(true);
    setReservingId(character.id);

    try {
      await runTransaction(db, async (transaction) => {
        const characterRef = doc(db, "characters", character.id);
        const snapshot = await transaction.get(characterRef);

        if (!snapshot.exists()) throw new Error("CHARACTER_NOT_FOUND");
        if (snapshot.data().ativo === true) throw new Error("CHARACTER_ALREADY_ACTIVE");

        transaction.update(characterRef, { ativo: true });
      });

      await AsyncStorage.setItem("selectedCharacter", character.name);
      setSelectedCharacter(character.name);
      setPendingCharacter(null);
      setConfirmedCharacterId(character.id);
      playCardFlip();

      setTimeout(() => {
        router.replace({
          pathname: "/characters/reveal",
          params: { character: character.name },
        });
      }, 2200);
    } catch (error) {
      console.error("Erro ao selecionar personagem:", error);
      const alreadyActive = error instanceof Error && error.message === "CHARACTER_ALREADY_ACTIVE";
      const missing = error instanceof Error && error.message === "CHARACTER_NOT_FOUND";
      setSelectionError(alreadyActive
        ? "Este personagem já foi escolhido por outro jogador."
        : missing
          ? "Personagem não encontrado no Firebase."
          : "Não foi possível confirmar a escolha. Verifique sua conexão e tente novamente.");
      setSelectedCharacter(null);
      setConfirmedCharacterId(null);
      setReservingId(null);
    } finally {
      setSelectionBusy(false);
    }
  };

  const cancelSelection = () => {
    if (selectionBusy) return;
    setPendingCharacter(null);
    setSelectionError("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SELEÇÃO</Text>

      <Text style={styles.subtitle}>Escolha seu personagem</Text>

      {!availabilityLoaded ? (
        <Text style={styles.availabilityMessage}>VERIFICANDO PERSONAGENS...</Text>
      ) : availabilityError ? (
        <Text style={styles.availabilityMessage}>
          NÃO FOI POSSÍVEL CONSULTAR OS PERSONAGENS. VERIFIQUE SUA CONEXÃO.
        </Text>
      ) : availableCharacters.length === 0 ? (
        <Text style={styles.availabilityMessage}>TODOS OS PERSONAGENS ESTÃO EM USO.</Text>
      ) : (
      <FlatList
        key={carouselKey}
        ref={flatListRef}
        data={carouselCharacters}
        horizontal
        keyExtractor={(_, index) => `character-${index}`}
        showsHorizontalScrollIndicator={false}

        snapToInterval={SNAP_INTERVAL}

        snapToAlignment="center"

        decelerationRate="normal"

        disableIntervalMomentum={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SNAP_INTERVAL,

          offset: SNAP_INTERVAL * index,

          index,
        })}
        contentContainerStyle={styles.carousel}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Pressable
              onPress={() => handleCardPress(item)}
              disabled={selectedCharacter !== null || selectionBusy}
            >
              <CharacterCard
                back={item.back}
                front={item.front}
                isSelected={selectedCharacter === item.name}
                resetSignal={resetSignal}
                shouldFlip={confirmedCharacterId === item.id}
                onFlipComplete={() => {}}
              />
            </Pressable>
          </View>
        )}
      />
      )}

      {availabilityLoaded && !availabilityError && availableCharacters.length > 0 && (
        <Text style={styles.hint}>ARRASTE PARA O LADO</Text>
      )}

      <Modal
        visible={pendingCharacter !== null}
        transparent
        animationType="fade"
        onRequestClose={cancelSelection}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmation}>
            <View style={styles.warningLine} />

            <Text style={styles.modalTitle}>CONFIRMAR ESCOLHA</Text>

            <Text style={styles.modalMessage}>
              Tem certeza que quer escolher este personagem?
            </Text>

            <View style={styles.difficultyContainer}>
              <Text style={styles.difficultyLabel}>NÍVEL DE DIFICULDADE</Text>
              {loadingDifficulty ? (
                <Text style={styles.difficultyLoading}>CONSULTANDO...</Text>
              ) : (
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      borderColor:
                        difficultyColors[pendingDifficulty ?? ""] ?? "#777",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.difficultyText,
                      {
                        color:
                          difficultyColors[pendingDifficulty ?? ""] ?? "#AAA",
                      },
                    ]}
                  >
                    {pendingDifficulty ?? "Não informado"}
                  </Text>
                </View>
              )}
            </View>

            {pendingAlreadyActive || selectionError ? (
              <Text style={styles.selectionError}>
                {selectionError || "Este personagem já foi escolhido por outro jogador."}
              </Text>
            ) : (
              <Text style={styles.warningText}>
                ESSA ESCOLHA NÃO PODERÁ SER DESFEITA.
              </Text>
            )}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelSelection}
              >
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmSelection}
                disabled={loadingDifficulty || selectionBusy || pendingAlreadyActive}
              >
                <Text style={styles.confirmButtonText}>{selectionBusy ? "CONFIRMANDO..." : "CONFIRMAR ESCOLHA"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  availabilityMessage: {
    flex: 1,
    color: "#999",
    fontSize: 11,
    textAlign: "center",
    textAlignVertical: "center",
    letterSpacing: 1.2,
    marginHorizontal: 35,
  },
  selectionError: {
    color: "#c85c5c",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 18,
  },
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

  carousel: {
    alignItems: "center",
  },

  item: {
    width: SNAP_INTERVAL,

    alignItems: "center",

    justifyContent: "center",
  },

  card: {
    width: CARD_WIDTH,

    height: CARD_HEIGHT,

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

  hint: {
    color: "#444",

    fontSize: 10,

    letterSpacing: 2,

    textAlign: "center",

    marginTop: 5,

    marginBottom: 25,
  },

  modalOverlay: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.88)",

    justifyContent: "center",

    alignItems: "center",

    paddingHorizontal: 25,
  },

  confirmation: {
    width: "100%",

    maxWidth: 420,

    backgroundColor: "#080808",

    borderWidth: 1,

    borderColor: "#333",

    padding: 28,

    position: "relative",
  },

  warningLine: {
    position: "absolute",

    top: 0,

    left: 0,

    right: 0,

    height: 3,

    backgroundColor: "#9d1c1c",
  },

  modalTitle: {
    color: "#fff",

    fontSize: 18,

    fontWeight: "700",

    letterSpacing: 3,

    textAlign: "center",

    marginBottom: 20,
  },

  characterName: {
    color: "#bdbdbd",

    fontSize: 25,

    fontWeight: "700",

    letterSpacing: 4,

    textAlign: "center",

    marginBottom: 25,
  },

  modalMessage: {
    color: "#aaa",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },

  difficultyContainer: {
    alignItems: "center",
    marginTop: 22,
    gap: 10,
  },
  difficultyLabel: {
    color: "#777",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  difficultyBadge: {
    borderWidth: 1,
    backgroundColor: "#151515",
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 220,
    alignItems: "center",
    justifyContent: "center",
  },

  difficultyText: {
    fontSize: 14,
    lineHeight: 20,
    includeFontPadding: false,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    textAlign: "center",
    alignSelf: "stretch",
  },
  difficultyLoading: {
    color: "#888",
    fontSize: 12,
    letterSpacing: 2,
  },

  warningText: {
    color: "#b32a2a",

    fontSize: 11,

    fontWeight: "700",

    letterSpacing: 2,

    lineHeight: 18,

    textAlign: "center",

    marginTop: 18,
  },

  modalButtons: {
    marginTop: 30,

    gap: 10,
  },

  modalButton: {
    minHeight: 48,

    justifyContent: "center",

    alignItems: "center",

    borderWidth: 1,
  },

  cancelButton: {
    borderColor: "#333",

    backgroundColor: "#0d0d0d",
  },

  confirmButton: {
    borderColor: "#7d2020",

    backgroundColor: "#241010",
  },

  cancelButtonText: {
    color: "#777",

    fontSize: 11,

    fontWeight: "700",

    letterSpacing: 2,
  },

  confirmButtonText: {
    color: "#d7d7d7",

    fontSize: 11,

    fontWeight: "700",

    letterSpacing: 2,
  },
});
