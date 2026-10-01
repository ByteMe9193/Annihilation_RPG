import React, { useCallback, useEffect, useRef, useState } from "react";

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

/*
 * Repetimos os personagens várias vezes
 * para criar o efeito de carrossel infinito.
 */
const carouselCharacters = Array.from({ length: 7 }, () => characters).flat();

const INITIAL_INDEX = characters.length * 3;

function CharacterImage({ source }: { source: any }) {
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
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  const [showFront, setShowFront] = useState(false);

  /*
   * Reseta a carta quando o sistema é reiniciado.
   */
  useEffect(() => {
    rotation.value = 0;
    opacity.value = 1;
    setShowFront(false);
  }, [resetSignal]);

  /*
   * A carta só gira depois da confirmação.
   */
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
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );

  const [pendingCharacter, setPendingCharacter] = useState<
    (typeof characters)[number] | null
  >(null);

  const [confirmedCharacterId, setConfirmedCharacterId] = useState<
    string | null
  >(null);

  const [resetSignal, setResetSignal] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  /*
   * Verifica se já existe personagem
   * selecionado neste dispositivo.
   */
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

        /*
         * Volta para o bloco central
         * do carrossel.
         */
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: INITIAL_INDEX,
            animated: false,
          });
        }, 50);
      }

      checkSelectedCharacter();

      return () => {
        active = false;
      };
    }, []),
  );

  /*
   * Mantém o carrossel aparentemente infinito.
   *
   * Quando chegamos perto das extremidades,
   * reposicionamos para o mesmo personagem
   * no bloco central sem animação.
   */
  const handleMomentumEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;

    const rawIndex = Math.round(offsetX / SNAP_INTERVAL);

    const characterIndex =
      ((rawIndex % characters.length) + characters.length) % characters.length;

    if (rawIndex < characters.length || rawIndex >= characters.length * 6) {
      const normalizedIndex = INITIAL_INDEX + characterIndex;

      flatListRef.current?.scrollToIndex({
        index: normalizedIndex,
        animated: true,
      });
    }
  };

  /*
   * Primeiro toque:
   * apenas abre a confirmação.
   */
  const handleCardPress = (character: (typeof characters)[number]) => {
    if (selectedCharacter) {
      return;
    }

    setPendingCharacter(character);
  };

  /*
   * Confirmação definitiva.
   *
   * Somente aqui:
   * - salva no AsyncStorage
   * - ativa no Firestore
   * - libera o flip
   */
  const confirmSelection = async () => {
    if (!pendingCharacter) {
      return;
    }

    const character = pendingCharacter;

    try {
      setSelectedCharacter(character.name);

      setPendingCharacter(null);

      /*
       * Salva o personagem selecionado
       * neste dispositivo.
       */
      await AsyncStorage.setItem("selectedCharacter", character.name);

      /*
       * Marca o personagem como ativo
       * na sessão.
       */
      await updateDoc(doc(db, "characters", character.id), {
        ativo: true,
      });

      console.log(`🟢 PERSONAGEM ATIVADO: ${character.name} (${character.id})`);

      /*
       * Agora a carta pode girar.
       */
      setConfirmedCharacterId(character.id);

      /*
       * Aguarda a animação antes
       * de entrar no Reveal.
       */
      setTimeout(() => {
        router.replace({
          pathname: "/characters/reveal",
          params: {
            character: character.name,
          },
        });
      }, 2200);
    } catch (error) {
      console.error("❌ ERRO AO ATIVAR PERSONAGEM:", error);

      /*
       * Se houver erro, desfaz
       * a seleção local.
       */
      setSelectedCharacter(null);
      setConfirmedCharacterId(null);

      await AsyncStorage.removeItem("selectedCharacter");
    }
  };

  const cancelSelection = () => {
    setPendingCharacter(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SELEÇÃO</Text>

      <Text style={styles.subtitle}>Escolha seu personagem</Text>

      <FlatList
        ref={flatListRef}
        data={carouselCharacters}
        horizontal
        keyExtractor={(_, index) => `character-${index}`}
        showsHorizontalScrollIndicator={false}
        /*
         * Cada carta ocupa exatamente
         * este intervalo.
         */
        snapToInterval={SNAP_INTERVAL}
        /*
         * O snap fica centralizado
         * na tela.
         */
        snapToAlignment="center"
        /*
         * Deslizamento mais suave.
         */
        decelerationRate="normal"
        /*
         * Permite que o usuário tenha
         * mais liberdade no arraste.
         */
        disableIntervalMomentum={false}
        initialScrollIndex={INITIAL_INDEX}
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
              disabled={selectedCharacter !== null}
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

      <Text style={styles.hint}>ARRASTE PARA O LADO</Text>

      {/* ========================= */}
      {/* CONFIRMAÇÃO DE PERSONAGEM */}
      {/* ========================= */}

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

            <Text style={styles.warningText}>
              ESSA ESCOLHA NÃO PODERÁ SER DESFEITA.
            </Text>

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
              >
                <Text style={styles.confirmButtonText}>CONFIRMAR ESCOLHA</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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

  /*
   * Sem padding lateral.
   *
   * O próprio item possui a largura
   * necessária para o snap central.
   */
  carousel: {
    alignItems: "center",
  },

  /*
   * Cada item é um intervalo completo.
   *
   * A carta ocupa 80% da tela e o
   * espaço restante cria a pequena
   * abertura para as cartas vizinhas.
   */
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

  /*
   * =========================
   * MODAL
   * =========================
   */

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
