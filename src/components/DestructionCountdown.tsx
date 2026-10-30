import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Portal } from "react-native-paper";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import type { PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "@/services/firebase/config";

const TOTAL_MS = 60 * 60 * 1000;
const POSITION_KEY = "destructionCountdownPosition";
const SIZE_KEY = "destructionCountdownSize";
const CHARACTER_IDS: Record<string, string> = {
  cyborg: "cyborg",
  ciborgue: "cyborg",
  tengu: "tengu",
  elf: "elf",
  elfo: "elf",
  tiefling: "tiefling",
  dragonborn: "dragonborn",
  draconata: "dragonborn",
};

type TimerState = {
  active: boolean;
  startedAt: number | null;
  durationMs: number;
};

type Position = { x: number; y: number };
type WidgetSize = "compact" | "expanded";

function formatCountdown(milliseconds: number) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  return [hours, minutes, remainder]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function DestructionCountdown() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [size, setSize] = useState<WidgetSize>("compact");
  const [userMode, setUserMode] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [playerIsActive, setPlayerIsActive] = useState(false);
  const [timer, setTimer] = useState<TimerState>({
    active: false,
    startedAt: null,
    durationMs: TOTAL_MS,
  });
  const [now, setNow] = useState(Date.now());
  const [positionLoaded, setPositionLoaded] = useState(false);

  const expanded = size === "expanded";
  const widgetWidth = Math.min(expanded ? 290 : 218, Math.max(150, windowWidth - 16));
  const widgetHeight = expanded ? 160 : 110;
  const minY = insets.top + 8;
  const maxX = Math.max(0, windowWidth - widgetWidth - 8);
  const maxY = Math.max(minY, windowHeight - widgetHeight - insets.bottom - 8);

  const basePosition = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const translation = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const savedPosition = useRef<Position>({ x: 0, y: 0 });
  const bounds = useRef({ maxX, maxY, minY });
  bounds.current = { maxX, maxY, minY };

  const clampPosition = useCallback((next: Position): Position => {
    const current = bounds.current;
    return {
      x: Math.min(current.maxX, Math.max(0, next.x)),
      y: Math.min(current.maxY, Math.max(current.minY, next.y)),
    };
  }, []);

  const updatePosition = useCallback(
    (next: Position) => {
      const bounded = clampPosition(next);
      savedPosition.current = bounded;
      basePosition.setValue(bounded);
    },
    [basePosition, clampPosition],
  );

  const onGestureEvent = useMemo(
    () =>
      Animated.event<PanGestureHandlerGestureEvent>(
        [
          {
            nativeEvent: {
              translationX: translation.x,
              translationY: translation.y,
            },
          },
        ],
        { useNativeDriver: true },
      ),
    [translation],
  );

  const onGestureStateChange = useCallback(
    (event: PanGestureHandlerStateChangeEvent) => {
      const { state, translationX, translationY } = event.nativeEvent;
      if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) {
        return;
      }

      const next = clampPosition({
        x: savedPosition.current.x + translationX,
        y: savedPosition.current.y + translationY,
      });

      updatePosition(next);
      translation.setValue({ x: 0, y: 0 });

      void AsyncStorage.setItem(POSITION_KEY, JSON.stringify(next)).catch((error) => {
        console.warn("Erro ao salvar posição do contador:", error);
      });
    },
    [clampPosition, translation, updatePosition],
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [storedPosition, storedSize] = await Promise.all([
          AsyncStorage.getItem(POSITION_KEY),
          AsyncStorage.getItem(SIZE_KEY),
        ]);
        if (cancelled) return;

        if (storedSize === "expanded" || storedSize === "compact") {
          setSize(storedSize);
        }

        if (storedPosition) {
          const parsed = JSON.parse(storedPosition) as Partial<Position>;
          if (typeof parsed.x === "number" && Number.isFinite(parsed.x) &&
              typeof parsed.y === "number" && Number.isFinite(parsed.y)) {
            updatePosition({ x: parsed.x, y: parsed.y });
          } else {
            updatePosition({ x: maxX, y: insets.top + 80 });
          }
        } else {
          updatePosition({ x: maxX, y: insets.top + 80 });
        }
      } catch (error) {
        console.warn("Não foi possível recuperar as preferências do contador:", error);
        if (!cancelled) updatePosition({ x: maxX, y: insets.top + 80 });
      } finally {
        if (!cancelled) setPositionLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (positionLoaded) updatePosition(savedPosition.current);
  }, [widgetWidth, widgetHeight, maxX, maxY, minY, positionLoaded, updatePosition]);

  const toggleSize = useCallback(() => {
    const next: WidgetSize = size === "compact" ? "expanded" : "compact";
    setSize(next);
    void AsyncStorage.setItem(SIZE_KEY, next).catch((error) => {
      console.warn("Erro ao salvar tamanho do contador:", error);
    });
  }, [size]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const [mode, selected] = await Promise.all([
          AsyncStorage.getItem("userMode"),
          AsyncStorage.getItem("selectedCharacter"),
        ]);
        if (cancelled) return;

        const id = selected
          ? CHARACTER_IDS[selected.trim().toLocaleLowerCase("pt-BR")] ?? null
          : null;
        setUserMode(mode);
        setCharacterId(mode === "gm" ? null : id);
      } catch (error) {
        console.error("Erro ao identificar jogador para contagem regressiva:", error);
        if (!cancelled) {
          setUserMode(null);
          setCharacterId(null);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [pathname]);

  useEffect(() => {
    if (!characterId) {
      setPlayerIsActive(false);
      return;
    }

    return onSnapshot(
      doc(db, "characters", characterId),
      (snapshot) => setPlayerIsActive(snapshot.exists() && snapshot.data().ativo === true),
      (error) => {
        console.error("Erro ao verificar personagem ativo:", error);
        setPlayerIsActive(false);
      },
    );
  }, [characterId]);

  useEffect(() => {
    return onSnapshot(
      doc(db, "game", "selfDestructCountdown"),
      (snapshot) => {
        if (!snapshot.exists()) {
          setTimer({ active: false, startedAt: null, durationMs: TOTAL_MS });
          return;
        }

        const data = snapshot.data();
        setTimer({
          active: data.ativo === true,
          startedAt:
            data.iniciadoEm && typeof data.iniciadoEm.toMillis === "function"
              ? data.iniciadoEm.toMillis()
              : typeof data.iniciadoEmMs === "number" && data.iniciadoEmMs > 0
                ? data.iniciadoEmMs
                : null,
          durationMs:
            typeof data.duracaoMs === "number" && data.duracaoMs > 0
              ? data.duracaoMs
              : TOTAL_MS,
        });
        setNow(Date.now());
      },
      (error) => console.error("Erro ao sincronizar autodestruição:", error),
    );
  }, []);

  useEffect(() => {
    if (!timer.active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [timer.active]);

  const isMasterRoute = pathname === "/gm" || pathname.startsWith("/gm-");
  const canView = isMasterRoute || userMode === "gm" || playerIsActive;

  if (!timer.active || !canView || !positionLoaded) return null;

  const remainingMs = timer.startedAt === null
    ? timer.durationMs
    : Math.max(0, timer.startedAt + timer.durationMs - now);
  const expired = remainingMs === 0;
  const progress = Math.max(0, Math.min(100, (remainingMs / timer.durationMs) * 100));

  return (
    <Portal>
      <View pointerEvents="box-none" style={styles.overlay}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onGestureStateChange}
          activeOffsetX={[-2, 2]}
          activeOffsetY={[-2, 2]}
          shouldCancelWhenOutside={false}
        >
          <Animated.View
            style={[
            styles.card,
            {
              width: widgetWidth,
              height: widgetHeight,
              ...(Platform.OS === "web" ? { touchAction: "none" as const } : {}),
              transform: [
                ...basePosition.getTranslateTransform(),
                ...translation.getTranslateTransform(),
              ],
            },
              expired && styles.cardExpired,
            ]}
          >
          <View style={styles.topAccent} />

          <View style={styles.header}>
              <View style={styles.dragArea}>
                <Ionicons name="warning-outline" size={14} color="#d87c7c" />
                <Text style={styles.headerText} numberOfLines={1}>
                  AUTODESTRUIÇÃO
                </Text>
                <Ionicons name="reorder-three" size={19} color="#a17b7b" />
              </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={expanded ? "Diminuir contador" : "Ampliar contador"}
              onPress={toggleSize}
              hitSlop={6}
              style={styles.resizeButton}
            >
              <Ionicons
                name={expanded ? "contract-outline" : "expand-outline"}
                size={16}
                color="#dfb8b8"
              />
            </Pressable>
          </View>

          {expanded && (
            <Text style={styles.caption}>
              {timer.startedAt === null
                ? "SINCRONIZANDO HORÁRIO..."
                : expired
                  ? "TEMPO ESGOTADO"
                  : "TEMPO RESTANTE"}
            </Text>
          )}

          <Text style={[styles.clock, !expanded && styles.clockCompact, expired && styles.clockExpired]}>
            {formatCountdown(remainingMs)}
          </Text>

          <View style={[styles.progressTrack, !expanded && styles.progressTrackCompact]}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={[styles.footer, !expanded && styles.footerCompact]}>
            <Text style={styles.footerText} numberOfLines={1}>
              {expanded ? "VALTESIA RESEARCH // OBSIDIAN" : "VALTESIA // OBSIDIAN"}
            </Text>
            {expanded && <Text style={styles.footerRight}>ARRASTE PARA MOVER</Text>}
          </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4000,
    elevation: 24,
  },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "#100b0b",
    borderWidth: 1,
    borderColor: "#763535",
    borderRadius: 6,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 12,
  },
  cardExpired: {
    borderColor: "#aa3838",
  },
  topAccent: {
    height: 2,
    backgroundColor: "#ad4040",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    borderBottomWidth: 1,
    borderBottomColor: "#382424",
  },
  dragArea: {
    flex: 1,
    height: 33,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    gap: 6,
  },
  headerText: {
    flex: 1,
    color: "#c89595",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.0,
  },
  resizeButton: {
    width: 34,
    height: 33,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "#382424",
  },
  caption: {
    color: "#8a6f6f",
    fontSize: 8,
    textAlign: "center",
    letterSpacing: 2.2,
    marginTop: 9,
  },
  clock: {
    color: "#f6eaea",
    fontSize: 42,
    fontWeight: "300",
    letterSpacing: 1.2,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
    marginTop: 6,
    marginBottom: 8,
  },
  clockCompact: {
    fontSize: 29,
    marginTop: 2,
    marginBottom: 4,
    letterSpacing: 1,
  },
  clockExpired: {
    color: "#e66060",
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#302121",
    marginHorizontal: 14,
  },
  progressTrackCompact: {
    height: 2,
    marginHorizontal: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#ad4545",
  },
  footer: {
    marginTop: 11,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 4,
  },
  footerCompact: {
    marginTop: 5,
    justifyContent: "center",
  },
  footerText: {
    color: "#836666",
    fontSize: 7,
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  footerRight: {
    color: "#856666",
    fontSize: 7,
    letterSpacing: 0.3,
  },
});
