import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase/config";
import { useThemedStyles } from "@/theme/useThemedStyles";

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const documents: Record<string, { title: string; image: any }> = {
  diarioAndrew1: {
    title: "DIÁRIO DE ANDREW — 01",
    image: require("./files/diárioAndrew1.png"),
  },
  diarioAndrew2: {
    title: "DIÁRIO DE ANDREW — 02",
    image: require("./files/diárioAndrew2.png"),
  },
  diarioAndrew3: {
    title: "DIÁRIO DE ANDREW — 03",
    image: require("./files/diárioAndrew3.png"),
  },
  diarioAndrew4: {
    title: "DIÁRIO DE ANDREW — 04",
    image: require("./files/diárioAndrew4.png"),
  },
  diarioObsidiana: {
    title: "DIÁRIO DA LUCILLA",
    image: require("./files/diarioObsidiana.png"),
  },

  admissao005: {
    title: "ADMISSÃO #005",
    image: require("./files/Admissão 005.png"),
  },
  admissao007: {
    title: "ADMISSÃO #007",
    image: require("./files/Admissão 007.png"),
  },
  admissao041: {
    title: "ADMISSÃO #041",
    image: require("./files/Admissão 041.png"),
  },
  admissao089: {
    title: "ADMISSÃO #089",
    image: require("./files/Admissão 089.png"),
  },
  admissao230: {
    title: "ADMISSÃO #230",
    image: require("./files/Admissão 230.png"),
  },
  admissaoHorn: {
    title: "ADMISSÃO — HORN SILVERSKIN",
    image: require("./files/admissaoHorn Silverskin.png"),
  },
  admissaoReymond: {
    title: "ADMISSÃO — REYMOND SUNFURY",
    image: require("./files/admissaoReymond Sunfury.png"),
  },

  arsenalAlice: {
    title: "ARSENAL DA ALA LESTE — ARMÁRIO ALICE",
    image: require("./files/Arsenal da Ala Leste ARMARIO ALICE.png"),
  },
  objetivo: {
    title: "Como Ativar o Elevador de Emergência",
    image: require("./files/Objetivo.png"),
  },

  transcricaoInterrogatorio: {
    title: "TRANSCRIÇÃO — REYMOND SUNFURY",
    image: require("./files/Transcrição_Interrogatório_Reymond-Sunfury-01.png"),
  },

  experimento01: {
    title: "EXPERIMENTO 01",
    image: require("./files/Experimento01.png"),
  },
  experimentoBanshee: {
    title: "EXPERIMENTO BANSHEE",
    image: require("./files/ExperimentoBanshee.png"),
  },
  experimentoInchado: {
    title: "EXPERIMENTO INCHADO",
    image: require("./files/ExperimentoInchado.png"),
  },
  experimentoMastodonte: {
    title: "EXPERIMENTO MASTODONTE",
    image: require("./files/ExperimentoMastodonte.png"),
  },

  advertenciaKasper: {
    title: "ADVERTÊNCIA — KASPER",
    image: require("./files/Advertência Kasper.png"),
  },
  cartaHarold: {
    title: "CARTA DUPLA DE HAROLD VALTESIA",
    image: require("./files/Carta Dupla de Harold Valtesia.png"),
  },
  kasperDrakeRoy: {
    title: "PEDIDO DE DRAKE",
    image: require("./files/Kasper Drake Roy.png"),
  },
  emailRoyHana: {
    title: "E-MAIL — PRESSÃO DA CÂMARA ROY / HANA",
    image: require("./files/email pressao roy hana.png"),
  },
  emailRhJordan: {
    title: "E-MAIL — RH E JORDAN",
    image: require("./files/E-mail RH e Jordan.png"),
  },
  emailRoyOliver: {
    title: "E-MAIL — LIBERAÇÃO ROY / OLIVER",
    image: require("./files/E-mail Roy e Oliver.png"),
  },
  lochlanKiara01: {
    title: "BILHETES LOCHLAN / KIARA — 01",
    image: require("./files/Lochlan-Kiara01.png"),
  },
  lochlanKiara02: {
    title: "BILHETES LOCHLAN / KIARA — 02",
    image: require("./files/Lochlan-Kiara02.png"),
  },
  lochlanRefem: {
    title: "LOCHLAN — REFÉM",
    image: require("./files/LochlanRefem.png"),
  },
  kiaraRefem: {
    title: "KIARA — REFÉM",
    image: require("./files/KiaraRefem.png"),
  },

  sessao1: {
    title: "Mapa da Ala de Contenção",
    image: require("./files/Sessão 1.png"),
  },
  memorandoMilitar: {
    title: "MEMORANDO MILITAR DO GRANDE LESTE",
    image: require("./files/Memorando Militar do Grande Leste.png"),
  },
  orcamentoObsidiana: {
    title: "ORÇAMENTO INDUSTRIAL DE OBSIDIANA",
    image: require("./files/Orçamento Industrial de Obsidiana.png"),
  },
  transferenciaCompostos: {
    title: "TRANSFERÊNCIA INTERNA — COMPOSTOS",
    image: require("./files/Transferência Interna Compostos.png"),
  },

  ciborgueEnfaixado: {
    title: "CIBORGUE ENFAIXADO",
    image: require("./files/Ciborgue Enfaixado.png"),
  },
  laboratorioCibernetica: {
    title: "LABORATÓRIO DE AUGMENTAÇÃO CIBERNÉTICA",
    image: require("./files/Laboratório de Augmentação Cibernética.png"),
  },
  montagemCibernetica: {
    title: "MONTAGEM CIBERNÉTICA — LABORATÓRIO VALTESIA",
    image: require("./files/Montagem Cibernética no Laboratório Valtesia.png"),
  },
};

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;

export default function DocumentViewer() {
  const styles = useThemedStyles(baseStyles);

  const { document } = useLocalSearchParams<{
    document?: string;
  }>();

  const [accessStatus, setAccessStatus] = useState<"checking" | "granted" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setAccessStatus("checking");

    void (async () => {
      try {
        const [mode, selected] = await Promise.all([
          AsyncStorage.getItem("userMode"),
          AsyncStorage.getItem("selectedCharacter"),
        ]);
        if (cancelled) return;

        if (mode === "gm") {
          setAccessStatus("granted");
          return;
        }

        const characterIds: Record<string, string> = {
          ciborgue: "cyborg", cyborg: "cyborg", tengu: "tengu",
          elfo: "elf", elf: "elf", tiefling: "tiefling",
          draconata: "dragonborn", dragonborn: "dragonborn",
        };
        const characterId = characterIds[selected?.trim().toLowerCase() ?? ""];
        if (!characterId || typeof document !== "string") {
          setAccessStatus("denied");
          return;
        }

        unsubscribe = onSnapshot(
          doc(db, "characters", characterId, "documentAccess", document),
          (snapshot) => {
            if (!cancelled) {
              setAccessStatus(snapshot.exists() && snapshot.data().liberado === true ? "granted" : "denied");
            }
          },
          (error) => {
            console.error("ERRO AO VERIFICAR ACESSO AO DOCUMENTO:", error);
            if (!cancelled) setAccessStatus("denied");
          },
        );
      } catch (error) {
        console.error("ERRO AO IDENTIFICAR LEITOR DO DOCUMENTO:", error);
        if (!cancelled) setAccessStatus("denied");
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [document]);

  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const item = documents[String(document ?? "")];
  const source = item ? Image.resolveAssetSource(item.image) : null;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);

  const translateX = useSharedValue(0);
  const savedX = useSharedValue(0);

  const translateY = useSharedValue(0);
  const savedY = useSharedValue(0);

  const availableWidth = width - 24;
  const availableHeight =
    height - insets.top - insets.bottom - 110;

  const imageRatio =
    source?.width && source?.height
      ? source.width / source.height
      : 1;

  const baseWidth = Math.max(
    1,
    Math.min(availableWidth, availableHeight * imageRatio),
  );

  const baseHeight = baseWidth / imageRatio;

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, savedScale.value * event.scale),
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotate = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onUpdate((event) => {
      translateX.value = savedX.value + event.translationX;
      translateY.value = savedY.value + event.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const gestures = Gesture.Simultaneous(pinch, rotate, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${rotation.value}rad` },
      { scale: scale.value },
    ],
  }));

  function resetImage() {
    scale.value = 1;
    savedScale.value = 1;

    rotation.value = 0;
    savedRotation.value = 0;

    translateX.value = 0;
    savedX.value = 0;

    translateY.value = 0;
    savedY.value = 0;
  }

  if (accessStatus !== "granted") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.controlText}>‹ VOLTAR</Text>
        </Pressable>
        <View style={styles.error}>
          <Text style={styles.errorTitle}>
            {accessStatus === "checking" ? "VERIFICANDO ACESSO" : "DOCUMENTO BLOQUEADO"}
          </Text>
          <Text style={styles.muted}>
            {accessStatus === "checking"
              ? "Consultando as permissões do arquivo..."
              : "Este documento não está liberado para o personagem."}
          </Text>
        </View>
      </View>
    );
  }

  if (!item || !source) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.controlText}>‹ VOLTAR</Text>
        </Pressable>

        <View style={styles.error}>
          <Text style={styles.errorTitle}>
            DOCUMENTO NÃO ENCONTRADO
          </Text>

          <Text style={styles.muted}>
            Verifique o ID e o nome do PNG no catálogo.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top },
        ]}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.controlText}>‹ VOLTAR</Text>
        </Pressable>

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <Pressable
          style={styles.resetButton}
          onPress={resetImage}
        >
          <Text style={styles.controlText}>RESET</Text>
        </Pressable>
      </View>

      <View style={styles.canvas}>
        <GestureDetector gesture={gestures}>
          <Animated.View
            style={[
              {
                width: baseWidth,
                height: baseHeight,
              },
              animatedStyle,
            ]}
          >
            <Image
              source={item.image}
              resizeMode="stretch"
              style={styles.image}
            />
          </Animated.View>
        </GestureDetector>
      </View>

      <Text
        style={[
          styles.hint,
          { paddingBottom: Math.max(insets.bottom, 10) },
        ]}
      >
        PINÇA: ZOOM · GIRE DOIS DEDOS: ROTAÇÃO · ARRASTE: MOVER
      </Text>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  header: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#292929",
  },

  backButton: {
    paddingVertical: 12,
    paddingRight: 8,
  },

  headerTitle: {
    flex: 1,
    color: "#aaa",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 1,
  },

  resetButton: {
    padding: 10,
  },

  controlText: {
    color: "#ddd",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },

  canvas: {
    flex: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  hint: {
    color: "#666",
    fontSize: 8,
    textAlign: "center",
    paddingTop: 10,
    letterSpacing: 0.6,
  },

  error: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  errorTitle: {
    color: "#fff",
    fontWeight: "800",
    marginBottom: 12,
  },

  muted: {
    color: "#777",
    fontSize: 11,
    textAlign: "center",
  },
});
