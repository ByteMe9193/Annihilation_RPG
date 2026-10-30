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
import type {
  PanGestureHandlerGestureEvent,
  PanGestureHandlerStateChangeEvent,
} from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { db } from "@/services/firebase/config";

const POSITION_KEY = "customCountdownPosition";
const SIZE_KEY = "customCountdownSize";
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
  name: string;
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

export function CustomCountdown() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [size, setSize] = useState<WidgetSize>("compact");
  const [userMode, setUserMode] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [playerIsActive, setPlayerIsActive] = useState(false);
  const [timer, setTimer] = useState<TimerState>({
    active: false,
    name: "",
    startedAt: null,
    durationMs: 60000,
  });
  const [now, setNow] = useState(Date.now());
  const [positionLoaded, setPositionLoaded] = useState(false);
  const expanded = size === "expanded";
  const widgetWidth = Math.min(expanded ? 290 : 218, Math.max(150, windowWidth - 16));
  const widgetHeight = expanded ? 166 : 110;
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

  const updatePosition = useCallback((next: Position) => {
    const bounded = clampPosition(next);
    savedPosition.current = bounded;
    basePosition.setValue(bounded);
  }, [basePosition, clampPosition]);

  const onGestureEvent = useMemo(() => Animated.event<PanGestureHandlerGestureEvent>([
    { nativeEvent: { translationX: translation.x, translationY: translation.y } },
  ], { useNativeDriver: true }), [translation]);

  const onGestureStateChange = useCallback((event: PanGestureHandlerStateChangeEvent) => {
    const { state, translationX, translationY } = event.nativeEvent;
    if (state !== State.END && state !== State.CANCELLED && state !== State.FAILED) return;
    const next = clampPosition({
      x: savedPosition.current.x + translationX,
      y: savedPosition.current.y + translationY,
    });
    updatePosition(next);
    translation.setValue({ x: 0, y: 0 });
    void AsyncStorage.setItem(POSITION_KEY, JSON.stringify(next)).catch(console.warn);
  }, [clampPosition, translation, updatePosition]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const defaultPosition = { x: 12, y: insets.top + 212 };
      try {
        const [storedPosition, storedSize] = await Promise.all([
          AsyncStorage.getItem(POSITION_KEY),
          AsyncStorage.getItem(SIZE_KEY),
        ]);
        if (cancelled) return;
        if (storedSize === "expanded" || storedSize === "compact") setSize(storedSize);
        if (storedPosition) {
          const parsed = JSON.parse(storedPosition) as Partial<Position>;
          if (typeof parsed.x === "number" && Number.isFinite(parsed.x) &&
              typeof parsed.y === "number" && Number.isFinite(parsed.y)) {
            updatePosition({ x: parsed.x, y: parsed.y });
          } else updatePosition(defaultPosition);
        } else updatePosition(defaultPosition);
      } catch {
        if (!cancelled) updatePosition(defaultPosition);
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
    void AsyncStorage.setItem(SIZE_KEY, next).catch(console.warn);
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
        const id = selected ? CHARACTER_IDS[selected.trim().toLocaleLowerCase("pt-BR")] ?? null : null;
        setUserMode(mode);
        setCharacterId(mode === "gm" ? null : id);
      } catch {
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
    return onSnapshot(doc(db, "characters", characterId),
      (snapshot) => setPlayerIsActive(snapshot.exists() && snapshot.data().ativo === true),
      () => setPlayerIsActive(false),
    );
  }, [characterId]);

  useEffect(() => onSnapshot(doc(db, "game", "customCountdown"), (snapshot) => {
    if (!snapshot.exists()) {
      setTimer({ active: false, name: "", startedAt: null, durationMs: 60000 });
      return;
    }
    const data = snapshot.data();
    setTimer({
      active: data.ativo === true,
      name: typeof data.nome === "string" ? data.nome : "TEMPORIZADOR",
      startedAt: data.iniciadoEm && typeof data.iniciadoEm.toMillis === "function"
        ? data.iniciadoEm.toMillis()
        : typeof data.iniciadoEmMs === "number" && data.iniciadoEmMs > 0
          ? data.iniciadoEmMs : null,
      durationMs: typeof data.duracaoMs === "number" && data.duracaoMs > 0
        ? data.duracaoMs : 60000,
    });
    setNow(Date.now());
  }, (error) => console.error("Erro ao sincronizar temporizador:", error)), []);

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
          <Animated.View style={[
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
          ]}>
            <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
              <Defs>
                <LinearGradient id="frostedTimer" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#233e49" stopOpacity="0.98" />
                  <Stop offset="48%" stopColor="#101d29" stopOpacity="0.96" />
                  <Stop offset="100%" stopColor="#0b1520" stopOpacity="0.97" />
                </LinearGradient>
                <LinearGradient id="timerShine" x1="0%" y1="0%" x2="100%" y2="0%">
                  <Stop offset="0%" stopColor="#9bd8dc" stopOpacity="0.64" />
                  <Stop offset="45%" stopColor="#efffff" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#5c8d9e" stopOpacity="0.32" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="100%" height="100%" fill="url(#frostedTimer)" />
              <Rect x="0" y="0" width="100%" height="2" fill="url(#timerShine)" />
            </Svg>
            <View style={styles.header}>
              <View style={styles.dragArea}>
                <Ionicons name="hourglass-outline" size={14} color="#a5d8df" />
                <Text style={styles.headerText} numberOfLines={1}>{timer.name.toUpperCase()}</Text>
                <Ionicons name="reorder-three" size={18} color="#7196a2" />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={expanded ? "Diminuir temporizador" : "Ampliar temporizador"}
                onPress={toggleSize}
                hitSlop={6}
                style={styles.resizeButton}
              >
                <Ionicons name={expanded ? "contract-outline" : "expand-outline"} size={16} color="#c0e5ea" />
              </Pressable>
            </View>
            {expanded && <Text style={styles.caption}>
              {timer.startedAt === null ? "SINCRONIZANDO HORÁRIO" : expired ? "TEMPO ESGOTADO" : "CONTAGEM REGRESSIVA"}
            </Text>}
            <Text style={[styles.clock, !expanded && styles.clockCompact, expired && styles.clockExpired]}>
              {formatCountdown(remainingMs)}
            </Text>
            <View style={[styles.progressTrack, !expanded && styles.progressTrackCompact]}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={[styles.footer, !expanded && styles.footerCompact]}>
              <Text style={styles.footerText} numberOfLines={1}>VALTESIA // PROTOCOLO TEMPORAL</Text>
              {expanded && <Text style={styles.footerRight}>ARRASTE PARA MOVER</Text>}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 4100, elevation: 25 },
  card: {
    position: "absolute", top: 0, left: 0,
    backgroundColor: "rgba(16,29,40,0.94)",
    borderWidth: 1, borderColor: "rgba(157,217,224,0.48)",
    borderRadius: 13, overflow: "hidden",
    shadowColor: "#73c3ce", shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, elevation: 13,
  },
  cardExpired: { borderColor: "#b5d2e0" },
  header: {
    flexDirection: "row", alignItems: "center", height: 34,
    borderBottomWidth: 1, borderBottomColor: "rgba(162,213,224,0.19)",
  },
  dragArea: {
    flex: 1, height: 33, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 9, gap: 6,
  },
  headerText: { flex: 1, color: "#d2eef1", fontSize: 9, fontWeight: "700", letterSpacing: 0.65 },
  resizeButton: {
    width: 34, height: 33, alignItems: "center", justifyContent: "center",
    borderLeftWidth: 1, borderLeftColor: "rgba(162,213,224,0.19)",
  },
  caption: { color: "#8eaebc", fontSize: 8, textAlign: "center", letterSpacing: 2, marginTop: 9 },
  clock: {
    color: "#effcff", fontSize: 40, fontWeight: "300", letterSpacing: 1.1,
    textAlign: "center", fontVariant: ["tabular-nums"], marginTop: 8, marginBottom: 8,
  },
  clockCompact: { fontSize: 29, marginTop: 2, marginBottom: 4 },
  clockExpired: { color: "#bce8f2" },
  progressTrack: { height: 3, backgroundColor: "rgba(157,217,224,0.13)", marginHorizontal: 14 },
  progressTrackCompact: { height: 2, marginHorizontal: 10 },
  progressFill: { height: "100%", backgroundColor: "#98d7de" },
  footer: {
    marginTop: 11, paddingHorizontal: 12, flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", gap: 4,
  },
  footerCompact: { marginTop: 5, justifyContent: "center" },
  footerText: { color: "#779dab", fontSize: 7, letterSpacing: 0.55, flexShrink: 1 },
  footerRight: { color: "#7896a4", fontSize: 7, letterSpacing: 0.3 },
});
