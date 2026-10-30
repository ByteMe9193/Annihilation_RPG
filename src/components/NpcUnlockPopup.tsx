import { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { doc, onSnapshot } from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { db } from "@/services/firebase/config";
import { getNpcUnlockCard } from "@/constants/npcUnlockCards";

const STORAGE_KEY = "aniquilacao:last-npc-unlock-popup";
const MAX_EVENT_AGE_MS = 10000;
const POPUP_DURATION_MS = 5000;

const characterIds: Record<string, string> = {
  ciborgue: "cyborg",
  cyborg: "cyborg",
  tengu: "tengu",
  elfo: "elf",
  elf: "elf",
  tiefling: "tiefling",
  draconata: "dragonborn",
  dragonborn: "dragonborn",
};

type ActiveSession = {
  mode: string | null;
  characterId: string | null;
};

type UnlockDisplay = {
  eventId: string;
  npcId: string;
};

function resolveCharacterId(name: string | null): string | null {
  if (!name) return null;
  return characterIds[name.trim().toLowerCase()] ?? null;
}

export function NpcUnlockPopup() {
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<ActiveSession>({ mode: null, characterId: null });
  const [characterActive, setCharacterActive] = useState(false);
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [display, setDisplay] = useState<UnlockDisplay | null>(null);
  const lastEventRef = useRef<string | null>(null);
  const audioEventRef = useRef<string | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.remove();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!display || audioEventRef.current === display.eventId) return;
    const eventId = display.eventId;
    audioEventRef.current = eventId;

    void (async () => {
      try {
        await setAudioModeAsync({
          allowsRecording: false,
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: "doNotMix",
        });

        if (!mountedRef.current || audioEventRef.current !== eventId) return;

        audioPlayerRef.current?.remove();
        const player = createAudioPlayer(require("@/assets/sfx/popup.mp3"));
        audioPlayerRef.current = player;
        player.loop = false;
        player.volume = 1;
        player.addListener("playbackStatusUpdate", (status) => {
          if (audioPlayerRef.current !== player) return;
          if (status.didJustFinish || status.error) {
            if (status.error) {
              console.error("Erro ao reproduzir som de desbloqueio:", status.error);
            }
            audioPlayerRef.current = null;
            player.remove();
          }
        });
        player.play();
      } catch (error) {
        console.error("Erro ao iniciar som de desbloqueio:", error);
      }
    })();
  }, [display?.eventId]);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled) lastEventRef.current = value;
      })
      .catch((error) => console.error("Erro ao recuperar aviso de NPC:", error))
      .finally(() => {
        if (!cancelled) setSeenLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      AsyncStorage.getItem("userMode"),
      AsyncStorage.getItem("selectedCharacter"),
    ])
      .then(([mode, selectedCharacter]) => {
        if (!cancelled) {
          setSession({ mode, characterId: resolveCharacterId(selectedCharacter) });
        }
      })
      .catch((error) => {
        console.error("Erro ao identificar jogador para aviso de NPC:", error);
        if (!cancelled) setSession({ mode: null, characterId: null });
      });
    return () => { cancelled = true; };
  }, [pathname]);

  const eligibleRoute = pathname !== "/" && pathname !== "/gm";
  const playerId = session.mode === "player" && eligibleRoute
    ? session.characterId
    : null;

  useEffect(() => {
    setCharacterActive(false);
    setDisplay(null);
    if (!playerId) return;

    return onSnapshot(
      doc(db, "characters", playerId),
      (snapshot) => {
        const active = snapshot.exists() && snapshot.data().ativo === true;
        setCharacterActive(active);
        if (!active) setDisplay(null);
      },
      (error) => {
        console.error("Erro ao consultar personagem ativo:", error);
        setCharacterActive(false);
        setDisplay(null);
      },
    );
  }, [playerId]);

  useEffect(() => {
    if (!seenLoaded || !characterActive || !playerId) return;

    return onSnapshot(
      doc(db, "game", "npcUnlockPopup"),
      (snapshot) => {
        if (!snapshot.exists() || snapshot.metadata.fromCache) return;

        const data = snapshot.data();
        const eventId = typeof data.eventId === "string" ? data.eventId : "";
        const npcId = typeof data.npcId === "string" ? data.npcId : "";
        const recipients = Array.isArray(data.recipients) ? data.recipients : [];
        const serverTime = data.publicadoEm?.toMillis?.();
        const publishedMs = typeof serverTime === "number"
          ? serverTime
          : typeof data.publicadoEmMs === "number" ? data.publicadoEmMs : 0;
        const age = Date.now() - publishedMs;

        if (
          !eventId ||
          !npcId ||
          lastEventRef.current === eventId ||
          !recipients.includes(playerId) ||
          age < -3000 ||
          age > MAX_EVENT_AGE_MS ||
          !getNpcUnlockCard(npcId)
        ) return;

        lastEventRef.current = eventId;
        void AsyncStorage.setItem(STORAGE_KEY, eventId).catch((error) => {
          console.error("Erro ao registrar aviso de NPC:", error);
        });
        setDisplay({ eventId, npcId });
      },
      (error) => console.error("Erro ao sincronizar desbloqueio de NPC:", error),
    );
  }, [seenLoaded, characterActive, playerId]);

  useEffect(() => {
    if (!display) return;
    const timeout = setTimeout(() => setDisplay(null), POPUP_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [display?.eventId]);

  const image = useMemo(
    () => (display ? getNpcUnlockCard(display.npcId) : null),
    [display?.npcId],
  );

  const availableHeight = Math.max(200, height - insets.top - insets.bottom - 56);
  const cardWidth = Math.max(120, Math.min(width - 36, availableHeight * (9 / 16), 520));
  const cardHeight = cardWidth * (16 / 9);

  return (
    <Modal
      visible={Boolean(display && image)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => setDisplay(null)}
      presentationStyle="overFullScreen"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dispensar card de desbloqueio"
        onPress={() => setDisplay(null)}
        style={styles.backdrop}
      >
        <View style={styles.content} pointerEvents="none">
          {image ? (
            <Image
              source={image}
              style={{ width: cardWidth, height: cardHeight }}
              resizeMode="contain"
            />
          ) : null}
          <Text style={styles.dismissText}>TOQUE PARA DISPENSAR</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: {
    marginTop: 12,
    fontSize: 9,
    color: "#b5a4a4",
    letterSpacing: 2.1,
    textAlign: "center",
  },
});
