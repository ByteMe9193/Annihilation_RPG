import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { PaperProvider, Snackbar, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import Constants from "expo-constants";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { doc, increment, onSnapshot, updateDoc } from "firebase/firestore";

import { db } from "@/services/firebase/config";
import { tenguHasOpportunityCard } from "@/services/tenguOpportunity";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { BottomNavigation } from "@/components/BottomNavigation";
import { DestructionCountdown } from "@/components/DestructionCountdown";
import { CustomCountdown } from "@/components/CustomCountdown";
import { NpcUnlockPopup } from "@/components/NpcUnlockPopup";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router/react-navigation";
import { AppThemeProvider, useAppTheme } from "@/theme/AppTheme";
import type { AppThemeColors } from "@/theme/AppTheme";

SplashScreen.preventAutoHideAsync();

type ClassId =
  | "Duelista"
  | "Infiltrador"
  | "Arcanista"
  | "Guardião"
  | "Técnico"
  | "Sobrevivente";

type ClassData = {
  id: ClassId;
  descricao: string;
  efeitos: string[];
  simbolo: string;
};

const isExpoGo = Constants.executionEnvironment === "storeClient";

async function setDeviceVolume(volume: number) {
  if (isExpoGo) {
    return;
  }

  try {
    const { VolumeManager } = require("react-native-volume-manager");

    await VolumeManager.setVolume(volume, {
      type: "music",
      showUI: false,
      playSound: false,
    });
  } catch (error) {
    console.warn("VolumeManager indisponível:", error);
  }
}

const classes: ClassData[] = [
  {
    id: "Duelista",
    simbolo: "⚔",
    descricao:
      "Você é uma força da natureza destinada a ser uma máquina de combate. Suas memórias revelam que antes de tudo isso, você era um guerrilheiro, isso te preenche com uma força interior.",
    efeitos: ["+3 FOR", "+1 VIG", "+1 AGI", "+10 Vida Máxima"],
  },

  {
    id: "Infiltrador",
    simbolo: "◈",
    descricao:
      "Você se lembra de seu dever e instinto natural. Suas memórias revelam que antes disso tudo, você era um assassino treinado, isso traz à tona seu passado sombrio e a habilidade de acertar praticamente todos os seus golpes.",
    efeitos: ["+3 DES", "+2 AGI", "+2 Vida Máxima", "+5 Evasão"],
  },

  {
    id: "Arcanista",
    simbolo: "✦",
    descricao:
      "Você se lembra de sua vida acadêmica e sua habilidade natural com magia. Suas memórias revelam que antes disso tudo, você era um arcanista poderoso, isso te permite lançar magias em uma escala maior.",
    efeitos: ["+4 INT", "+1 DES", "+3 Vida Máxima", "+2 Evasão"],
  },

  {
    id: "Guardião",
    simbolo: "✚",
    descricao:
      "Você se lembra de sua vida passada cuidando dos feridos e indefesos. Suas memórias revelam que antes de tudo isso, você era um médico de batalha, isso te permite curar com mais eficiência e proteger seus aliados de golpes letais.",
    efeitos: ["+3 VIG", "+1 AGI", "+1 INT", "+10 Vida Máxima"],
  },

  {
    id: "Técnico",
    simbolo: "⚙",
    descricao:
      "Você se lembra que ama descobrir coisas novas. Suas memórias revelam que antes dessa bagunça, você era um faz tudo, isso te permite hackear terminais, operar rádios com eficiência e perceber coisas que apenas olhos curiosos e detalhistas perceberiam.",
    efeitos: ["+3 INT", "+2 PRE", "+4 Vida Máxima", "+2 Evasão"],
  },

  {
    id: "Sobrevivente",
    simbolo: "◇",
    descricao:
      "Você se lembra de ter uma vida sofrida, sem um lugar fixo, sem raízes, sem alguém para voltar. Suas memórias revelam que antes de ser pego, você era um sobrevivente, isso te permite um equilíbrio de atributos e uma tendência a conseguir mais o que deseja.",
    efeitos: ["+2 FOR", "+2 VIG", "+1 AGI", "+5 Vida Máxima"],
  },
];

const firebaseIds: Record<string, string> = {
  Ciborgue: "cyborg",
  Tengu: "tengu",
  Elfo: "elf",
  Tiefling: "tiefling",
  Draconata: "dragonborn",
};

type AlertData = {
  ativo?: boolean;
  porcentagem?: number;
  disparo?: number;
};

const ALERT_CONTENT_GAP = 2;

type AlertBarProps = {
  onOccupiedHeightChange: (height: number) => void;
};

function AlertBar({ onOccupiedHeightChange }: AlertBarProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [alert, setAlert] = useState<AlertData>({
    ativo: false,
    porcentagem: 0,
    disparo: 0,
  });

  const progress = useState(() => new Animated.Value(0))[0];

  const bloomOpacity = useState(() => new Animated.Value(0.12))[0];

  const soundRef = useState<{
    current: ReturnType<typeof createAudioPlayer> | null;
  }>(() => ({
    current: null,
  }))[0];

  useEffect(() => {
    const alertRef = doc(db, "game", "alert");

    return onSnapshot(
      alertRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setAlert({
            ativo: false,
            porcentagem: 0,
            disparo: 0,
          });

          return;
        }

        const data = snapshot.data();

        setAlert({
          ativo: data.ativo === true,
          porcentagem: Math.max(
            0,
            Math.min(100, Number(data.porcentagem) || 0),
          ),
          disparo: Number(data.disparo) || 0,
        });
      },
      (error) => {
        console.error("❌ ERRO AO SINCRONIZAR BARRA DE ALERTA:", error);
      },
    );
  }, []);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: alert.porcentagem,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [alert.porcentagem, progress]);

  const alarmActive = alert.ativo && alert.porcentagem >= 100;

  useEffect(() => {
    if (!alarmActive) {
      bloomOpacity.stopAnimation();

      Animated.timing(bloomOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const sound = soundRef.current;
      soundRef.current = null;

      if (sound) {
        sound.pause();
        sound.remove();
      }

      return;
    }

    bloomOpacity.setValue(0.22);

    Animated.loop(
      Animated.sequence([
        Animated.timing(bloomOpacity, {
          toValue: 1.0,
          duration: 420,
          useNativeDriver: true,
        }),

        Animated.timing(bloomOpacity, {
          toValue: 0.12,
          duration: 420,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    let cancelled = false;

    (async () => {
      try {
        const userMode = await AsyncStorage.getItem("userMode");


        if (cancelled || userMode === "gm") {
          return;
        }

        try {
          await setDeviceVolume(0.5);
        } catch (error) {
          console.error("❌ ERRO AO AJUSTAR VOLUME FÍSICO:", error);
        }

        if (cancelled) {
          return;
        }

        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: "duckOthers",
        });

        if (cancelled) {
          return;
        }

        const player = createAudioPlayer(require("@/assets/sfx/alarm.mp3"));

        player.loop = true;
        player.volume = 1.0;

        if (cancelled) {
          player.pause();
          player.remove();
          return;
        }

        soundRef.current = player;

        player.play();
      } catch (error) {
        console.error("❌ ERRO AO ATIVAR ALERTA SONORO:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [alarmActive, bloomOpacity, soundRef]);


  useEffect(() => {
    return () => {
      const sound = soundRef.current;

      if (sound) {
        sound.pause();
        sound.remove();
      }
    };
  }, [soundRef]);

  useEffect(() => {
    if (!alert.ativo) {
      onOccupiedHeightChange(0);
    }
  }, [alert.ativo, onOccupiedHeightChange]);

  if (!alert.ativo) {
    return null;
  }

  const alertTop = Math.max(insets.top + 7, 14);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const bloomSize = Math.max(width * 0.72, 260);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {alarmActive && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.alertBloomLayer,
            {
              opacity: bloomOpacity,
            },
          ]}
        >
          <Svg width={width} height={height}>
            <Defs>
              <RadialGradient id="alertBloom" cx="0%" cy="0%" r="100%">
                <Stop offset="0%" stopColor="#ff0000" stopOpacity="1" />

                <Stop offset="28%" stopColor="#ff0000" stopOpacity="0.62" />

                <Stop offset="62%" stopColor="#ff0000" stopOpacity="0.22" />

                <Stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            <Circle cx={0} cy={0} r={bloomSize} fill="url(#alertBloom)" />

            <Circle
              cx={width}
              cy={0}
              r={bloomSize}
              fill="url(#alertBloom)"
              transform={`rotate(90 ${width} 0)`}
            />

            <Circle
              cx={0}
              cy={height}
              r={bloomSize}
              fill="url(#alertBloom)"
              transform={`rotate(-90 0 ${height})`}
            />

            <Circle
              cx={width}
              cy={height}
              r={bloomSize}
              fill="url(#alertBloom)"
              transform={`rotate(180 ${width} ${height})`}
            />
          </Svg>
        </Animated.View>
      )}

      <View
        style={[
          styles.alertOverlay,
          {
            top: alertTop,
          },
        ]}
      >
        <View
          style={styles.alertFrame}
          onLayout={(event) => {
            const occupiedHeight = Math.max(
              0,
              alertTop +
                event.nativeEvent.layout.height -
                insets.top +
                ALERT_CONTENT_GAP,
            );
            onOccupiedHeightChange(occupiedHeight);
          }}
        >
          <View style={styles.alertHeader}>
            <Text style={styles.alertLabel}>ALERTA</Text>

            <Text style={styles.alertPercentage}>{alert.porcentagem}%</Text>
          </View>

          <View style={styles.alertTrack}>
            <Animated.View
              style={[
                styles.alertProgress,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function RootLayoutContent() {
  const pathname = usePathname();
  const [alertOccupiedHeight, setAlertOccupiedHeight] = useState(0);
  const onAlertOccupiedHeightChange = useCallback((height: number) => {
    setAlertOccupiedHeight((previous) =>
      Math.abs(previous - height) < 1 ? previous : height,
    );
  }, []);
  const reserveAlertSpace = pathname !== "/gm" && pathname !== "/characters";
  const { mode, colors } = useAppTheme();
  const themeStyles = createLayoutThemeStyles(colors);
  const paperTheme = useMemo(() => ({
    ...(mode === "dark" ? MD3DarkTheme : MD3LightTheme),
    colors: {
      ...(mode === "dark" ? MD3DarkTheme.colors : MD3LightTheme.colors),
      primary: colors.accent,
      background: colors.background,
      surface: colors.surface,
      onSurface: colors.text,
      outline: colors.border,
    },
  }), [mode, colors]);
  const navigationTheme = useMemo(() => ({
    ...(mode === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  }), [mode, colors]);
  const { width: screenWidth } = useWindowDimensions();

  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null,
  );

  const [classModalVisible, setClassModalVisible] = useState(false);

  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);

  const [loadingClassChoice, setLoadingClassChoice] = useState(false);

  const [tenguNotificationVisible, setTenguNotificationVisible] = useState(false);
  const lastTenguEvent = useRef<number | null>(null);
  const tenguNotificationGeneration = useRef(0);

  useEffect(() => {
    let active = true;

    const unsubscribe = onSnapshot(
      doc(db, "game", "tenguOpportunity"),
      (snapshot) => {
        if (snapshot.metadata.fromCache) return;

        const current = snapshot.exists()
          ? Number(snapshot.data().disparo) || 0
          : 0;

        if (lastTenguEvent.current === null) {
          lastTenguEvent.current = current;
          return;
        }

        if (current <= lastTenguEvent.current) return;
        lastTenguEvent.current = current;

        const sentAt = snapshot.data()?.atualizadoEm;
        const timestamp =
          sentAt && typeof sentAt.toMillis === "function"
            ? sentAt.toMillis()
            : null;

        if (!timestamp || Math.abs(Date.now() - timestamp) > 30000) return;

        const generation = ++tenguNotificationGeneration.current;

        void (async () => {
          try {
            const [selected, mode] = await Promise.all([
              AsyncStorage.getItem("selectedCharacter"),
              AsyncStorage.getItem("userMode"),
            ]);

            if (!active || mode !== "player" || selected?.trim().toLowerCase() !== "tengu") {
              return;
            }

            if (!(await tenguHasOpportunityCard())) return;
            if (!active || generation !== tenguNotificationGeneration.current) return;

            setTenguNotificationVisible(true);
          } catch (error) {
            console.error("ERRO AO RECEBER NOTIFICAÇÃO DO TENGU:", error);
          }
        })();
      },
      (error) => {
        console.error("ERRO AO SINCRONIZAR NOTIFICAÇÕES DO TENGU:", error);
      },
    );

    return () => {
      active = false;
      tenguNotificationGeneration.current += 1;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    async function loadSelectedCharacter() {
      try {
        const character = await AsyncStorage.getItem("selectedCharacter");

        setSelectedCharacter(character);
      } catch (error) {
        console.error("❌ ERRO AO RECUPERAR PERSONAGEM SELECIONADO:", error);
      }
    }

    void loadSelectedCharacter();
  }, [pathname]);

  useEffect(() => {
    const sessionRef = doc(db, "game", "session");

    const unsubscribe = onSnapshot(
      sessionRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const data = snapshot.data();

        const sessaoBloqueada = data.bloqueada === true;

        if (!sessaoBloqueada) {
          return;
        }

        const userMode = await AsyncStorage.getItem("userMode");

        if (userMode === "gm") {
          return;
        }

        router.replace("/");
      },
      (error) => {
        console.error("❌ ERRO AO SINCRONIZAR BLOQUEIO DA SESSÃO:", error);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    const exitSession = async () => {
      if (cancelled) return;
      await AsyncStorage.multiRemove(["selectedCharacter", "userMode", "gmSessionVersion"]);
      if (cancelled) return;
      setSelectedCharacter(null);
      setClassModalVisible(false);
      router.replace("/");
    };

    void (async () => {
      const mode = await AsyncStorage.getItem("userMode");
      if (cancelled) return;
      if (pathname.startsWith("/gm") && mode !== "gm") {
        void exitSession();
        return;
      }
      if (mode === "gm") {
        const stored = await AsyncStorage.getItem("gmSessionVersion");
        if (cancelled) return;
        unsubscribe = onSnapshot(doc(db, "game", "session"), (snapshot) => {
          if (snapshot.metadata.fromCache) return;
          const current = Number(snapshot.data()?.resetVersion) || 0;
          if (stored === null || current !== Number(stored)) void exitSession();
        }, (error) => console.error("ERRO AO VALIDAR SESSÃO DO MESTRE:", error));
        return;
      }
      if (mode !== "player" || !selectedCharacter) return;
      const characterId = firebaseIds[selectedCharacter];
      if (!characterId) return;
      unsubscribe = onSnapshot(doc(db, "characters", characterId), (snapshot) => {
        if (snapshot.metadata.fromCache) return;
        if (!snapshot.exists() || snapshot.data().ativo !== true) void exitSession();
      }, (error) => console.error("ERRO AO VALIDAR PERSONAGEM ATIVO:", error));
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [pathname, selectedCharacter]);

  useEffect(() => {
    if (!selectedCharacter) {
      setClassModalVisible(false);
      return;
    }

    const characterId = firebaseIds[selectedCharacter];

    if (!characterId) {
      return;
    }

    const userModePromise = AsyncStorage.getItem("userMode");

    let unsubscribeCharacter: (() => void) | null = null;

    let cancelled = false;

    async function startClassListener() {
      const userMode = await userModePromise;

      if (cancelled) {
        return;
      }

      if (userMode === "gm") {
        setClassModalVisible(false);
        return;
      }

      const characterRef = doc(db, "characters", characterId);

      unsubscribeCharacter = onSnapshot(
        characterRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            return;
          }

          const data = snapshot.data();

          const eventoLiberado = data.eventoClasseLiberado === true;

          const classeAtual = data.classe ?? null;

          if (eventoLiberado && !classeAtual) {
            setClassModalVisible(true);
            return;
          }

          setClassModalVisible(false);
          setSelectedClass(null);
        },
        (error) => {
          console.error("❌ ERRO AO SINCRONIZAR EVENTO DE CLASSE:", error);
        },
      );
    }

    startClassListener();

    return () => {
      cancelled = true;

      if (unsubscribeCharacter) {
        unsubscribeCharacter();
      }
    };
  }, [selectedCharacter]);

  async function chooseClass(classData: ClassData) {
    if (!selectedCharacter || loadingClassChoice) {
      return;
    }

    const characterId = firebaseIds[selectedCharacter];

    if (!characterId) {
      return;
    }

    try {
      setLoadingClassChoice(true);
      setSelectedClass(classData);

      const characterRef = doc(db, "characters", characterId);

      const updates: Record<string, any> = {
        classe: classData.id,
        eventoClasseLiberado: false,
      };

      switch (classData.id) {
        case "Duelista":
          updates.forca = increment(3);
          updates.vigor = increment(1);
          updates.agilidade = increment(1);
          updates.vidaMaxima = increment(10);
          break;

        case "Infiltrador":
          updates.destreza = increment(3);
          updates.agilidade = increment(2);
          updates.vidaMaxima = increment(2);
          updates.evasao = increment(5);
          break;

        case "Arcanista":
          updates.intelecto = increment(4);
          updates.destreza = increment(1);
          updates.vidaMaxima = increment(3);
          updates.evasao = increment(2);
          break;

        case "Guardião":
          updates.vigor = increment(3);
          updates.agilidade = increment(1);
          updates.intelecto = increment(1);
          updates.vidaMaxima = increment(10);
          break;

        case "Técnico":
          updates.intelecto = increment(3);
          updates.presenca = increment(2);
          updates.vidaMaxima = increment(4);
          updates.evasao = increment(2);
          break;

        case "Sobrevivente":
          updates.forca = increment(2);
          updates.vigor = increment(2);
          updates.agilidade = increment(1);
          updates.vidaMaxima = increment(5);
          updates.evasao = increment(5);
          break;
      }

      await updateDoc(characterRef, updates);

      setClassModalVisible(false);
      setSelectedClass(null);
    } catch (error) {
      console.error("❌ ERRO AO ESCOLHER CLASSE:", error);

      setSelectedClass(null);
    } finally {
      setLoadingClassChoice(false);
    }
  }

  const classList = useMemo(() => classes, []);

  const modalWidth = Math.min(screenWidth - 36, 520);

  return (
    <ThemeProvider value={navigationTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PaperProvider theme={paperTheme}>
            <StatusBar
              barStyle={mode === "dark" ? "light-content" : "dark-content"}
              backgroundColor={colors.background}
            />
            <View style={[styles.container, themeStyles.container]}>
            <View
              style={[
                styles.stack,
                reserveAlertSpace && alertOccupiedHeight > 0
                  ? { paddingTop: alertOccupiedHeight }
                  : null,
              ]}
            >
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: colors.background,
                  },
                }}
              />
            </View>

            <BottomNavigation />
          </View>

          <AnimatedSplashOverlay />

          <AlertBar onOccupiedHeightChange={onAlertOccupiedHeightChange} />

          <DestructionCountdown />
          <CustomCountdown />

          <Snackbar
            visible={tenguNotificationVisible}
            onDismiss={() => setTenguNotificationVisible(false)}
            duration={4500}
            style={styles.tenguNotification}
            wrapperStyle={styles.tenguNotificationWrapper}
            elevation={0}
          >
            <Text style={styles.tenguNotificationMessage}>
              <Ionicons name="eye-outline" size={19} color="#e9bfc0" />
              {"  "}Um inimigo próximo está com menos de 25% de vida.
            </Text>
          </Snackbar>

          <Modal
            visible={classModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => {}}
          >
            <View style={[styles.classModalOverlay, themeStyles.classModalOverlay]}>
              <View style={[styles.classModal, themeStyles.classModal]}>
                <Text style={[styles.classEventLabel, themeStyles.classEventLabel]}>EVENTO DESBLOQUEADO</Text>

                <Text style={[styles.classTitle, themeStyles.classTitle]}>ESCOLHA SUA CLASSE</Text>

                <Text style={[styles.classSubtitle, themeStyles.classSubtitle]}>
                  Suas memórias começam a retornar.
                  {"\n"}
                  Escolha aquilo que você era antes de tudo isso.
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={modalWidth}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum={true}
                  bounces={false}
                  style={styles.classCarousel}
                  contentContainerStyle={styles.classScroll}
                >
                  {classList.map((classData) => (
                    <View
                      key={classData.id}
                      style={[
                        styles.classPage,
                        {
                          width: modalWidth,
                        },
                      ]}
                    >
                      <View style={[styles.classCard, themeStyles.classCard]}>
                        <View style={[styles.classSymbol, themeStyles.classSymbol]}>
                          <Text style={[styles.classSymbolText, themeStyles.classSymbolText]}>
                            {classData.simbolo}
                          </Text>
                        </View>

                        <Text style={[styles.className, themeStyles.className]}>
                          {classData.id.toUpperCase()}
                        </Text>

                        <Text style={[styles.classDescription, themeStyles.classDescription]}>
                          {classData.descricao}
                        </Text>

                        <View style={[styles.effectsBox, themeStyles.effectsBox]}>
                          <Text style={[styles.effectsTitle, themeStyles.effectsTitle]}>EFEITOS</Text>

                          {classData.efeitos.map((efeito) => (
                            <Text key={efeito} style={[styles.effect, themeStyles.effect]}>
                              {efeito}
                            </Text>
                          ))}
                        </View>

                        <Pressable
                          style={[
                            styles.chooseButton, themeStyles.chooseButton,
                            loadingClassChoice && styles.chooseButtonDisabled,
                          ]}
                          disabled={loadingClassChoice}
                          onPress={() => chooseClass(classData)}
                        >
                          <Text style={[styles.chooseButtonText, themeStyles.chooseButtonText]}>
                            {loadingClassChoice &&
                            selectedClass?.id === classData.id
                              ? "CONFIRMANDO..."
                              : "ESCOLHER CLASSE"}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <NpcUnlockPopup />
          </PaperProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}

function createLayoutThemeStyles(colors: AppThemeColors) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background },
    classModalOverlay: { backgroundColor: colors.overlay },
    classModal: { backgroundColor: colors.surface, borderColor: colors.border },
    classEventLabel: { color: colors.accent },
    classTitle: { color: colors.text },
    classSubtitle: { color: colors.textMuted },
    classCard: { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
    classSymbol: { backgroundColor: colors.surfaceRaised, borderColor: colors.borderStrong },
    classSymbolText: { color: colors.text },
    className: { color: colors.text },
    classDescription: { color: colors.textMuted },
    effectsBox: { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
    effectsTitle: { color: colors.textFaint },
    effect: { color: colors.text },
    chooseButton: { backgroundColor: colors.text },
    chooseButtonText: { color: colors.background },
  });
}

const styles = StyleSheet.create({
  tenguNotification: {
    backgroundColor: "#1a1111",
    borderColor: "#704040",
    borderWidth: 1,
    borderRadius: 7,
    minHeight: 56,
  },
  tenguNotificationMessage: {
    color: "#f3e7e7",
    fontSize: 13,
    lineHeight: 21,
    fontWeight: "400",
  },
  tenguNotificationWrapper: {
    bottom: 90,
    zIndex: 3000,
    elevation: 3000,
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  stack: {
    flex: 1,
  },

  alertBloomLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    elevation: 2000,
  },

  alertOverlay: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 1000,
    elevation: 1000,
  },

  alertFrame: {
    backgroundColor: "rgba(45,0,0,0.94)",
    borderWidth: 1,
    borderColor: "#ff2222",
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 8,
  },

  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  alertLabel: {
    color: "#ff5555",
    fontSize: 8,
    letterSpacing: 2,
    fontWeight: "800",
  },

  alertPercentage: {
    color: "#ffb0b0",
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
  },

  alertTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#260000",
    overflow: "hidden",
  },

  alertProgress: {
    height: "100%",
    backgroundColor: "#ff2020",
  },

  classModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },

  classModal: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 6,
    paddingTop: 24,
    paddingBottom: 20,
    overflow: "hidden",
  },

  classEventLabel: {
    textAlign: "center",
    color: "#888",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: 8,
  },

  classTitle: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 2,
  },

  classSubtitle: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    marginHorizontal: 30,
    marginBottom: 16,
  },

  classCarousel: {
    width: "100%",
    flexGrow: 0,
  },

  classScroll: {
    alignItems: "stretch",
    paddingHorizontal: 0,
  },

  classPage: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 0,
  },

  classCard: {
    width: "88%",
    maxWidth: 390,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#0b0b0b",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  classSymbol: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    backgroundColor: "#0d0d0d",
  },

  classSymbolText: {
    color: "#FFFFFF",
    fontSize: 48,
  },

  className: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 12,
  },

  classDescription: {
    width: "100%",
    color: "#C8C8C8",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },

  effectsBox: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#0d0d0d",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  effectsTitle: {
    color: "#777",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 8,
  },

  effect: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 21,
  },

  chooseButton: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
  },

  chooseButtonDisabled: {
    opacity: 0.5,
  },

  chooseButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
