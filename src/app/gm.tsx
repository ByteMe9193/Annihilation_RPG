import { useAppTheme } from "@/theme/AppTheme";
import { useThemedStyles } from "@/theme/useThemedStyles";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  increment,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import { Snackbar } from "react-native-paper";

import { characterDefaults } from "@/constants/characterDefaults";
import { npcDefaults } from "@/constants/npcDefaults";
import { db } from "@/services/firebase/config";
import { allDocuments, documentCategories } from "@/constants/documentCategories";
import { tenguHasOpportunityCard } from "@/services/tenguOpportunity";
import { getNpcUnlockCard } from "@/constants/npcUnlockCards";
import { getNpcGalleryImages } from "@/constants/npcGallery";
import NpcGalleryModal from "@/components/NpcGalleryModal";

type CharacterData = {
  id: string;
  nome?: string;
  raca?: string;
  ativo?: boolean;
  skillCards?: {
    tier1?: string | null;
    tier2?: string | null;
    tier3?: string | null;
  };
  skillCardTiers?: {
    tier1?: boolean;
    tier2?: boolean;
    tier3?: boolean;
  };
  efeitosAtivos?: string;
  modificacoes?: string;
  classe?: string | null;
  eventoClasseLiberado?: boolean;
  escolhasImportantes?: Array<{ sessao: number; texto: string; criadoEm: number } | string>;
};

type NPCData = {
  id: string;
  nome?: string;
  nomeVerdadeiro?: string;
  classe?: string;
  nivelAcesso?: number | string;
  arquetipo?: string;
  status?: string;
  relacao?: string;
};

type SkillCardData = {
  id: string;
  personagem?: string;
  tier?: number;
  nome?: string;
};

type NPCInfoAccess = {
  nome?: boolean;
  arquetipo?: boolean;
  status?: boolean;
  nivelAcesso?: boolean;
  relacao?: boolean;
};

type PendingData = {
  id: string;
  characterId?: string;
  characterName?: string;
  titulo?: string;
  habilidade?: string;
  observacao?: string;
  lembrete?: string;
  criadoEm?: number;
  expiraEm?: number | null;
  concluida?: boolean;
};

type SessionData = {
  bloqueada?: boolean;
};

type AlertData = {
  ativo?: boolean;
  porcentagem?: number;
  disparo?: number;
};

type DestructionTimerData = {
  ativo: boolean;
  iniciadoEm: number | null;
  duracaoMs: number;
};

type CustomTimerData = DestructionTimerData & { nome: string };

const DESTRUCTION_DURATION_MS = 60 * 60 * 1000;

const RADIO_CATEGORIES = [
  {
    id: "numberStations",
    title: "NUMBER STATIONS",
    subtitle: "TRANSMISSÕES NUMÉRICAS // FADE IN E OUT DE 5 SEGUNDOS",
    tracks: [
      { id: "15728", title: "15728", source: require("@/assets/radio/15728.mp3"), fade: true },
      { id: "bugle", title: "BUGLE", source: require("@/assets/radio/bugle.mp3"), fade: true },
      { id: "chime", title: "CHIME", source: require("@/assets/radio/chime.mp3"), fade: true },
      { id: "counting", title: "COUNTING", source: require("@/assets/radio/counting.mp3"), fade: true },
      { id: "lullaby", title: "LULLABY", source: require("@/assets/radio/lullaby.mp3"), fade: true },
      { id: "NEIN", title: "NEIN", source: require("@/assets/radio/NEIN.mp3"), fade: true },
    ],
  },
  {
    id: "radioChecks",
    title: "CHECAGENS DE RÁDIO",
    subtitle: "EVENTOS DE VERIFICAÇÃO // REPRODUÇÃO IMEDIATA",
    tracks: [
      { id: "verificacaoGeral_3", title: "VERIFICAÇÃO GERAL 03", source: require("@/assets/radio/verificacaoGeral_3.mp3"), fade: false },
      { id: "verificacaoGeral_2", title: "VERIFICAÇÃO GERAL 02", source: require("@/assets/radio/verificacaoGeral_2.mp3"), fade: false },
      { id: "verificacaoGeral_1", title: "VERIFICAÇÃO GERAL 01", source: require("@/assets/radio/verificacaoGeral_1.mp3"), fade: false },
      { id: "verificacao_Andrew", title: "VERIFICAÇÃO ANDREW", source: require("@/assets/radio/verificacao_Andrew.mp3"), fade: false },
    ],
  },
  {
    id: "highInstinct",
    title: "INSTINTO ALTO",
    subtitle: "TERROR PSICOLÓGICO // REPRODUÇÃO IMEDIATA",
    tracks: [
      { id: "instintoAlto", title: "INSTINTO ALTO", source: require("@/assets/radio/instintoAlto.mp3"), fade: false },
    ],
  },
  {
    id: "announcements",
    title: "TRANSMISSÕES DE ALTO-FALANTE",
    subtitle: "COMUNICADOS DA INSTALAÇÃO // REPRODUÇÃO IMEDIATA",
    tracks: [
      { id: "valtesia", title: "VALTESIA", source: require("@/assets/radio/valtesia.mp3"), fade: false },
      { id: "valtesia_High", title: "VALTESIA HIGH", source: require("@/assets/radio/valtesia_High.mp3"), fade: false },
      { id: "Hana_Fugitivos_Valtesia", title: "HANA // FUGITIVOS", source: require("@/assets/radio/Hana_Fugitivos_Valtesia.mp3"), fade: false },
    ],
  },
] as const;

const RADIO_TRACKS = RADIO_CATEGORIES.flatMap((category) => category.tracks);

const ATTACK_SOUNDS = [
  { id: "banshee", title: "GRITO DO BANSHEE", subtitle: "SCREAMER // ATAQUE SONORO", icon: "volume-high-outline", source: require("@/assets/sfx/Screamer.mp3") },
  { id: "mastodonte", title: "RUGIDO DO MASTODONTE", subtitle: "CHARGER // ATAQUE SONORO", icon: "megaphone-outline", source: require("@/assets/sfx/Charger.mp3") },
] as const;

type AttackSoundId = (typeof ATTACK_SOUNDS)[number]["id"];
type RadioTrackId = (typeof RADIO_TRACKS)[number]["id"];
type RadioStatus = "parado" | "iniciando" | "tocando" | "encerrando";
const RADIO_FADE_MS = 5000;

const characterLabels: Record<string, string> = {
  cyborg: "CIBORGUE",
  tengu: "TENGU",
  elf: "ELFO",
  tiefling: "TIEFLING",
  dragonborn: "DRACONATA",
};

const npcInfoFields: Array<{
  key: keyof NPCInfoAccess;
  label: string;
}> = [
  { key: "nome", label: "NOME REAL" },
  { key: "arquetipo", label: "ARQUÉTIPO" },
  { key: "status", label: "STATUS" },
  { key: "nivelAcesso", label: "NÍVEL DE ACESSO" },
  { key: "relacao", label: "RELAÇÃO" },
];

function displayCharacter(character: CharacterData) {
  return (
    character.nome ||
    characterLabels[character.id] ||
    character.id.toUpperCase()
  );
}

function displayNpcRealName(npc: NPCData) {
  return npc.nomeVerdadeiro || npc.nome || npc.id;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
      s,
    ).padStart(2, "0")}`;
  }

  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function GM() {
  const styles = useThemedStyles(baseStyles);
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState<SessionData>({ bloqueada: false });

  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [npcs, setNpcs] = useState<NPCData[]>([]);
  const [skillCards, setSkillCards] = useState<SkillCardData[]>([]);
  const [pendencias, setPendencias] = useState<PendingData[]>([]);
  const [alerta, setAlerta] = useState<AlertData>({
    ativo: false,
    porcentagem: 0,
    disparo: 0,
  });

  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [singleResetVisible, setSingleResetVisible] = useState(false);
  const [tenguConfirmVisible, setTenguConfirmVisible] = useState(false);
  const [npcCardPreview, setNpcCardPreview] = useState(false);
  const [npcUnlockConfirm, setNpcUnlockConfirm] = useState(false);
  const [monitorExpanded, setMonitorExpanded] = useState(false);
  const [eventDetail, setEventDetail] = useState<null | "destruction" | "customTimer" | "alarm" | "radio" | "attacks" | "classes" | "choices">(null);

  const [destructionConfirm, setDestructionConfirm] = useState<"start" | "stop" | null>(null);
  const [destructionTimer, setDestructionTimer] = useState<DestructionTimerData>({
    ativo: false,
    iniciadoEm: null,
    duracaoMs: DESTRUCTION_DURATION_MS,
  });
  const [timerNow, setTimerNow] = useState(Date.now());
  const [customTimer, setCustomTimer] = useState<CustomTimerData>({
    ativo: false, nome: "", iniciadoEm: null, duracaoMs: 60000,
  });
  const [customTimerName, setCustomTimerName] = useState("");
  const [customTimerHours, setCustomTimerHours] = useState("0");
  const [customTimerMinutes, setCustomTimerMinutes] = useState("5");
  const [customTimerSeconds, setCustomTimerSeconds] = useState("0");
  const [customTimerConfirmStop, setCustomTimerConfirmStop] = useState(false);
  const [singleResetId, setSingleResetId] = useState<string | null>(null);
  const [selectedRadioId, setSelectedRadioId] = useState<RadioTrackId>("15728");
  const selectedRadioTrack = RADIO_TRACKS.find((track) => track.id === selectedRadioId);
  const [radioStatus, setRadioStatus] = useState<RadioStatus>("parado");
  const radioSoundRef = useRef<AudioPlayer | null>(null);
  const radioOperationRef = useRef(0);
  const radioFadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const radioStatusRef = useRef<RadioStatus>("parado");
  const [playingAttackId, setPlayingAttackId] = useState<AttackSoundId | null>(null);
  const attackPlayerRef = useRef<AudioPlayer | null>(null);
  const attackOperationRef = useRef(0);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const [actionModal, setActionModal] = useState<
    null | "cards" | "npcs" | "documentos" | "eventos"
  >(null);

  const [releaseMode, setReleaseMode] = useState<"individual" | "massa">(
    "individual",
  );

  const [npcOperationType, setNpcOperationType] = useState<"npc" | "info" | "gallery">(
    "npc",
  );

  const [releaseAction, setReleaseAction] = useState<"liberar" | "bloquear">(
    "liberar",
  );

  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);

  const [escolhaSessao, setEscolhaSessao] = useState<1 | 2 | 3>(1);
  const [escolhaTexto, setEscolhaTexto] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [documentSearch, setDocumentSearch] = useState("");
  const [documentCategoryId, setDocumentCategoryId] = useState("todos");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documentRecipientIds, setDocumentRecipientIds] = useState<string[]>([]);
  const [documentFeedback, setDocumentFeedback] = useState("");
  const [documentAccess, setDocumentAccess] = useState<Record<string, boolean | null>>({});
  const [lastPreviewedDocumentId, setLastPreviewedDocumentId] = useState<string | null>(null);
  const reopenDocumentModalRef = useRef(false);
  const previewedDocumentIdRef = useRef<string | null>(null);

  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [npcInfoField, setNpcInfoField] =
    useState<keyof NPCInfoAccess>("nome");
  const [gallerySelectedImageId, setGallerySelectedImageId] = useState<string | null>(null);
  const [galleryRecipientIds, setGalleryRecipientIds] = useState<string[]>([]);
  const [galleryAccess, setGalleryAccess] = useState<Record<string, boolean | null>>({});
  const [galleryFeedback, setGalleryFeedback] = useState("");
  const [galleryPreviewId, setGalleryPreviewId] = useState<string | null>(null);

  const [pendingModalVisible, setPendingModalVisible] = useState(false);
  const [pendingTitle, setPendingTitle] = useState("");
  const [pendingObservation, setPendingObservation] = useState("");
  const [pendingReminder, setPendingReminder] = useState("");
  const [pendingDuration, setPendingDuration] = useState("");

  const activeCharacters = useMemo(
    () => characters.filter((character) => character.ativo === true),
    [characters],
  );

  const tenguEligible = useMemo(() => {
    const tengu = characters.find((character) => character.id === "tengu");
    return Object.values(tengu?.skillCards ?? {}).includes("tengu_tier1_B");
  }, [characters]);

  const documentTargets = useMemo(() => {
    return Object.keys(characterDefaults).map((id) => {
      return characters.find((character) => character.id === id) ?? { id, ativo: false };
    });
  }, [characters]);

  const filteredDocuments = useMemo(() => {
    const normalise = (value: string) =>
      value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const term = normalise(documentSearch.trim());
    return allDocuments.filter((item) => {
      if (documentCategoryId !== "todos" && item.categoryId !== documentCategoryId) {
        return false;
      }
      return !term || normalise(`${item.title} ${item.id} ${item.categoryTitle}`).includes(term);
    });
  }, [documentSearch, documentCategoryId]);

  const currentDocument = useMemo(
    () => allDocuments.find((item) => item.id === selectedDocumentId) ?? null,
    [selectedDocumentId],
  );

  const galleryNpcImages = useMemo(() => getNpcGalleryImages(selectedNpcId), [selectedNpcId]);
  const gallerySelectedImage = galleryNpcImages.find((image) => image.id === gallerySelectedImageId) ?? null;
  const galleryPreviewImage = galleryNpcImages.find((image) => image.id === galleryPreviewId) ?? null;
  const galleryNpc = npcs.find((npc) => npc.id === selectedNpcId) ?? null;

  useFocusEffect(
    useCallback(() => {
      if (!reopenDocumentModalRef.current) return;
      reopenDocumentModalRef.current = false;
      setLastPreviewedDocumentId(previewedDocumentIdRef.current);
      setActionModal("documentos");
    }, []),
  );

  useEffect(() => {
    if (actionModal !== "documentos" || !selectedDocumentId) {
      setDocumentAccess({});
      return;
    }

    setDocumentAccess({});
    const unsubs = documentTargets.map(({ id }) =>
      onSnapshot(
        doc(db, "characters", id, "documentAccess", selectedDocumentId),
        (snapshot) => {
          setDocumentAccess((prev) => ({
            ...prev,
            [id]: snapshot.exists() && snapshot.data().liberado === true,
          }));
        },
        (error) => {
          console.error("ERRO AO CONSULTAR ACESSO AO DOCUMENTO:", error);
          setDocumentAccess((prev) => ({ ...prev, [id]: null }));
        },
      ),
    );

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [actionModal, selectedDocumentId, documentTargets]);
  useEffect(() => {
    if (actionModal !== "npcs" || npcOperationType !== "gallery" || !selectedNpcId || !gallerySelectedImageId) {
      setGalleryAccess({});
      return;
    }

    setGalleryAccess({});
    const unsubs = documentTargets.map(({ id }) =>
      onSnapshot(
        doc(db, "characters", id, "npcAccess", selectedNpcId),
        (snapshot) => {
          const access = snapshot.exists() ? snapshot.data().galeria?.[gallerySelectedImageId] === true : false;
          setGalleryAccess((previous) => ({ ...previous, [id]: access }));
        },
        (error) => {
          console.error("ERRO AO CONSULTAR GALERIA:", error);
          setGalleryAccess((previous) => ({ ...previous, [id]: null }));
        },
      ),
    );
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [actionModal, npcOperationType, selectedNpcId, gallerySelectedImageId, documentTargets]);

  const selectedCharacter = useMemo(
    () =>
      activeCharacters.find(
        (character) => character.id === selectedCharacterId,
      ) || null,
    [activeCharacters, selectedCharacterId],
  );

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const setRadioPhase = (next: RadioStatus) => {
    radioStatusRef.current = next;
    setRadioStatus(next);
  };

  const clearRadioFade = () => {
    if (radioFadeTimerRef.current !== null) {
      clearInterval(radioFadeTimerRef.current);
      radioFadeTimerRef.current = null;
    }
  };

  const releaseRadioSound = () => {
    clearRadioFade();
    const player = radioSoundRef.current;
    radioSoundRef.current = null;
    if (player) {
      try { player.pause(); player.remove(); }
      catch (error) { console.warn("RÁDIO LIBERAÇÃO:", error); }
    }
  };

  const fadeRadio = (
    player: AudioPlayer,
    from: number,
    to: number,
    operation: number,
  ): Promise<boolean> =>
    new Promise((resolve) => {
      clearRadioFade();
      const start = Date.now();
      radioFadeTimerRef.current = setInterval(() => {
        if (radioOperationRef.current !== operation || radioSoundRef.current !== player) {
          clearRadioFade();
          resolve(false);
          return;
        }
        const progress = Math.min(1, (Date.now() - start) / RADIO_FADE_MS);
        player.volume = Math.max(0, Math.min(1, from + (to - from) * progress));
        if (progress >= 1) {
          clearRadioFade();
          resolve(true);
        }
      }, 100);
    });

  const iniciarRadio = async () => {
    if (radioStatusRef.current !== "parado") return;
    const track = RADIO_TRACKS.find((item) => item.id === selectedRadioId);
    if (!track) return;
    const operation = ++radioOperationRef.current;
    setRadioPhase("iniciando");
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "doNotMix",
      });
      if (radioOperationRef.current !== operation) return;
      const player = createAudioPlayer(track.source, { updateInterval: 200 });
      player.volume = track.fade ? 0 : 1;
      player.loop = false;
      radioSoundRef.current = player;
      player.addListener("playbackStatusUpdate", (status) => {
        if (radioOperationRef.current !== operation) return;
        if (status.didJustFinish || status.error) {
          ++radioOperationRef.current;
          releaseRadioSound();
          setRadioPhase("parado");
          if (status.error) showMessage("Falha na reprodução da transmissão.");
        }
      });
      player.play();
      if (track.fade) {
        const completed = await fadeRadio(player, 0, 1, operation);
        if (completed && radioOperationRef.current === operation) setRadioPhase("tocando");
      } else if (radioOperationRef.current === operation) {
        setRadioPhase("tocando");
      }
    } catch (error) {
      console.error("ERRO NA TRANSMISSÃO:", error);
      if (radioOperationRef.current === operation) {
        ++radioOperationRef.current;
        releaseRadioSound();
        setRadioPhase("parado");
        showMessage("Falha ao iniciar transmissão. Confira os arquivos de áudio.");
      }
    }
  };

  const pararRadio = async () => {
    const player = radioSoundRef.current;
    if (!player || radioStatusRef.current === "parado" || radioStatusRef.current === "encerrando") return;
    const operation = ++radioOperationRef.current;
    clearRadioFade();
    if (!selectedRadioTrack?.fade) {
      releaseRadioSound();
      setRadioPhase("parado");
      return;
    }
    setRadioPhase("encerrando");
    try {
      const from = player.volume;
      await fadeRadio(player, from, 0, operation);
      if (radioOperationRef.current !== operation) return;
      releaseRadioSound();
      setRadioPhase("parado");
    } catch (error) {
      console.error("ERRO AO PARAR RÁDIO:", error);
      if (radioOperationRef.current === operation) {
        releaseRadioSound();
        setRadioPhase("parado");
      }
    }
  };

  const releaseAttackSound = () => {
    const player = attackPlayerRef.current;
    attackPlayerRef.current = null;
    if (player) {
      try {
        player.pause();
      } catch {}
      try {
        player.remove();
      } catch {}
    }
  };

  const stopAttackSound = () => {
    ++attackOperationRef.current;
    releaseAttackSound();
    setPlayingAttackId(null);
  };

  const playAttackSound = async (id: AttackSoundId) => {
    const sound = ATTACK_SOUNDS.find((item) => item.id === id);
    if (!sound) return;

    const operation = ++attackOperationRef.current;
    releaseAttackSound();
    setPlayingAttackId(id);

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "doNotMix",
      });

      if (attackOperationRef.current !== operation) return;

      const player = createAudioPlayer(sound.source, { updateInterval: 100 });
      attackPlayerRef.current = player;
      player.loop = false;
      player.volume = 1;

      player.addListener("playbackStatusUpdate", (status) => {
        if (attackOperationRef.current !== operation) return;
        if (status.didJustFinish || status.error) {
          stopAttackSound();
          if (status.error) showMessage("Falha ao reproduzir o efeito sonoro.");
        }
      });

      player.play();
    } catch {
      if (attackOperationRef.current === operation) {
        stopAttackSound();
        showMessage("Não foi possível reproduzir o ataque.");
      }
    }
  };

  useEffect(() => {
    return () => {
      ++attackOperationRef.current;
      releaseAttackSound();
    };
  }, []);

  useEffect(() => {
    return () => {
      ++radioOperationRef.current;
      releaseRadioSound();
    };
  }, []);

  useEffect(() => {
    const unsubSession = onSnapshot(
      doc(db, "game", "session"),
      (snapshot) => {
        setSession({
          bloqueada: snapshot.exists()
            ? Boolean(snapshot.data().bloqueada)
            : false,
        });
      },
      (error) => console.error("Erro ao sincronizar sessão:", error),
    );

    const unsubAlerta = onSnapshot(
      doc(db, "game", "alert"),
      (snapshot) => {
        if (!snapshot.exists()) {
          setAlerta({ ativo: false, porcentagem: 0, disparo: 0 });
          return;
        }

        const data = snapshot.data();
        setAlerta({
          ativo: data.ativo === true,
          porcentagem: Math.max(0, Math.min(100, Number(data.porcentagem) || 0)),
          disparo: Number(data.disparo) || 0,
        });
      },
      (error) => console.error("ERRO ALERTA:", error),
    );

    const unsubDestruction = onSnapshot(
      doc(db, "game", "selfDestructCountdown"),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : null;
        setDestructionTimer({
          ativo: data?.ativo === true,
          iniciadoEm:
            data?.iniciadoEm && typeof data.iniciadoEm.toMillis === "function"
              ? data.iniciadoEm.toMillis()
              : typeof data?.iniciadoEmMs === "number" && data.iniciadoEmMs > 0
                ? data.iniciadoEmMs
                : null,
          duracaoMs:
            typeof data?.duracaoMs === "number" && data.duracaoMs > 0
              ? data.duracaoMs
              : DESTRUCTION_DURATION_MS,
        });
        setTimerNow(Date.now());
      },
      (error) => console.error("ERRO CONTADOR DE AUTODESTRUIÇÃO:", error),
    );

    const unsubCustomTimer = onSnapshot(
      doc(db, "game", "customCountdown"),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : null;
        setCustomTimer({
          ativo: data?.ativo === true,
          nome: typeof data?.nome === "string" ? data.nome : "",
          iniciadoEm:
            data?.iniciadoEm && typeof data.iniciadoEm.toMillis === "function"
              ? data.iniciadoEm.toMillis()
              : typeof data?.iniciadoEmMs === "number" && data.iniciadoEmMs > 0
                ? data.iniciadoEmMs : null,
          duracaoMs: typeof data?.duracaoMs === "number" && data.duracaoMs > 0
            ? data.duracaoMs : 60000,
        });
        setTimerNow(Date.now());
      },
      (error) => console.error("ERRO TEMPORIZADOR PERSONALIZADO:", error),
    );

    const unsubCharacters = onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<CharacterData, "id">),
        }));
        setCharacters(list);
        setSelectedCharacterId((current) =>
          current && !list.some((character) => character.id === current && character.ativo === true)
            ? null
            : current,
        );
      },
      (error) => console.error("Erro ao sincronizar personagens:", error),
    );

    const unsubNPCs = onSnapshot(
      collection(db, "npcCards"),
      (snapshot) => {
        setNpcs(snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<NPCData, "id">),
        })));
      },
      (error) => console.error("Erro ao sincronizar NPCs:", error),
    );

    const unsubPendencias = onSnapshot(
      collection(db, "game", "pendencias", "items"),
      (snapshot) => {
        setPendencias(
          snapshot.docs
            .map((item) => ({
              id: item.id,
              ...(item.data() as Omit<PendingData, "id">),
            }))
            .sort((a, b) => (a.expiraEm || Infinity) - (b.expiraEm || Infinity)),
        );
      },
      (error) => console.error("Erro ao sincronizar pendências:", error),
    );

    const unsubSkillCards = onSnapshot(
      collection(db, "skillCards"),
      (snapshot) => {
        setSkillCards(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<SkillCardData, "id">),
          })),
        );
      },
      (error) => console.error("ERRO AO SINCRONIZAR SKILL CARDS:", error),
    );

    return () => {
      unsubSession();
      unsubAlerta();
      unsubDestruction();
      unsubCustomTimer();
      unsubCharacters();
      unsubNPCs();
      unsubPendencias();
      unsubSkillCards();
    };
  }, []);

  useEffect(() => {
    if (!destructionTimer.ativo && !customTimer.ativo) return;
    const interval = setInterval(() => setTimerNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [destructionTimer.ativo, customTimer.ativo]);

  const destructionRemainingMs = destructionTimer.iniciadoEm === null
    ? destructionTimer.duracaoMs
    : Math.max(
        0,
        destructionTimer.iniciadoEm + destructionTimer.duracaoMs - timerNow,
      );

  const customTimerRemainingMs = customTimer.iniciadoEm === null
    ? customTimer.duracaoMs
    : Math.max(0, customTimer.iniciadoEm + customTimer.duracaoMs - timerNow);

  const applyCustomTimerAction = async (action: "start" | "stop") => {
    if (loading) return;
    if (action === "start" && customTimer.ativo) return;
    if (action === "stop" && !customTimer.ativo) return;
    const name = customTimerName.trim().replace(/\s+/g, " ");
    const values = [customTimerHours, customTimerMinutes, customTimerSeconds];
    if (action === "start") {
      if (!name) { showMessage("Informe o nome do temporizador."); return; }
      if (!values.every((v) => /^\d+$/.test(v.trim()))) {
        showMessage("Preencha horas, minutos e segundos com números inteiros.");
        return;
      }
      const [hours, minutes, seconds] = values.map(Number);
      if (hours > 99 || minutes > 59 || seconds > 59) {
        showMessage("Limites: 99 horas, 59 minutos e 59 segundos.");
        return;
      }
      const durationMs = ((hours * 60 + minutes) * 60 + seconds) * 1000;
      if (durationMs < 1000) { showMessage("O temporizador deve durar pelo menos 1 segundo."); return; }
      try {
        setLoading(true);
        await setDoc(doc(db, "game", "customCountdown"), {
          ativo: true,
          nome: name.slice(0, 48),
          duracaoMs: durationMs,
          iniciadoEm: serverTimestamp(),
          iniciadoEmMs: Date.now(),
          atualizadoEm: serverTimestamp(),
        }, { merge: true });
        showMessage(`Temporizador iniciado: ${name.slice(0, 48)}.`);
      } catch (error) {
        console.error("ERRO AO INICIAR TEMPORIZADOR:", error);
        showMessage("Não foi possível iniciar o temporizador.");
      } finally { setLoading(false); }
    } else {
      try {
        setLoading(true);
        await setDoc(doc(db, "game", "customCountdown"), {
          ativo: false,
          iniciadoEm: null,
          iniciadoEmMs: null,
          atualizadoEm: serverTimestamp(),
        }, { merge: true });
        setCustomTimerConfirmStop(false);
        showMessage("Temporizador encerrado para todos os jogadores.");
      } catch (error) {
        console.error("ERRO AO PARAR TEMPORIZADOR:", error);
        showMessage("Não foi possível encerrar o temporizador.");
      } finally { setLoading(false); }
    }
  };

  const performDestructionAction = async () => {
    if (loading || !destructionConfirm) return;
    const starting = destructionConfirm === "start";
    if (starting === destructionTimer.ativo) {
      setDestructionConfirm(null);
      return;
    }

    try {
      setLoading(true);
      await setDoc(
        doc(db, "game", "selfDestructCountdown"),
        starting
          ? {
              ativo: true,
              iniciadoEm: serverTimestamp(),
              iniciadoEmMs: Date.now(),
              duracaoMs: DESTRUCTION_DURATION_MS,
              atualizadoEm: serverTimestamp(),
            }
          : {
              ativo: false,
              atualizadoEm: serverTimestamp(),
            },
        { merge: true },
      );
      setDestructionConfirm(null);
      setEventDetail(null);
      setActionModal(null);
      showMessage(starting ? "Autodestruição iniciada: 60 minutos." : "Contagem de autodestruição interrompida.");
    } catch (error) {
      console.error("ERRO AO ALTERAR CONTAGEM DE AUTODESTRUIÇÃO:", error);
      showMessage("Não foi possível alterar o contador de autodestruição.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionLock = async () => {
    if (loading) return;

    try {
      await setDoc(
        doc(db, "game", "session"),
        { bloqueada: !session.bloqueada },
        { merge: true },
      );

      showMessage(
        session.bloqueada
          ? "Sessão desbloqueada."
          : "Sessão bloqueada. Alterações dos jogadores devem ficar desabilitadas.",
      );
    } catch (error) {
      console.error(error);
      showMessage("Erro ao alterar o bloqueio da sessão.");
    }
  };

  const openActionModal = (
    action: "cards" | "npcs" | "documentos" | "eventos",
  ) => {
    setSnackbarVisible(false);
    setSnackbarMessage("");
    setActionModal(action);
    setEventDetail(null);
    setDestructionConfirm(null);

    if (action === "cards") {
      setReleaseMode("individual");
      setReleaseAction("liberar");
      setSelectedTier(1);
      setSelectedCardId(null);
    }

    if (action === "documentos") {
      setDocumentSearch("");
      setDocumentCategoryId("todos");
      setSelectedDocumentId(null);
      setDocumentRecipientIds([]);
      setDocumentFeedback("");
      setLastPreviewedDocumentId(null);
      setReleaseAction("liberar");
    }

    if (action === "npcs") {
      setReleaseMode("individual");
      setNpcOperationType("npc");
      setReleaseAction("liberar");
      setSelectedNpcId(null);
      setNpcCardPreview(false);
      setNpcUnlockConfirm(false);
      setNpcInfoField("nome");
      setGallerySelectedImageId(null);
      setGalleryRecipientIds([]);
      setGalleryFeedback("");
      setGalleryPreviewId(null);
    }
  };

  const closeActionModal = () => {
    if (loading) return;
    setDestructionConfirm(null);
    setEventDetail(null);
    setActionModal(null);
  };

  const openEventDetail = (detail: "destruction" | "customTimer" | "alarm" | "radio" | "attacks" | "classes" | "choices") => {
    setReleaseMode("individual");
    setReleaseAction("liberar");
    setDestructionConfirm(null);
    setEventDetail(detail);
  };

  const openDocumentPreview = () => {
    if (!selectedDocumentId || loading) return;
    const documentId = selectedDocumentId;
    previewedDocumentIdRef.current = documentId;
    reopenDocumentModalRef.current = true;
    setActionModal(null);
    setTimeout(() => {
      router.push({
        pathname: "/gm-document-preview" as any,
        params: { document: documentId },
      });
    }, 260);
  };

  const toggleDocumentRecipient = (id: string) => {
    setDocumentRecipientIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const applyDocumentOperation = async () => {
    if (loading) return;
    if (!currentDocument) {
      showMessage("Selecione um documento.");
      return;
    }
    if (documentRecipientIds.length === 0) {
      showMessage("Selecione pelo menos um personagem.");
      return;
    }

    const liberado = releaseAction === "liberar";
    try {
      setLoading(true);
      const batch = writeBatch(db);
      for (const characterId of documentRecipientIds) {
        const accessRef = doc(
          db,
          "characters",
          characterId,
          "documentAccess",
          currentDocument.id,
        );
        batch.set(accessRef, {
          liberado,
          alteradoEm: serverTimestamp(),
        }, { merge: true });
      }
      await batch.commit();
      setDocumentFeedback(
        `${liberado ? "ACESSO LIBERADO" : "ACESSO BLOQUEADO"} PARA ${documentRecipientIds.length} PERSONAGEM(NS).`,
      );
    } catch (error) {
      console.error("ERRO AO ALTERAR ACESSO A DOCUMENTOS:", error);
      setDocumentFeedback("ERRO AO SALVAR. VERIFIQUE A CONEXÃO E AS REGRAS DO FIRESTORE.");
    } finally {
      setLoading(false);
    }
  };

  const applyGalleryOperation = async () => {
    if (loading) return;
    if (!selectedNpcId || !gallerySelectedImage) {
      showMessage("Selecione um NPC e uma imagem da galeria.");
      return;
    }
    if (galleryRecipientIds.length === 0) {
      showMessage("Selecione pelo menos um personagem.");
      return;
    }

    const liberado = releaseAction === "liberar";
    try {
      setLoading(true);
      const batch = writeBatch(db);
      for (const characterId of galleryRecipientIds) {
        batch.set(
          doc(db, "characters", characterId, "npcAccess", selectedNpcId),
          { galeria: { [gallerySelectedImage.id]: liberado } },
          { merge: true },
        );
      }
      await batch.commit();
      setGalleryFeedback(
        `${gallerySelectedImage.id.toUpperCase()} — ${liberado ? "LIBERADA" : "BLOQUEADA"} PARA ${galleryRecipientIds.length} PERSONAGEM(NS).`,
      );
    } catch (error) {
      console.error("ERRO AO ALTERAR ACESSO À GALERIA:", error);
      setGalleryFeedback("ERRO AO SALVAR. VERIFIQUE A CONEXÃO E AS REGRAS DO FIRESTORE.");
    } finally {
      setLoading(false);
    }
  };

  const applySkillCardOperation = async () => {
    if (!selectedCharacterId || loading) {
      showMessage("Selecione um personagem alvo.");
      return;
    }

    try {
      setLoading(true);

      const characterRef = doc(db, "characters", selectedCharacterId);
      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedCardId) {
          showMessage("Selecione uma Skill Card.");
          return;
        }

        const card = skillCards.find((item) => item.id === selectedCardId);

        if (!card) {
          showMessage("Skill Card não encontrada.");
          return;
        }

        const tier = card.tier as 1 | 2 | 3 | undefined;

        if (!tier) {
          showMessage("Essa Skill Card não possui Tier definido.");
          return;
        }

        await updateDoc(characterRef, {
          [`skillCardTiers.tier${tier}`]: value,
        });

        showMessage(
          `${value ? "Liberado" : "Bloqueado"}: ${card.nome || card.id}.`,
        );
      } else {
        if (selectedTier === 1 || selectedTier === 2 || selectedTier === 3) {
          await updateDoc(characterRef, {
            [`skillCardTiers.tier${selectedTier}`]: value,
          });

          showMessage(
            `Tier ${selectedTier} ${
              value ? "liberado" : "bloqueado"
            } para ${displayCharacter(selectedCharacter!)}.`,
          );
        }
      }
    } catch (error) {
      console.error("ERRO SKILL CARD:", error);
      showMessage("Não foi possível alterar a liberação da Skill Card.");
    } finally {
      setLoading(false);
    }
  };

  const getNpcAccessRef = (characterId: string, npcId: string) =>
    doc(db, "characters", characterId, "npcAccess", npcId);

  const applyNpcOperation = async () => {
    if (!selectedCharacterId || loading) {
      showMessage("Selecione um personagem alvo.");
      return;
    }

    try {
      setLoading(true);

      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedNpcId) {
          showMessage("Selecione um NPC.");
          return;
        }

        const hasUnlockCard = Boolean(getNpcUnlockCard(selectedNpcId));
        if (value && hasUnlockCard && selectedCharacter?.ativo === true) {
          const batch = writeBatch(db);
          const eventId = doc(collection(db, "npcUnlockEvents")).id;
          batch.set(
            getNpcAccessRef(selectedCharacterId, selectedNpcId),
            { descoberto: true },
            { merge: true },
          );
          batch.set(
            doc(db, "game", "npcUnlockPopup"),
            {
              eventId,
              npcId: selectedNpcId,
              recipients: [selectedCharacterId],
              publicadoEm: serverTimestamp(),
              publicadoEmMs: Date.now(),
            },
            { merge: true },
          );
          await batch.commit();
        } else {
          await setDoc(
            getNpcAccessRef(selectedCharacterId, selectedNpcId),
            { descoberto: value },
            { merge: true },
          );
        }

        const npc = npcs.find((item) => item.id === selectedNpcId);

        showMessage(
          `${npc ? displayNpcRealName(npc) : "NPC"} ${
            value ? "liberado" : "bloqueado"
          }.`,
        );
      } else {
        if (npcs.length === 0) {
          showMessage("Nenhum NPC cadastrado.");
          return;
        }

        await Promise.all(
          npcs.map((npc) =>
            setDoc(
              getNpcAccessRef(selectedCharacterId, npc.id),
              { descoberto: value },
              { merge: true },
            ),
          ),
        );

        showMessage(
          `${npcs.length} NPCs ${
            value ? "liberados" : "bloqueados"
          } para ${displayCharacter(selectedCharacter!)}.`,
        );
      }
    } catch (error) {
      console.error("ERRO NPC:", error);
      showMessage(
        "Não foi possível alterar a liberação do NPC. Verifique a conexão com o Firebase.",
      );
    } finally {
      setLoading(false);
    }
  };

  const applyNpcInfoOperation = async () => {
    if (!selectedCharacterId || loading) {
      showMessage("Selecione um personagem alvo.");
      return;
    }

    try {
      setLoading(true);

      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedNpcId) {
          showMessage("Selecione um NPC.");
          return;
        }

        await setDoc(
          getNpcAccessRef(selectedCharacterId, selectedNpcId),
          {
            informacoes: {
              [npcInfoField]: value,
            },
          },
          { merge: true },
        );

        const npc = npcs.find((item) => item.id === selectedNpcId);

        showMessage(
          `${npc ? displayNpcRealName(npc) : "NPC"} — ${
            npcInfoFields.find((field) => field.key === npcInfoField)?.label
          } ${value ? "liberado" : "bloqueado"}.`,
        );
      } else {
        if (npcs.length === 0) {
          showMessage("Nenhum NPC cadastrado.");
          return;
        }

        await Promise.all(
          npcs.map((npc) =>
            setDoc(
              getNpcAccessRef(selectedCharacterId, npc.id),
              {
                informacoes: {
                  [npcInfoField]: value,
                },
              },
              { merge: true },
            ),
          ),
        );

        showMessage(
          `${npcInfoFields.find((field) => field.key === npcInfoField)?.label} ${
            value ? "liberado" : "bloqueado"
          } para todos os NPCs.`,
        );
      }
    } catch (error) {
      console.error("ERRO INFO NPC:", error);
      showMessage(
        "Não foi possível alterar a informação do NPC.",
      );
    } finally {
      setLoading(false);
    }
  };

  const registrarEscolhaImportante = async () => {
    const texto = escolhaTexto.trim();

    if (loading) return;
    if (!selectedCharacterId) {
      showMessage("Selecione um personagem alvo.");
      return;
    }
    if (!texto) {
      showMessage("Escreva o registro da escolha antes de salvar.");
      return;
    }

    try {
      setLoading(true);
      await updateDoc(doc(db, "characters", selectedCharacterId), {
        escolhasImportantes: arrayUnion({
          sessao: escolhaSessao,
          texto,
          criadoEm: Date.now(),
        }),
      });
      setEscolhaTexto("");
      showMessage(`Escolha registrada para ${selectedCharacterLabel}.`);
    } catch (error) {
      console.error("ERRO AO REGISTRAR ESCOLHA IMPORTANTE:", error);
      showMessage("Não foi possível registrar a escolha importante.");
    } finally {
      setLoading(false);
    }
  };

  const applyClassEventOperation = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const value = releaseAction === "liberar";

      if (releaseMode === "individual") {
        if (!selectedCharacterId) {
          showMessage("Selecione um personagem alvo.");
          return;
        }

        const character = characters.find((item) => item.id === selectedCharacterId);
        if (!character) {
          showMessage("Personagem não encontrado.");
          return;
        }

        if (value && character.classe) {
          showMessage(`${displayCharacter(character)} já possui a classe ${character.classe}.`);
          return;
        }

        await updateDoc(doc(db, "characters", selectedCharacterId), {
          eventoClasseLiberado: value,
        });

        showMessage(
          value
            ? `Escolha de classe liberada para ${displayCharacter(character)}.`
            : `Escolha de classe bloqueada para ${displayCharacter(character)}.`,
        );
        return;
      }

      if (activeCharacters.length === 0) {
        showMessage("Nenhum personagem ativo.");
        return;
      }

      const charactersToUpdate = value
        ? activeCharacters.filter((character) => !character.classe)
        : activeCharacters;

      if (charactersToUpdate.length === 0) {
        showMessage("Todos os personagens ativos já possuem uma classe.");
        return;
      }

      await Promise.all(
        charactersToUpdate.map((character) =>
          updateDoc(doc(db, "characters", character.id), {
            eventoClasseLiberado: value,
          }),
        ),
      );

      showMessage(
        value
          ? `Escolha de classe liberada para ${charactersToUpdate.length} personagem(ns).`
          : `Escolha de classe bloqueada para ${charactersToUpdate.length} personagem(ns).`,
      );
    } catch (error) {
      console.error("ERRO EVENTO DE CLASSE:", error);
      showMessage("Não foi possível alterar o evento de escolha de classe.");
    } finally {
      setLoading(false);
    }
  };

  const iniciarAlerta = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await setDoc(
        doc(db, "game", "alert"),
        { ativo: true, porcentagem: 0 },
        { merge: true },
      );
      showMessage("Barra de alerta iniciada.");
    } catch (error) {
      console.error("ERRO AO INICIAR ALERTA:", error);
      showMessage("Não foi possível iniciar a barra de alerta.");
    } finally {
      setLoading(false);
    }
  };

  const encerrarAlerta = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await setDoc(
        doc(db, "game", "alert"),
        { ativo: false, porcentagem: 0 },
        { merge: true },
      );
      showMessage("Barra de alerta encerrada.");
    } catch (error) {
      console.error("ERRO AO ENCERRAR ALERTA:", error);
      showMessage("Não foi possível encerrar a barra de alerta.");
    } finally {
      setLoading(false);
    }
  };

  const alterarAlerta = async (delta: number) => {
    if (loading || !alerta.ativo) return;

    const atual = Math.max(0, Math.min(100, Number(alerta.porcentagem) || 0));
    const proximo = Math.max(0, Math.min(100, atual + delta));

    if (proximo === atual) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, "game", "alert"), {
        porcentagem: proximo,
      });
    } catch (error) {
      console.error("ERRO AO ALTERAR ALERTA:", error);
      showMessage("Não foi possível alterar a barra de alerta.");
    } finally {
      setLoading(false);
    }
  };

  const notifyTengu = async () => {
    if (loading) return;

    try {
      setLoading(true);

      const equipped = await tenguHasOpportunityCard();

      if (!equipped) {
        showMessage("O Tengu não equipou Golpe de Oportunidade.");
        return;
      }

      await setDoc(
        doc(db, "game", "tenguOpportunity"),
        {
          disparo: increment(1),
          atualizadoEm: serverTimestamp(),
        },
        { merge: true },
      );

      showMessage("Notificação enviada ao Tengu.");
    } catch (error) {
      console.error("ERRO AO NOTIFICAR TENGU:", error);
      showMessage("Não foi possível enviar a notificação ao Tengu.");
    } finally {
      setLoading(false);
      setTenguConfirmVisible(false);
    }
  };

  const confirmTenguNotification = () => {
    if (loading || !tenguEligible) return;
    setTenguConfirmVisible(true);
  };

  const openPendingModal = (skillName?: string, characterId?: string) => {
    if (characterId) setSelectedCharacterId(characterId);

    setPendingTitle(skillName || "");
    setPendingObservation("");
    setPendingReminder("");
    setPendingDuration("");
    setPendingModalVisible(true);
  };

  const createPending = async () => {
    if (!selectedCharacterId) {
      showMessage("Selecione um personagem ativo.");
      return;
    }

    if (!pendingTitle.trim()) {
      showMessage("Dê um nome para a pendência.");
      return;
    }

    const seconds = Number(pendingDuration.replace(",", "."));

    if (
      pendingDuration.trim() &&
      (!Number.isFinite(seconds) || seconds <= 0)
    ) {
      showMessage("A duração precisa ser um número em segundos.");
      return;
    }

    try {
      setLoading(true);

      const now = Date.now();
      const expiresAt =
        pendingDuration.trim() && Number.isFinite(seconds)
          ? now + seconds * 1000
          : null;

      const pendingRef = doc(
        collection(db, "game", "pendencias", "items"),
      );

      await setDoc(pendingRef, {
        characterId: selectedCharacterId,
        characterName: selectedCharacter ? displayCharacter(selectedCharacter) : selectedCharacterId,
        titulo: pendingTitle.trim(),
        habilidade: pendingTitle.trim(),
        observacao: pendingObservation.trim(),
        lembrete: pendingReminder.trim(),
        criadoEm: now,
        expiraEm: expiresAt,
        concluida: false,
      });

      setPendingModalVisible(false);
      showMessage("Pendência criada.");
    } catch (error) {
      console.error(error);
      showMessage("Erro ao criar pendência.");
    } finally {
      setLoading(false);
    }
  };

  const completePending = async (id: string) => {
    try {
      await updateDoc(doc(db, "game", "pendencias", "items", id), {
        concluida: true,
      });
    } catch (error) {
      console.error(error);
      showMessage("Erro ao concluir pendência.");
    }
  };

  const deletePending = async (id: string) => {
    try {
      await deleteDoc(doc(db, "game", "pendencias", "items", id));
    } catch (error) {
      console.error(error);
      showMessage("Erro ao excluir pendência.");
    }
  };

  const deleteSubcollection = async (characterId: string, subcollectionName: string) => {
    const snapshot = await getDocs(collection(db, "characters", characterId, subcollectionName));
    for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
      const batch = writeBatch(db);
      snapshot.docs.slice(offset, offset + 400).forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }
  };

  const resetCharacterData = async (characterId: string) => {
    const defaults = characterDefaults[characterId as keyof typeof characterDefaults];
    if (!defaults) throw new Error(`Personagem não configurado: ${characterId}`);
    await setDoc(doc(db, "characters", characterId), {
      ...defaults,
      ativo: false,
      classe: null,
      eventoClasseLiberado: false,
      resetadoEm: serverTimestamp(),
    });
    await Promise.all([
      deleteSubcollection(characterId, "inventory"),
      deleteSubcollection(characterId, "npcAccess"),
      deleteSubcollection(characterId, "npcNotes"),
      deleteSubcollection(characterId, "documentAccess"),
      deleteSubcollection(characterId, "notifications"),
    ]);
  };

  const resetCharacters = async () => {
    for (const characterId of Object.keys(characterDefaults)) {
      await resetCharacterData(characterId);
    }
  };

  const resetOneCharacter = async () => {
    if (loading || !singleResetId) return;
    const characterId = singleResetId;
    const character = characters.find((item) => item.id === characterId);
    const characterName = character ? displayCharacter(character) : characterId;
    if (!characterDefaults[characterId as keyof typeof characterDefaults]) {
      showMessage("Personagem não encontrado na configuração inicial.");
      return;
    }

    try {
      setLoading(true);
      await resetCharacterData(characterId);
      const related = await getDocs(collection(db, "game", "pendencias", "items"));
      const pendingDocs = related.docs.filter((item) => item.data().characterId === characterId);
      for (let offset = 0; offset < pendingDocs.length; offset += 400) {
        const batch = writeBatch(db);
        pendingDocs.slice(offset, offset + 400).forEach((item) => batch.delete(item.ref));
        await batch.commit();
      }

      const storedCharacter = await AsyncStorage.getItem("selectedCharacter");
      if (storedCharacter &&
        [characterName, character?.nome, characterLabels[characterId], characterId]
          .filter(Boolean)
          .some((name) => String(name).toLowerCase() === storedCharacter.toLowerCase())) {
        await AsyncStorage.removeItem("selectedCharacter");
      }
      if (selectedCharacterId === characterId) setSelectedCharacterId(null);
      setSingleResetVisible(false);
      setSingleResetId(null);
      showMessage(`${characterName} restaurado e desativado. Jogadores conectados serão desconectados.`);
    } catch (error) {
      console.error("ERRO AO RESETAR PERSONAGEM:", error);
      showMessage("Não foi possível concluir o reset do personagem. Verifique as permissões do Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const unlockNpcForActivePlayers = async () => {
    const npcId = selectedNpcId;
    if (loading || !npcId || !getNpcUnlockCard(npcId)) return;
    if (activeCharacters.length === 0) {
      showMessage("Não há personagens ativos para receber o desbloqueio.");
      setNpcUnlockConfirm(false);
      return;
    }

    try {
      setLoading(true);
      const batch = writeBatch(db);
      const recipientIds = activeCharacters.map((character) => character.id);
      const eventId = doc(collection(db, "npcUnlockEvents")).id;

      for (const characterId of recipientIds) {
        batch.set(
          doc(db, "characters", characterId, "npcAccess", npcId),
          { descoberto: true },
          { merge: true },
        );
      }

      batch.set(
        doc(db, "game", "npcUnlockPopup"),
        {
          eventId,
          npcId,
          recipients: recipientIds,
          publicadoEm: serverTimestamp(),
          publicadoEmMs: Date.now(),
        },
        { merge: true },
      );

      await batch.commit();
      const unlockedName = npcs.find((item) => item.id === npcId)?.nomeVerdadeiro ?? npcId;
      setNpcUnlockConfirm(false);
      showMessage(`${unlockedName} desbloqueado para ${recipientIds.length} personagem(ns).`);
    } catch (error) {
      console.error("Erro ao desbloquear NPC para os jogadores:", error);
      showMessage("Não foi possível enviar o desbloqueio.");
    } finally {
      setLoading(false);
    }
  };

  const resetNPCs = async () => {
    const current = await getDocs(collection(db, "npcCards"));

    for (const item of current.docs) {
      await deleteDoc(item.ref);
    }

    for (const [npcId, npcData] of Object.entries(npcDefaults)) {
      await setDoc(doc(db, "npcCards", npcId), npcData);
    }
  };

  const resetPendencias = async () => {
    const current = await getDocs(
      collection(db, "game", "pendencias", "items"),
    );

    for (const item of current.docs) {
      await deleteDoc(item.ref);
    }
  };

  const resetSystem = async () => {
    if (loading) return;

    try {
      setLoading(true);
      await resetCharacters();
      await resetNPCs();
      await resetPendencias();

      await Promise.all([
        setDoc(doc(db, "game", "selfDestructCountdown"),
          { ativo: false, atualizadoEm: serverTimestamp() }, { merge: true }),
        setDoc(doc(db, "game", "alert"),
          { ativo: false, porcentagem: 0, disparo: 0 }, { merge: true }),
        setDoc(doc(db, "game", "customCountdown"),
          { ativo: false, iniciadoEm: null, iniciadoEmMs: null, atualizadoEm: serverTimestamp() }, { merge: true }),
        setDoc(doc(db, "game", "npcUnlockPopup"),
          { eventId: "", recipients: [], publicadoEmMs: 0 }, { merge: true }),
        setDoc(doc(db, "game", "tenguOpportunity"),
          { disparo: 0, atualizadoEm: serverTimestamp() }, { merge: true }),
      ]);

      await setDoc(doc(db, "game", "session"), {
        bloqueada: false,
        resetVersion: increment(1),
        atualizadoEm: serverTimestamp(),
      }, { merge: true });

      await AsyncStorage.multiRemove(["selectedCharacter", "userMode", "gmSessionVersion"]);
      setSelectedCharacterId(null);
      showMessage("Sistema reiniciado. Todas as sessões foram encerradas.");
      router.replace("/");
    } catch (error) {
      console.error("ERRO NO RESET:", error);
      showMessage("Falha ao concluir o reset geral. Verifique os registros e as permissões do Firestore.");
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = () => {
    if (loading) return;
    setResetModalVisible(true);
  };

  const executeReset = async () => {
    setResetModalVisible(false);
    await resetSystem();
  };

  const selectedCharacterLabel = selectedCharacter
    ? displayCharacter(selectedCharacter)
    : "NENHUM PERSONAGEM";

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>ANIQUILAÇÃO // MESTRE</Text>
          <Text style={styles.title}>CONTROLE</Text>
        </View>

        <View
          style={[
            styles.sessionCard,
            session.bloqueada && styles.sessionCardLocked,
          ]}
        >
          <View style={styles.sessionMain}>
            <View
              style={[
                styles.sessionDot,
                session.bloqueada
                  ? styles.sessionDotLocked
                  : styles.sessionDotOpen,
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>
                {session.bloqueada ? "SESSÃO BLOQUEADA" : "SESSÃO ABERTA"}
              </Text>
              <Text style={styles.sessionSubtitle}>
                {session.bloqueada
                  ? "ALTERAÇÕES DOS JOGADORES DESABILITADAS"
                  : "SISTEMA OPERACIONAL"}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={toggleSessionLock}
            disabled={loading}
            style={styles.sessionButton}
          >
            <Text style={styles.sessionButtonText}>
              {session.bloqueada ? "DESBLOQUEAR" : "BLOQUEAR"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.kicker}>MESTRE</Text>
              <Text style={styles.sectionTitle}>PENDÊNCIAS</Text>
            </View>
            <Text style={styles.counter}>
              {pendencias.filter((item) => !item.concluida).length}
            </Text>
          </View>

          {pendencias.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>NENHUMA PENDÊNCIA ATIVA</Text>
            </View>
          ) : (
            pendencias.map((pending) => (
              <PendingCard
                key={pending.id}
                pending={pending}
                onComplete={() => completePending(pending.id)}
                onDelete={() => deletePending(pending.id)}
              />
            ))
          )}

          {tenguEligible && (
            <Pressable
              onPress={confirmTenguNotification}
              disabled={loading}
              style={[styles.tenguQuickAction, loading && styles.disabled]}
            >
              <Ionicons name="eye-outline" size={21} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tenguQuickTitle}>NOTIFICAR TENGU</Text>
                <Text style={styles.tenguQuickSubtitle}>GOLPE DE OPORTUNIDADE · INIMIGO ABAIXO DE 25% DE VIDA</Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
            </Pressable>
          )}

          <Pressable
            onPress={() => openPendingModal()}
            disabled={loading}
            style={[styles.secondaryButton, loading && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>
              + NOVA PENDÊNCIA
            </Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mostrar ou ocultar habilidades ativas"
            onPress={() => setMonitorExpanded((value) => !value)}
            style={styles.monitorToggle}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>MONITORAMENTO</Text>
              <Text style={styles.sectionTitle}>HABILIDADES ATIVAS</Text>
              <Text style={styles.monitorSummary}>
                {activeCharacters.length} PERSONAGENS · TOQUE PARA {monitorExpanded ? "RECOLHER" : "EXPANDIR"}
              </Text>
            </View>
            <Ionicons name={monitorExpanded ? "chevron-up" : "chevron-down"} size={19} color={colors.textMuted} />
          </Pressable>
          {monitorExpanded && (<>
          {activeCharacters.map((character) => {
            const selectedCards = Object.values(
              character.skillCards || {},
            ).filter(Boolean);

            return (
              <View key={character.id} style={styles.monitorCard}>
                <View style={styles.monitorHeader}>
                  <View>
                    <Text style={styles.monitorName}>
                      {displayCharacter(character)}
                    </Text>
                    <Text style={styles.monitorSub}>
                      {character.raca || character.id}
                    </Text>
                  </View>

                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ATIVO</Text>
                  </View>
                </View>

                {selectedCards.length === 0 &&
                !character.efeitosAtivos?.trim() &&
                !character.modificacoes?.trim() ? (
                  <Text style={styles.mutedText}>
                    Nenhuma habilidade/alteração registrada.
                  </Text>
                ) : null}

                {selectedCards.map((cardId) => {
                  const card = skillCards.find((item) => item.id === cardId);

                  return (
                    <View key={String(cardId)} style={styles.effectRow}>
                      <View style={styles.effectMain}>
                        <Text style={styles.effectTitle}>
                          {card?.nome || String(cardId)}
                        </Text>
                        <Text style={styles.effectSub}>
                          SKILL CARD ATIVA
                        </Text>
                      </View>

                      <Pressable
                        onPress={() =>
                          openPendingModal(
                            card?.nome || String(cardId),
                            character.id,
                          )
                        }
                        style={styles.smallButton}
                      >
                        <Text style={styles.smallButtonText}>
                          + PENDÊNCIA
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}

                {character.efeitosAtivos?.trim() ? (
                  <View style={styles.manualBlock}>
                    <Text style={styles.manualLabel}>EFEITOS ATIVOS</Text>
                    <Text style={styles.manualText}>
                      {character.efeitosAtivos}
                    </Text>
                  </View>
                ) : null}

                {character.modificacoes?.trim() ? (
                  <View style={styles.manualBlock}>
                    <Text style={styles.manualLabel}>MODIFICAÇÕES</Text>
                    <Text style={styles.manualText}>
                      {character.modificacoes}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
          </>)}
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.kicker}>SISTEMA</Text>
          <Text style={styles.sectionTitle}>RESET</Text>

          <Pressable
            onPress={() => {
              setSingleResetId(null);
              setSingleResetVisible(true);
            }}
            disabled={loading}
            style={[styles.singleResetButton, loading && styles.disabled]}
          >
            <Text style={styles.singleResetTitle}>RESETAR UM PERSONAGEM</Text>
            <Text style={styles.singleResetSubtitle}>
              RESTAURAR DADOS, INVENTÁRIO, ACESSOS E PENDÊNCIAS INDIVIDUAIS
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmReset}
            disabled={loading}
            style={[styles.resetButton, loading && styles.disabled]}
          >
            <Text style={styles.resetTitle}>RESETAR SISTEMA COMPLETO</Text>
            <Text style={styles.resetSubtitle}>
              PERSONAGENS · INVENTÁRIOS · NPCs · ACESSOS · NOTAS · PENDÊNCIAS
            </Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sair do menu do Mestre"
          onPress={() => router.replace("/")}
          style={styles.exitButton}
        >
          <Text style={styles.exitText}>SAIR DO MENU DO MESTRE</Text>
          <Text style={styles.exitSubtitle}>RETORNAR À TELA INICIAL DO SISTEMA</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.gmBottomNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {([
          { key: "cards", label: "SKILL CARDS", icon: "layers-outline" },
          { key: "npcs", label: "NPCs + INFO", icon: "people-outline" },
          { key: "documentos", label: "DOCUMENTOS", icon: "folder-open-outline" },
          { key: "eventos", label: "EVENTOS", icon: "flash-outline" },
        ] as const).map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${item.label}`}
            onPress={() => openActionModal(item.key)}
            style={styles.gmBottomItem}
          >
            <Ionicons name={item.icon} size={21} color={colors.textMuted} />
            <Text style={styles.gmBottomLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal
        visible={actionModal !== null && !(actionModal === "eventos" && eventDetail !== null) && galleryPreviewId === null}
        transparent
        animationType="slide"
        onRequestClose={closeActionModal}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
        <View style={styles.modalBackdrop}>
          <View style={styles.operationModal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalKicker}>CONTROLE DO MESTRE</Text>
                <Text style={styles.modalTitle}>
                  {actionModal === "cards"
                    ? "SKILL CARDS"
                    : actionModal === "npcs"
                      ? "NPCs E INFOS"
                      : actionModal === "documentos"
                        ? "DOCUMENTOS"
                        : "EVENTOS"}
                </Text>
              </View>

              <Pressable
                onPress={closeActionModal}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            >
              {snackbarVisible && snackbarMessage && (
                <Text style={styles.operationFeedback}>{snackbarMessage}</Text>
              )}
              {(actionModal === "cards" || (actionModal === "npcs" && npcOperationType !== "gallery")) && (
                <>
                  <Text style={styles.modalSectionTitle}>
                    PERSONAGEM ALVO
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.modalPlayerList}
                  >
                    {activeCharacters.map((character) => {
                      const selected = character.id === selectedCharacterId;

                      return (
                        <Pressable
                          key={character.id}
                          onPress={() =>
                            setSelectedCharacterId(character.id)
                          }
                          style={[
                            styles.modalPlayer,
                            selected && styles.modalPlayerSelected,
                          ]}
                        >
                          <Text style={styles.modalPlayerName}>
                            {displayCharacter(character)}
                          </Text>
                          <Text style={styles.modalPlayerRace}>
                            {character.raca || character.id}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.modalTarget}>
                    <Text style={styles.modalTargetLabel}>ALVO</Text>
                    <Text style={styles.modalTargetValue}>
                      {selectedCharacterLabel}
                    </Text>
                  </View>
                </>
              )}

              {actionModal === "cards" && (
                <>
                  <Text style={styles.modalSectionTitle}>AÇÃO</Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="LIBERAR"
                      selected={releaseAction === "liberar"}
                      onPress={() => setReleaseAction("liberar")}
                    />
                    <SegmentButton
                      title="BLOQUEAR"
                      selected={releaseAction === "bloquear"}
                      onPress={() => setReleaseAction("bloquear")}
                    />
                  </View>

                  <Text style={styles.modalSectionTitle}>ESCOPO</Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="INDIVIDUAL"
                      selected={releaseMode === "individual"}
                      onPress={() => setReleaseMode("individual")}
                    />
                    <SegmentButton
                      title="EM MASSA"
                      selected={releaseMode === "massa"}
                      onPress={() => setReleaseMode("massa")}
                    />
                  </View>

                  {releaseMode === "individual" ? (
                    <>
                      <Text style={styles.modalSectionTitle}>
                        SKILL CARD
                      </Text>

                      {skillCards
                        .filter((card) => {
                          if (!selectedCharacter) return false;
                          if (!card.personagem) return true;

                          const values = [
                            selectedCharacter.id,
                            selectedCharacter.raca,
                            displayCharacter(selectedCharacter),
                          ]
                            .filter(Boolean)
                            .map((value) => String(value).toLowerCase());

                          return values.includes(
                            String(card.personagem).toLowerCase(),
                          );
                        })
                        .sort((a, b) => (a.tier || 0) - (b.tier || 0))
                        .map((card) => (
                          <Pressable
                            key={card.id}
                            onPress={() => setSelectedCardId(card.id)}
                            style={[
                              styles.selectionRow,
                              selectedCardId === card.id &&
                                styles.selectionRowSelected,
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.selectionTitle}>
                                {card.nome || card.id}
                              </Text>
                              <Text style={styles.selectionSub}>
                                TIER {card.tier || "—"}
                              </Text>
                            </View>
                            <Text style={styles.selectionMark}>
                              {selectedCardId === card.id ? "●" : "○"}
                            </Text>
                          </Pressable>
                        ))}
                    </>
                  ) : (
                    <>
                      <Text style={styles.modalSectionTitle}>
                        O QUE ALTERAR EM MASSA?
                      </Text>

                      <View style={styles.segmentColumn}>
                        {[1, 2, 3].map((tier) => (
                          <Pressable
                            key={tier}
                            onPress={() =>
                              setSelectedTier(tier as 1 | 2 | 3)
                            }
                            style={[
                              styles.largeChoice,
                              selectedTier === tier &&
                                styles.largeChoiceSelected,
                            ]}
                          >
                            <Text style={styles.largeChoiceTitle}>
                              TIER {tier}
                            </Text>
                            <Text style={styles.largeChoiceSub}>
                              {selectedTier === tier
                                ? "SELECIONADO"
                                : "ALTERAR ESTE TIER"}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}

                  <Pressable
                    onPress={applySkillCardOperation}
                    disabled={loading || !selectedCharacterId}
                    style={[
                      styles.modalExecute,
                      (!selectedCharacterId || loading) &&
                        styles.disabled,
                    ]}
                  >
                    <Text style={styles.modalExecuteText}>
                      {releaseAction === "liberar"
                        ? "LIBERAR"
                        : "BLOQUEAR"}{" "}
                      {releaseMode === "individual"
                        ? "SKILL CARD"
                        : `TIER ${selectedTier}`}
                    </Text>
                  </Pressable>
                </>
              )}

              {actionModal === "npcs" && (
                <>
                  <Text style={styles.modalSectionTitle}>
                    O QUE VOCÊ QUER CONTROLAR?
                  </Text>

                  <View style={styles.segmentRow}>
                    <SegmentButton
                      title="NPC"
                      selected={npcOperationType === "npc"}
                      onPress={() => {
                        setNpcOperationType("npc");
                        setSelectedNpcId(null);
                      }}
                    />
                     <SegmentButton
                       title="INFORMAÇÃO"
                       selected={npcOperationType === "info"}
                       onPress={() => {
                         setNpcOperationType("info");
                         setSelectedNpcId(null);
                      }}
                    />
                     <SegmentButton
                       title="GALERIA"
                       selected={npcOperationType === "gallery"}
                       onPress={() => {
                         setNpcOperationType("gallery");
                         setReleaseAction("liberar");
                         setSelectedNpcId(null);
                         setGallerySelectedImageId(null);
                         setGalleryRecipientIds([]);
                         setGalleryFeedback("");
                       }}
                     />
                   </View>

                   {npcOperationType !== "gallery" && (
                     <>
                       <Text style={styles.modalSectionTitle}>AÇÃO</Text>
                       <View style={styles.segmentRow}>
                         <SegmentButton title="LIBERAR" selected={releaseAction === "liberar"} onPress={() => setReleaseAction("liberar")} />
                         <SegmentButton title="BLOQUEAR" selected={releaseAction === "bloquear"} onPress={() => setReleaseAction("bloquear")} />
                       </View>
                       <Text style={styles.modalSectionTitle}>ESCOPO</Text>
                       <View style={styles.segmentRow}>
                         <SegmentButton title="INDIVIDUAL" selected={releaseMode === "individual"} onPress={() => { setReleaseMode("individual"); setSelectedNpcId(null); }} />
                         <SegmentButton title="EM MASSA" selected={releaseMode === "massa"} onPress={() => setReleaseMode("massa")} />
                       </View>
                     </>
                   )}

                   {npcOperationType === "gallery" ? (
                     <View style={styles.documentsSection}>
                       <Text style={styles.documentsStep}>01 / SELECIONAR NPC</Text>
                       {npcs.map((npc) => {
                         const available = getNpcGalleryImages(npc.id);
                         return (
                           <Pressable
                             key={npc.id}
                             onPress={() => {
                               setSelectedNpcId(npc.id);
                               setGallerySelectedImageId(null);
                               setGalleryRecipientIds([]);
                               setGalleryFeedback("");
                             }}
                             style={[styles.selectionRow, selectedNpcId === npc.id && styles.selectionRowSelected]}
                           >
                             <View style={{ flex: 1 }}>
                               <Text style={styles.selectionTitle}>{displayNpcRealName(npc)}</Text>
                               <Text style={styles.selectionSub}>{available.length} IMAGEM(NS) DISPONÍVEL(IS)</Text>
                             </View>
                             <Text style={styles.selectionMark}>{selectedNpcId === npc.id ? "●" : "○"}</Text>
                           </Pressable>
                         );
                       })}
                       {selectedNpcId && (
                         <>
                           <Text style={styles.documentsStep}>02 / SELECIONAR IMAGEM</Text>
                           {galleryNpcImages.length === 0 ? (
                             <Text style={styles.documentsEmpty}>ESTE NPC NÃO POSSUI IMAGENS NA PASTA GALERIA</Text>
                           ) : (
                             <View style={styles.galleryMasterList}>
                               {galleryNpcImages.map((image) => (
                                 <Pressable
                                   key={image.id}
                                   onPress={() => {
                                     setGallerySelectedImageId(image.id);
                                     setGalleryRecipientIds([]);
                                     setGalleryFeedback("");
                                   }}
                                   style={[styles.galleryMasterPhoto, gallerySelectedImageId === image.id && styles.galleryMasterPhotoSelected]}
                                 >
                                   <Image source={image.source} style={styles.galleryMasterThumb} resizeMode="cover" />
                                   <View style={{ flex: 1 }}>
                                     <Text style={styles.documentsResultTitle}>{image.id.toUpperCase()}</Text>
                                     <Text style={styles.documentsResultCategory}>IMAGEM DO ACERVO</Text>
                                   </View>
                                   <Text style={styles.documentsResultMark}>{gallerySelectedImageId === image.id ? "●" : "○"}</Text>
                                 </Pressable>
                               ))}
                             </View>
                           )}
                         </>
                       )}

                       {gallerySelectedImage && (
                         <>
                           <View style={styles.documentsSelected}>
                             <Text style={styles.documentsStep}>03 / CONFERIR IMAGEM</Text>
                             <Text style={styles.documentsSelectedTitle}>{gallerySelectedImage.id.toUpperCase()}</Text>
                             <Text style={styles.documentsSelectedMeta}>{galleryNpc ? displayNpcRealName(galleryNpc) : selectedNpcId}</Text>
                             <Pressable onPress={() => setGalleryPreviewId(gallerySelectedImage.id)} style={styles.documentsPreviewButton}>
                               <Text style={styles.documentsPreviewText}>◉  ABRIR NO VISUALIZADOR</Text>
                             </Pressable>
                           </View>

                           <Text style={styles.documentsStep}>04 / PERSONAGENS-ALVO</Text>
                           <View style={styles.documentsRecipientActions}>
                             <Pressable onPress={() => setGalleryRecipientIds(documentTargets.map(({ id }) => id))} style={styles.documentsAuxButton}>
                               <Text style={styles.documentsAuxText}>SELECIONAR TODOS</Text>
                             </Pressable>
                             <Pressable onPress={() => setGalleryRecipientIds([])} style={styles.documentsAuxButton}>
                               <Text style={styles.documentsAuxText}>LIMPAR</Text>
                             </Pressable>
                           </View>
                           <View style={styles.documentsRecipientGrid}>
                             {documentTargets.map((character) => {
                               const selected = galleryRecipientIds.includes(character.id);
                               const granted = galleryAccess[character.id];
                               return (
                                 <Pressable
                                   key={character.id}
                                   onPress={() => setGalleryRecipientIds((current) =>
                                     current.includes(character.id)
                                       ? current.filter((id) => id !== character.id)
                                       : [...current, character.id],
                                   )}
                                   style={[styles.documentsRecipient, selected && styles.documentsRecipientSelected]}
                                 >
                                   <View style={styles.documentsRecipientHeader}>
                                     <Text style={styles.documentsRecipientName} numberOfLines={1}>{displayCharacter(character)}</Text>
                                     <Text style={styles.documentsRecipientCheck}>{selected ? "☑" : "□"}</Text>
                                   </View>
                                   <Text style={styles.documentsRecipientRace}>{character.raca || "RAÇA NÃO INFORMADA"}</Text>
                                   <Text style={styles.documentsRecipientStatus}>
                                     {granted === true ? "● LIBERADO" : granted === false ? "○ BLOQUEADO" : "… CONSULTANDO"}
                                     {character.ativo ? " · ATIVO" : " · INATIVO"}
                                   </Text>
                                 </Pressable>
                               );
                             })}
                           </View>

                           <Text style={styles.documentsStep}>05 / AÇÃO</Text>
                           <View style={styles.segmentRow}>
                             <SegmentButton title="LIBERAR" selected={releaseAction === "liberar"} onPress={() => setReleaseAction("liberar")} />
                             <SegmentButton title="BLOQUEAR" selected={releaseAction === "bloquear"} onPress={() => setReleaseAction("bloquear")} />
                           </View>
                           {galleryFeedback ? <Text style={styles.documentsFeedback}>{galleryFeedback}</Text> : null}
                           <Pressable
                             onPress={applyGalleryOperation}
                             disabled={loading || galleryRecipientIds.length === 0}
                             style={[styles.documentsExecute, (loading || galleryRecipientIds.length === 0) && styles.disabled]}
                           >
                             <Text style={styles.documentsExecuteText}>
                               {loading ? "PROCESSANDO..." : `${releaseAction === "liberar" ? "LIBERAR" : "BLOQUEAR"} PARA ${galleryRecipientIds.length} PERSONAGEM(NS)`}
                             </Text>
                           </Pressable>
                         </>
                       )}
                     </View>
                   ) : npcOperationType === "npc" ? (
<>
                      {releaseMode === "individual" ? (
                        <>
                          <Text style={styles.modalSectionTitle}>
                            NPC ALVO
                          </Text>

                          {npcs.map((npc) => (
                            <Pressable
                              key={npc.id}
                              onPress={() => { setSelectedNpcId(npc.id); setNpcCardPreview(false); setNpcUnlockConfirm(false); }}
                              style={[
                                styles.selectionRow,
                                selectedNpcId === npc.id &&
                                  styles.selectionRowSelected,
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.selectionTitle}>
                                  {displayNpcRealName(npc)}
                                </Text>
                                <Text style={styles.selectionSub}>
                                  {npc.classe || "SEM CLASSE"} · NÍVEL DE
                                  ACESSO {npc.nivelAcesso ?? "—"}
                                </Text>
                              </View>

                              <Text style={styles.selectionMark}>
                                {selectedNpcId === npc.id ? "●" : "○"}
                              </Text>
                            </Pressable>
                          ))}
                          {selectedNpcId && getNpcUnlockCard(selectedNpcId) && (
                            <View style={styles.npcCardPreviewPanel}>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => setNpcCardPreview((open) => !open)}
                                style={styles.npcCardPreviewToggle}
                              >
                                <Ionicons name="image-outline" size={19} color={colors.accent} />
                                <Text style={styles.npcCardPreviewTitle}>
                                  {npcCardPreview ? "OCULTAR CARD" : "VISUALIZAR CARD DE DESBLOQUEIO"}
                                </Text>
                                <Ionicons name={npcCardPreview ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                              </Pressable>
                              {npcCardPreview && (
                                <Image
                                  source={getNpcUnlockCard(selectedNpcId)!}
                                  resizeMode="contain"
                                  style={styles.npcCardImage}
                                />
                              )}
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={styles.largeChoiceSelected}>
                          <Text style={styles.largeChoiceTitle}>
                            TODOS OS NPCs
                          </Text>
                          <Text style={styles.largeChoiceSub}>
                            A operação será aplicada a todos os NPCs deste
                            personagem.
                          </Text>
                        </View>
                      )}

                      <Pressable
                        onPress={applyNpcOperation}
                        disabled={
                          loading ||
                          !selectedCharacterId ||
                          (releaseMode === "individual" && !selectedNpcId)
                        }
                        style={[
                          styles.modalExecute,
                          (loading ||
                            !selectedCharacterId ||
                            (releaseMode === "individual" &&
                              !selectedNpcId)) &&
                            styles.disabled,
                        ]}
                      >
                        <Text style={styles.modalExecuteText}>
                          {releaseAction === "liberar"
                            ? "LIBERAR NPC"
                            : "BLOQUEAR NPC"}
                        </Text>
                      </Pressable>
                      {releaseMode === "individual" && releaseAction === "liberar" && selectedNpcId && Boolean(getNpcUnlockCard(selectedNpcId)) && (
                        <View style={styles.npcUnlockActions}>
                          <Text style={styles.npcUnlockHint}>
                            LIBERAÇÃO INDIVIDUAL EXIBE O CARD APENAS AO ALVO SELECIONADO.
                          </Text>
                          {npcUnlockConfirm ? (
                            <View style={styles.npcUnlockConfirmPanel}>
                              <Text style={styles.npcUnlockConfirmTitle}>
                                LIBERAR PARA TODOS OS ATIVOS?
                              </Text>
                              <Text style={styles.npcUnlockHelp}>
                                TODOS OS JOGADORES ATIVOS VERÃO O CARD POR 5 SEGUNDOS.
                              </Text>
                              <View style={styles.npcUnlockActionRow}>
                                <Pressable
                                  onPress={() => setNpcUnlockConfirm(false)}
                                  disabled={loading}
                                  style={styles.npcUnlockCancel}
                                >
                                  <Text style={styles.npcUnlockCancelText}>CANCELAR</Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => void unlockNpcForActivePlayers()}
                                  disabled={loading}
                                  style={[styles.npcUnlockExecute, loading && styles.disabled]}
                                >
                                  <Text style={styles.npcUnlockExecuteText}>CONFIRMAR</Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => setNpcUnlockConfirm(true)}
                              disabled={loading || activeCharacters.length === 0}
                              style={[styles.npcAllButton, (loading || activeCharacters.length === 0) && styles.disabled]}
                            >
                              <Text style={styles.npcAllButtonText}>LIBERAR PARA TODOS OS ATIVOS + POP-UP</Text>
                            </Pressable>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <>
                      <Text style={styles.modalSectionTitle}>
                        QUAL INFORMAÇÃO?
                      </Text>

                      {npcInfoFields.map((field) => (
                        <Pressable
                          key={field.key}
                          onPress={() => setNpcInfoField(field.key)}
                          style={[
                            styles.selectionRow,
                            npcInfoField === field.key &&
                              styles.selectionRowSelected,
                          ]}
                        >
                          <Text style={styles.selectionTitle}>
                            {field.label}
                          </Text>

                          <Text style={styles.selectionMark}>
                            {npcInfoField === field.key ? "●" : "○"}
                          </Text>
                        </Pressable>
                      ))}

                      {releaseMode === "individual" && (
                        <>
                          <Text style={styles.modalSectionTitle}>
                            NPC ALVO
                          </Text>

                          {npcs.map((npc) => (
                            <Pressable
                              key={npc.id}
                              onPress={() => setSelectedNpcId(npc.id)}
                              style={[
                                styles.selectionRow,
                                selectedNpcId === npc.id &&
                                  styles.selectionRowSelected,
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.selectionTitle}>
                                  {displayNpcRealName(npc)}
                                </Text>
                                <Text style={styles.selectionSub}>
                                  {npc.classe || "SEM CLASSE"} · NÍVEL DE
                                  ACESSO {npc.nivelAcesso ?? "—"}
                                </Text>
                              </View>

                              <Text style={styles.selectionMark}>
                                {selectedNpcId === npc.id ? "●" : "○"}
                              </Text>
                            </Pressable>
                          ))}
                        </>
                      )}

                      {releaseMode === "massa" && (
                        <View style={styles.largeChoiceSelected}>
                          <Text style={styles.largeChoiceTitle}>
                            TODOS OS NPCs
                          </Text>
                          <Text style={styles.largeChoiceSub}>
                            A informação será liberada/bloqueada em todos os
                            NPCs deste personagem.
                          </Text>
                        </View>
                      )}

                      <Pressable
                        onPress={applyNpcInfoOperation}
                        disabled={
                          loading ||
                          !selectedCharacterId ||
                          (releaseMode === "individual" && !selectedNpcId)
                        }
                        style={[
                          styles.modalExecute,
                          (loading ||
                            !selectedCharacterId ||
                            (releaseMode === "individual" &&
                              !selectedNpcId)) &&
                            styles.disabled,
                        ]}
                      >
                        <Text style={styles.modalExecuteText}>
                          {releaseAction === "liberar"
                            ? "LIBERAR INFORMAÇÃO"
                            : "BLOQUEAR INFORMAÇÃO"}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </>
              )}

              {actionModal === "documentos" && (
                <View style={styles.documentsSection}>
                  <Text style={styles.documentsStep}>01 / LOCALIZAR DOCUMENTO</Text>
                  <TextInput
                    value={documentSearch}
                    onChangeText={setDocumentSearch}
                    placeholder="Pesquisar por título ou identificação"
                    placeholderTextColor={colors.placeholder}
                    autoCorrect={false}
                    style={styles.documentsSearch}
                  />

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={styles.documentsCategories}
                  >
                    {[{ id: "todos", title: "TODOS", symbol: "⌕" }, ...documentCategories].map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={() => setDocumentCategoryId(category.id)}
                        style={[
                          styles.documentsCategoryButton,
                          documentCategoryId === category.id && styles.documentsCategoryButtonSelected,
                        ]}
                      >
                        <Text style={[
                          styles.documentsCategoryText,
                          documentCategoryId === category.id && styles.documentsCategoryTextSelected,
                        ]}>
                          {category.symbol}  {category.title}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={styles.documentsCount}>
                    {filteredDocuments.length} DOCUMENTO(S) ENCONTRADO(S)
                  </Text>
                  <ScrollView
                    style={styles.documentsResults}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredDocuments.length === 0 ? (
                      <Text style={styles.documentsEmpty}>NENHUM DOCUMENTO ENCONTRADO</Text>
                    ) : (
                      filteredDocuments.map((item) => {
                        const selected = selectedDocumentId === item.id;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => {
                              if (selectedDocumentId !== item.id) {
                                setSelectedDocumentId(item.id);
                                setDocumentRecipientIds([]);
                                setDocumentFeedback("");
                              }
                            }}
                            style={[styles.documentsResultRow, selected && styles.documentsResultSelected]}
                          >
                            <View style={styles.documentsResultMain}>
                              <Text style={styles.documentsResultTitle}>{item.title}</Text>
                              <Text style={styles.documentsResultCategory}>{item.categoryTitle}</Text>
                            </View>
                            <Text style={styles.documentsResultMark}>{selected ? "●" : "○"}</Text>
                          </Pressable>
                        );
                      })
                    )}
                  </ScrollView>

                  {currentDocument && (
                    <>
                      <View style={styles.documentsSelected}>
                        <Text style={styles.documentsStep}>02 / CONFERIR DOCUMENTO</Text>
                        <Text style={styles.documentsSelectedTitle}>{currentDocument.title}</Text>
                        <Text style={styles.documentsSelectedMeta}>
                          {currentDocument.categoryTitle} · {currentDocument.id}
                        </Text>
                        <Pressable
                          disabled={loading}
                          onPress={openDocumentPreview}
                          style={styles.documentsPreviewButton}
                        >
                          <Text style={styles.documentsPreviewText}>◉  ABRIR NO VISUALIZADOR</Text>
                        </Pressable>
                        {lastPreviewedDocumentId === selectedDocumentId && (
                          <Text style={styles.documentsPreviewed}>VISUALIZAÇÃO CONCLUÍDA</Text>
                        )}
                      </View>

                      <Text style={styles.documentsStep}>03 / PERSONAGENS-ALVO</Text>
                      <View style={styles.documentsRecipientActions}>
                        <Pressable
                          onPress={() => setDocumentRecipientIds(documentTargets.map(({ id }) => id))}
                          style={styles.documentsAuxButton}
                        >
                          <Text style={styles.documentsAuxText}>SELECIONAR TODOS</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setDocumentRecipientIds([])}
                          style={styles.documentsAuxButton}
                        >
                          <Text style={styles.documentsAuxText}>LIMPAR</Text>
                        </Pressable>
                      </View>
                      <View style={styles.documentsRecipientGrid}>
                        {documentTargets.map((character) => {
                          const selected = documentRecipientIds.includes(character.id);
                          const granted = documentAccess[character.id];
                          return (
                            <Pressable
                              key={character.id}
                              onPress={() => toggleDocumentRecipient(character.id)}
                              style={[
                                styles.documentsRecipient,
                                selected && styles.documentsRecipientSelected,
                              ]}
                            >
                              <View style={styles.documentsRecipientHeader}>
                                <Text style={styles.documentsRecipientName} numberOfLines={1}>
                                  {displayCharacter(character)}
                                </Text>
                                <Text style={styles.documentsRecipientCheck}>{selected ? "☑" : "□"}</Text>
                              </View>
                              <Text style={styles.documentsRecipientRace} numberOfLines={1}>
                                {character.raca || "RAÇA NÃO INFORMADA"}
                              </Text>
                              <Text style={styles.documentsRecipientStatus}>
                                {granted === true ? "● LIBERADO" : granted === false ? "○ BLOQUEADO" : "… CONSULTANDO"}
                                {character.ativo ? " · ATIVO" : " · INATIVO"}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Text style={styles.documentsStep}>04 / AÇÃO</Text>
                      <View style={styles.segmentRow}>
                        <SegmentButton
                          title="LIBERAR"
                          selected={releaseAction === "liberar"}
                          onPress={() => setReleaseAction("liberar")}
                        />
                        <SegmentButton
                          title="BLOQUEAR"
                          selected={releaseAction === "bloquear"}
                          onPress={() => setReleaseAction("bloquear")}
                        />
                      </View>
                      {documentFeedback ? (
                        <Text style={styles.documentsFeedback}>{documentFeedback}</Text>
                      ) : null}
                      <Pressable
                        onPress={applyDocumentOperation}
                        disabled={loading || documentRecipientIds.length === 0}
                        style={[
                          styles.documentsExecute,
                          (loading || documentRecipientIds.length === 0) && styles.disabled,
                        ]}
                      >
                        <Text style={styles.documentsExecuteText}>
                          {loading ? "PROCESSANDO..." :
                            `${releaseAction === "liberar" ? "LIBERAR" : "BLOQUEAR"} PARA ${documentRecipientIds.length} PERSONAGEM(NS)`}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}

              {actionModal === "eventos" && (
                <>
                  <Text style={styles.modalSectionTitle}>PROTOCOLOS DA INSTALAÇÃO</Text>
                  {([
                    { key: "destruction", title: "AUTODESTRUIÇÃO", subtitle: destructionTimer.ativo ? "CONTAGEM EM ANDAMENTO" : "INICIAR OU INTERROMPER CONTAGEM", icon: "timer-outline" },
                    { key: "customTimer", title: "TEMPORIZADOR", subtitle: customTimer.ativo ? `${customTimer.nome.toUpperCase()} · EM ANDAMENTO` : "CONTAGEM PERSONALIZÁVEL PARA TODOS OS JOGADORES", icon: "hourglass-outline" },
                    { key: "alarm", title: "ALARME", subtitle: alerta.ativo ? `SISTEMA ATIVO · ${alerta.porcentagem}%` : "BARRA DE ALERTA E CONTENÇÃO", icon: "warning-outline" },
                    { key: "radio", title: "TRANSMISSÕES DE RÁDIO", subtitle: radioStatus !== "parado" ? "TRANSMISSÃO EM ANDAMENTO" : "CANAIS E REPRODUÇÃO", icon: "radio-outline" },
                    { key: "attacks", title: "ATAQUES", subtitle: playingAttackId ? "EFEITO SONORO EM REPRODUÇÃO" : "GRITO DO BANSHEE · RUGIDO DO MASTODONTE", icon: "volume-high-outline" },
                    { key: "classes", title: "ESCOLHA DE CLASSES", subtitle: "LIBERAR OU BLOQUEAR EVENTO", icon: "school-outline" },
                    { key: "choices", title: "ESCOLHAS IMPORTANTES", subtitle: "REGISTRAR DECISÕES DA CAMPANHA", icon: "document-text-outline" },
                  ] as const).map((item) => (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      onPress={() => openEventDetail(item.key)}
                      style={styles.eventMenuItem}
                    >
                      <View style={styles.eventMenuIcon}>
                        <Ionicons name={item.icon} size={20} color={colors.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.eventMenuTitle}>{item.title}</Text>
                        <Text style={styles.eventMenuSubtitle}>{item.subtitle}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>


       <NpcGalleryModal
         visible={galleryPreviewImage !== null}
         npcName={galleryNpc ? displayNpcRealName(galleryNpc) : "NPC"}
         images={galleryPreviewImage ? [galleryPreviewImage] : []}
         initialImageId={galleryPreviewId}
         onClose={() => setGalleryPreviewId(null)}
       />

       <Modal
         visible={actionModal === "eventos" && eventDetail !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEventDetail(null)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.operationModal}>
              <View style={styles.modalHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Voltar aos eventos"
                  onPress={() => setEventDetail(null)}
                  style={styles.eventBackButton}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalKicker}>EVENTOS // CONTROLE DO MESTRE</Text>
                  <Text style={styles.modalTitle}>
                    {eventDetail === "destruction" ? "AUTODESTRUIÇÃO" :
                     eventDetail === "customTimer" ? "TEMPORIZADOR" :
                     eventDetail === "alarm" ? "ALARME" :
                     eventDetail === "radio" ? "TRANSMISSÕES" :
                     eventDetail === "attacks" ? "ATAQUES" :
                     eventDetail === "classes" ? "ESCOLHA DE CLASSES" : "ESCOLHAS IMPORTANTES"}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar eventos"
                  onPress={closeActionModal}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                {snackbarVisible && snackbarMessage && (
                  <Text style={styles.operationFeedback}>{snackbarMessage}</Text>
                )}
                {eventDetail === "destruction" && (<><Text style={styles.modalSectionTitle}>AUTODESTRUIÇÃO</Text>
                  <View style={styles.destructionPanel}>
                    <View style={styles.destructionPanelHeader}>
                      <Text style={styles.destructionEyebrow}>
                        VALTESIA RESEARCH // PROTOCOLO FINAL
                      </Text>
                      <Text style={styles.destructionStatus}>
                        {destructionTimer.ativo ? "CONTAGEM ATIVA" : "INATIVO"}
                      </Text>
                    </View>
                    <Text style={styles.destructionTime}>
                      {formatTime(Math.ceil(destructionRemainingMs / 1000))}
                    </Text>
                    <Text style={styles.destructionDescription}>
                      {destructionTimer.ativo
                        ? "O cronômetro está sincronizado em todos os dispositivos dos jogadores ativos."
                        : "Uma hora de contagem regressiva, visível e arrastável para os jogadores ativos."}
                    </Text>

                    {destructionConfirm ? (
                      <View style={styles.destructionConfirmBox}>
                        <Text style={styles.destructionConfirmTitle}>
                          {destructionConfirm === "start" ? "INICIAR AUTODESTRUIÇÃO?" : "INTERROMPER CONTAGEM?"}
                        </Text>
                        <Text style={styles.destructionConfirmText}>
                          {destructionConfirm === "start"
                            ? "Ao confirmar, todos os jogadores ativos verão a contagem regressiva de 60 minutos."
                            : "O cronômetro desaparecerá imediatamente dos dispositivos dos jogadores."}
                        </Text>
                        <View style={styles.destructionConfirmActions}>
                          <Pressable
                            onPress={() => setDestructionConfirm(null)}
                            disabled={loading}
                            style={styles.destructionCancel}
                          >
                            <Text style={styles.destructionCancelText}>CANCELAR</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => void performDestructionAction()}
                            disabled={loading}
                            style={[styles.destructionConfirmButton, loading && styles.disabled]}
                          >
                            <Text style={styles.destructionConfirmButtonText}>
                              {loading ? "AGUARDE..." : "CONFIRMAR"}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        disabled={loading}
                        onPress={() => setDestructionConfirm(destructionTimer.ativo ? "stop" : "start")}
                        style={[styles.destructionActionButton, loading && styles.disabled]}
                      >
                        <Text style={styles.destructionActionText}>
                          {destructionTimer.ativo ? "INTERROMPER CONTAGEM" : "INICIAR CONTAGEM — 01:00:00"}
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  </>)}
                 {eventDetail === "customTimer" && (
                   <>
                     <Text style={styles.modalSectionTitle}>TEMPORIZADOR // PROTOCOLO AUXILIAR</Text>
                     <View style={styles.customTimerPanel}>
                       <Text style={styles.customTimerEyebrow}>VALTESIA RESEARCH // CONTROLE TEMPORAL</Text>
                       <View style={styles.customTimerStatusRow}>
                         <Ionicons name="hourglass-outline" size={20} color="#9cced8" />
                         <Text style={styles.customTimerStatus}>
                           {customTimer.ativo ? "CONTAGEM ATIVA" : "SISTEMA EM ESPERA"}
                         </Text>
                       </View>
                       {customTimer.ativo ? (
                         <>
                           <Text style={styles.customTimerActiveName}>{customTimer.nome.toUpperCase()}</Text>
                           <Text style={styles.customTimerClock}>
                             {formatTime(Math.ceil(customTimerRemainingMs / 1000))}
                           </Text>
                           <Text style={styles.customTimerHint}>
                             SINCRONIZADO EM TODOS OS PERSONAGENS ATIVOS. CADA JOGADOR PODE MOVER E EXPANDIR O CONTADOR.
                           </Text>
                           {customTimerConfirmStop ? (
                             <View style={styles.customTimerConfirm}>
                               <Text style={styles.customTimerHint}>ENCERRAR A CONTAGEM PARA TODOS OS JOGADORES?</Text>
                               <View style={styles.alertActionRow}>
                                 <Pressable onPress={() => setCustomTimerConfirmStop(false)} disabled={loading} style={styles.modalPrimaryButton}>
                                   <Text style={styles.modalPrimaryText}>CANCELAR</Text>
                                 </Pressable>
                                 <Pressable onPress={() => void applyCustomTimerAction("stop")} disabled={loading} style={[styles.modalDangerButton, loading && styles.disabled]}>
                                   <Text style={styles.modalDangerText}>{loading ? "AGUARDE..." : "CONFIRMAR"}</Text>
                                 </Pressable>
                               </View>
                             </View>
                           ) : (
                             <Pressable onPress={() => setCustomTimerConfirmStop(true)} disabled={loading} style={[styles.customTimerStopButton, loading && styles.disabled]}>
                               <Text style={styles.customTimerStopText}>■ ENCERRAR TEMPORIZADOR</Text>
                             </Pressable>
                           )}
                         </>
                       ) : (
                         <>
                           <Text style={styles.inputLabel}>IDENTIFICAÇÃO DO TEMPORIZADOR</Text>
                           <TextInput
                             value={customTimerName}
                             onChangeText={setCustomTimerName}
                             placeholder="Ex.: FECHAMENTO DAS COMPORTAS"
                             placeholderTextColor={colors.placeholder}
                             maxLength={48}
                             style={styles.customTimerNameInput}
                           />
                           <Text style={styles.inputLabel}>DURAÇÃO</Text>
                           <View style={styles.customTimerFields}>
                             {([
                               { label: "HORAS", value: customTimerHours, update: setCustomTimerHours },
                               { label: "MINUTOS", value: customTimerMinutes, update: setCustomTimerMinutes },
                               { label: "SEGUNDOS", value: customTimerSeconds, update: setCustomTimerSeconds },
                             ] as const).map((field) => (
                               <View key={field.label} style={styles.customTimerField}>
                                 <Text style={styles.customTimerFieldLabel}>{field.label}</Text>
                                 <TextInput
                                   value={field.value}
                                   onChangeText={(text) => { if (/^\d*$/.test(text)) field.update(text); }}
                                   keyboardType="number-pad"
                                   selectTextOnFocus
                                   maxLength={2}
                                   placeholder="00"
                                   placeholderTextColor="#6c929d"
                                   style={styles.customTimerInput}
                                 />
                               </View>
                             ))}
                           </View>
                           <Text style={styles.customTimerHint}>
                             CONTAGEM SINCRONIZADA PELO FIREBASE · VISOR HOLOGRÁFICO RECOLHÍVEL E ARRASTÁVEL · SEM ALERTA VERMELHO
                           </Text>
                           <Pressable
                             onPress={() => void applyCustomTimerAction("start")}
                             disabled={loading}
                             style={[styles.customTimerStartButton, loading && styles.disabled]}
                           >
                             <Text style={styles.customTimerStartText}>{loading ? "INICIANDO..." : "▶ INICIAR PARA TODOS"}</Text>
                           </Pressable>
                         </>
                       )}
                     </View>
                   </>
                 )}
                 {eventDetail === "alarm" && (<>
                  <Text style={styles.modalSectionTitle}>BARRA DE ALERTA</Text>
                  <View style={styles.alertPanel}>
                    <View style={styles.alertPanelHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.alertPanelLabel}>STATUS DO EVENTO</Text>
                        <Text style={styles.alertPanelStatus}>
                          {alerta.ativo ? "ATIVO" : "INATIVO"}
                        </Text>
                      </View>
                      <Text style={styles.alertPanelPercent}>{alerta.porcentagem}%</Text>
                    </View>

                    <View style={styles.alertTrack}>
                      <View style={[styles.alertFill, { width: `${alerta.porcentagem}%` }]} />
                    </View>

                    <View style={styles.alertControlRow}>
                      <Pressable
                        onPress={() => alterarAlerta(-10)}
                        disabled={loading || !alerta.ativo || alerta.porcentagem <= 0}
                        style={[styles.alertControlButton, (loading || !alerta.ativo || alerta.porcentagem <= 0) && styles.disabled]}
                      >
                        <Text style={styles.alertControlSymbol}>−</Text>
                        <Text style={styles.alertControlLabel}>10%</Text>
                      </Pressable>

                      <View style={styles.alertValueBox}>
                        <Text style={styles.alertValue}>{alerta.porcentagem}%</Text>
                      </View>

                      <Pressable
                        onPress={() => alterarAlerta(10)}
                        disabled={loading || !alerta.ativo || alerta.porcentagem >= 100}
                        style={[styles.alertControlButton, (loading || !alerta.ativo || alerta.porcentagem >= 100) && styles.disabled]}
                      >
                        <Text style={styles.alertControlSymbol}>+</Text>
                        <Text style={styles.alertControlLabel}>10%</Text>
                      </Pressable>
                    </View>

                    <View style={styles.alertActionRow}>
                      <Pressable
                        onPress={iniciarAlerta}
                        disabled={loading || alerta.ativo}
                        style={[styles.modalPrimaryButton, (loading || alerta.ativo) && styles.disabled]}
                      >
                        <Text style={styles.modalPrimaryText}>INICIAR ALERTA</Text>
                      </Pressable>

                      <Pressable
                        onPress={encerrarAlerta}
                        disabled={loading || !alerta.ativo}
                        style={[styles.modalDangerButton, (loading || !alerta.ativo) && styles.disabled]}
                      >
                        <Text style={styles.modalDangerText}>ENCERRAR</Text>
                      </Pressable>
                    </View>
                  </View>

                  
                </>)}
                {eventDetail === "radio" && (<><Text style={styles.modalSectionTitle}>TRANSMISSÕES DE RÁDIO</Text>
                  <View style={styles.radioPanel}>
                    <Text style={styles.radioEyebrow}>VALTESIA RESEARCH // CANAL DE TRANSMISSÃO</Text>
                    <View style={styles.radioStatusRow}>
                      <View style={[styles.radioLed, radioStatus !== "parado" && styles.radioLedLive]} />
                      <Text style={styles.radioStatusText}>
                        {radioStatus === "parado" ? "SINAL INATIVO" :
                         radioStatus === "iniciando" ? (selectedRadioTrack?.fade ? "ESTABELECENDO SINAL · FADE IN (5 S)" : "INICIANDO TRANSMISSÃO") :
                         radioStatus === "encerrando" ? "ENCERRANDO SINAL · FADE OUT (5 S)" :
                         "TRANSMISSÃO EM ANDAMENTO"}
                      </Text>
                    </View>
                    <Text style={styles.radioHelp}>SELECIONE UMA TRANSMISSÃO</Text>
                    {RADIO_CATEGORIES.map((category) => (
                      <View key={category.id} style={styles.radioCategory}>
                        <View style={styles.radioCategoryHeader}>
                          <Text style={styles.radioCategoryTitle}>{category.title}</Text>
                          <Text style={styles.radioCategoryCount}>{category.tracks.length.toString().padStart(2, "0")}</Text>
                        </View>
                        <Text style={styles.radioCategorySubtitle}>{category.subtitle}</Text>
                        <View style={styles.radioGrid}>
                          {category.tracks.map((track) => (
                            <Pressable
                              key={track.id}
                              disabled={radioStatus !== "parado"}
                              onPress={() => setSelectedRadioId(track.id)}
                              style={[styles.radioTrack, selectedRadioId === track.id && styles.radioTrackSelected,
                                radioStatus !== "parado" && selectedRadioId !== track.id && styles.disabled]}
                            >
                              <Text style={[styles.radioTrackText, selectedRadioId === track.id && styles.radioTrackTextSelected]} numberOfLines={2}>
                                {track.title}
                              </Text>
                              <Text style={styles.radioTrackMark}>{selectedRadioId === track.id ? "●" : "○"}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ))}
                    <Text style={styles.radioSelected}>
                      TRANSMISSÃO SELECIONADA: {selectedRadioTrack?.title}
                    </Text>
                    <View style={styles.alertActionRow}>
                      <Pressable
                        onPress={iniciarRadio}
                        disabled={radioStatus !== "parado"}
                        style={[styles.modalPrimaryButton, radioStatus !== "parado" && styles.disabled]}
                      >
                        <Text style={styles.modalPrimaryText}>▶ INICIAR</Text>
                      </Pressable>
                      <Pressable
                        onPress={pararRadio}
                        disabled={radioStatus === "parado" || radioStatus === "encerrando"}
                        style={[styles.modalDangerButton, (radioStatus === "parado" || radioStatus === "encerrando") && styles.disabled]}
                      >
                        <Text style={styles.modalDangerText}>■ PARAR</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.radioFootnote}>
                      SAÍDA DE ÁUDIO DO MESTRE · NUMBER STATIONS: FADE DE 5 S · DEMAIS EVENTOS: INÍCIO E PARADA IMEDIATOS
                    </Text>
                  </View>

                  </>)}
                {eventDetail === "attacks" && (
                  <>
                    <Text style={styles.modalSectionTitle}>EFEITOS SONOROS // ATAQUES</Text>
                    <View style={styles.attackPanel}>
                      <Text style={styles.attackEyebrow}>VALTESIA RESEARCH // SISTEMA DE ÁUDIO</Text>
                      <Text style={styles.attackDescription}>
                        REPRODUÇÃO LOCAL NO DISPOSITIVO DO MESTRE. A SAÍDA DE ÁUDIO SEGUE A CONEXÃO BLUETOOTH DO CELULAR.
                      </Text>
                      {ATTACK_SOUNDS.map((sound) => {
                        const playing = playingAttackId === sound.id;
                        return (
                          <Pressable
                            key={sound.id}
                            accessibilityRole="button"
                            accessibilityLabel={`Reproduzir ${sound.title}`}
                            onPress={() => void playAttackSound(sound.id)}
                            style={[styles.attackButton, playing && styles.attackButtonActive]}
                          >
                            <View style={styles.attackIconFrame}>
                              <Ionicons
                                name={sound.icon}
                                size={24}
                                color={playing ? "#f2d2d2" : colors.accent}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.attackTitle}>{sound.title}</Text>
                              <Text style={styles.attackSubtitle}>
                                {playing ? "REPRODUZINDO AGORA" : sound.subtitle}
                              </Text>
                            </View>
                            <Ionicons name={playing ? "volume-high" : "play"} size={19} color={playing ? "#ecc0c0" : colors.textMuted} />
                          </Pressable>
                        );
                      })}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Parar efeito sonoro"
                        onPress={stopAttackSound}
                        disabled={playingAttackId === null}
                        style={[styles.attackStopButton, playingAttackId === null && styles.disabled]}
                      >
                        <Ionicons name="stop" size={15} color="#dcc5c5" />
                        <Text style={styles.attackStopText}>PARAR EFEITO SONORO</Text>
                      </Pressable>
                      <Text style={styles.attackFootnote}>
                        CADA TOQUE REPRODUZ O ARQUIVO UMA ÚNICA VEZ. NOVO ATAQUE INTERROMPE O EFEITO ANTERIOR.
                      </Text>
                    </View>
                  </>
                )}
                {eventDetail === "classes" && (<><Text style={styles.modalSectionTitle}>ESCOLHA DE CLASSE</Text>

                  <View style={styles.largeChoiceSelected}>
                    <Text style={styles.largeChoiceTitle}>ESCOLHA DE CLASSE</Text>
                    <Text style={styles.largeChoiceSub}>
                      Libera para o personagem o evento em que ele recuperará
                      suas memórias e escolherá uma classe.
                    </Text>
                  </View>

                  <Text style={styles.modalSectionTitle}>PERSONAGEM ALVO</Text>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalPlayerList}>
                    {activeCharacters.map((character) => {
                      const selected = character.id === selectedCharacterId;
                      const hasClass = Boolean(character.classe);
                      const eventReleased = character.eventoClasseLiberado === true;

                      return (
                        <Pressable
                          key={character.id}
                          onPress={() => setSelectedCharacterId(character.id)}
                          style={[styles.modalPlayer, selected && styles.modalPlayerSelected]}
                        >
                          <Text style={styles.modalPlayerName}>{displayCharacter(character)}</Text>
                          <Text style={styles.modalPlayerRace}>{character.raca || character.id}</Text>
                          <Text style={styles.eventCharacterStatus}>
                            {hasClass ? `CLASSE: ${character.classe}` : eventReleased ? "ESCOLHA LIBERADA" : "BLOQUEADO"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.modalTarget}>
                    <Text style={styles.modalTargetLabel}>ALVO ATUAL</Text>
                    <Text style={styles.modalTargetValue}>{selectedCharacterLabel}</Text>
                  </View>

                  <Text style={styles.modalSectionTitle}>ESCOPO</Text>
                  <View style={styles.segmentRow}>
                    <SegmentButton title="INDIVIDUAL" selected={releaseMode === "individual"} onPress={() => setReleaseMode("individual")} />
                    <SegmentButton title="EM MASSA" selected={releaseMode === "massa"} onPress={() => setReleaseMode("massa")} />
                  </View>

                  <Text style={styles.modalSectionTitle}>AÇÃO</Text>
                  <View style={styles.segmentRow}>
                    <SegmentButton title="LIBERAR" selected={releaseAction === "liberar"} onPress={() => setReleaseAction("liberar")} />
                    <SegmentButton title="BLOQUEAR" selected={releaseAction === "bloquear"} onPress={() => setReleaseAction("bloquear")} />
                  </View>

                  <View style={styles.eventWarning}>
                    <Text style={styles.eventWarningText}>
                      O Mestre apenas libera o evento.
                      {"\n"}
                      A classe será escolhida pelo próprio jogador.
                    </Text>
                  </View>

                  <Pressable
                    onPress={applyClassEventOperation}
                    disabled={loading || (releaseMode === "individual" && !selectedCharacterId)}
                    style={[styles.modalExecute, (loading || (releaseMode === "individual" && !selectedCharacterId)) && styles.disabled]}
                  >
                    <Text style={styles.modalExecuteText}>
                      {releaseAction === "liberar" ? "LIBERAR ESCOLHA DE CLASSE" : "BLOQUEAR ESCOLHA DE CLASSE"}
                    </Text>
                  </Pressable>

                  </>)}
                {eventDetail === "choices" && (<><Text style={styles.modalSectionTitle}>ESCOLHAS IMPORTANTES</Text>
                  <Text style={styles.largeChoiceSub}>
                    Registre decisões narrativas da sessão para manter o histórico do personagem. Este registro não altera atributos nem concede recompensas.
                  </Text>

                  <Text style={styles.inputLabel}>PERSONAGEM DESTINO</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalPlayerList}>
                    {activeCharacters.map((character) => (
                      <Pressable key={character.id} onPress={() => setSelectedCharacterId(character.id)}
                        style={[styles.modalPlayer, selectedCharacterId === character.id && styles.modalPlayerSelected]}>
                        <Text style={styles.modalPlayerName}>{displayCharacter(character)}</Text>
                        <Text style={styles.modalPlayerRace}>{character.raca || character.id}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <View style={styles.modalTarget}>
                    <Text style={styles.modalTargetLabel}>ALVO</Text>
                    <Text style={styles.modalTargetValue}>{selectedCharacterLabel}</Text>
                  </View>

                  <Text style={styles.inputLabel}>SESSÃO</Text>
                  <View style={styles.segmentRow}>
                    {[1, 2, 3].map((sessao) => (
                      <SegmentButton
                        key={sessao}
                        title={`SESSÃO ${sessao}`}
                        selected={escolhaSessao === sessao}
                        onPress={() => setEscolhaSessao(sessao as 1 | 2 | 3)}
                      />
                    ))}
                  </View>

                  <Text style={styles.inputLabel}>O QUE ACONTECEU?</Text>
                  <TextInput
                    value={escolhaTexto}
                    onChangeText={setEscolhaTexto}
                    placeholder="Descreva a escolha ou decisão narrativa dos jogadores..."
                    placeholderTextColor={colors.placeholder}
                    multiline
                    style={[styles.input, styles.multiline, { minHeight: 100 }]}
                  />

                  <Pressable
                    onPress={registrarEscolhaImportante}
                    disabled={loading || !selectedCharacterId || !escolhaTexto.trim()}
                    style={[styles.modalExecute, (loading || !selectedCharacterId || !escolhaTexto.trim()) && styles.disabled]}
                  >
                    <Text style={styles.modalExecuteText}>
                      {loading ? "REGISTRANDO..." : "REGISTRAR ESCOLHA NO HISTÓRICO"}
                    </Text>
                  </Pressable></>)}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={tenguConfirmVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!loading) setTenguConfirmVisible(false);
        }}
      >
        <View style={styles.tenguConfirmBackdrop}>
          <View style={styles.tenguConfirmModal}>
            <View style={styles.tenguConfirmAccent} />
            <Text style={styles.tenguConfirmEyebrow}>
              VALTESIA RESEARCH // COMUNICAÇÕES
            </Text>
            <View style={styles.tenguConfirmSymbolFrame}>
              <Text style={styles.tenguConfirmSymbol}>!</Text>
            </View>
            <Text style={styles.tenguConfirmTitle}>NOTIFICAR TENGU</Text>
            <Text style={styles.tenguConfirmSubtitle}>
              GOLPE DE OPORTUNIDADE
            </Text>
            <View style={styles.tenguConfirmDivider} />
            <Text style={styles.tenguConfirmBody}>
              Enviar ao Tengu um aviso de que um inimigo próximo está com
              menos de 25% de vida?
            </Text>
            <Text style={styles.tenguConfirmFootnote}>
              A NOTIFICAÇÃO SERÁ EXIBIDA TEMPORARIAMENTE NO DISPOSITIVO DO JOGADOR.
            </Text>
            <View style={styles.tenguConfirmActions}>
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={() => setTenguConfirmVisible(false)}
                style={[styles.tenguConfirmCancel, loading && styles.disabled]}
              >
                <Text style={styles.tenguConfirmCancelText}>CANCELAR</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={loading}
                onPress={() => void notifyTengu()}
                style={[styles.tenguConfirmSend, loading && styles.disabled]}
              >
                <Text style={styles.tenguConfirmSendText}>
                  {loading ? "ENVIANDO..." : "CONFIRMAR"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.tenguConfirmSystem}>
              ANIQUILAÇÃO // CONTROLE DO MESTRE
            </Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={pendingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <ScrollView style={styles.pendingModal} contentContainerStyle={styles.pendingModalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalKicker}>EFEITO / LEMBRETE</Text>
            <Text style={styles.modalTitle}>NOVA PENDÊNCIA</Text>
            <Text style={styles.inputLabel}>PERSONAGEM ALVO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalPlayerList}>
              {activeCharacters.map((character) => (
                <Pressable
                  key={character.id}
                  onPress={() => setSelectedCharacterId(character.id)}
                  style={[styles.modalPlayer, selectedCharacterId === character.id && styles.modalPlayerSelected]}
                >
                  <Text style={styles.modalPlayerName}>{displayCharacter(character)}</Text>
                  <Text style={styles.modalPlayerRace}>{character.raca || character.id}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {activeCharacters.length === 0 && (
              <Text style={styles.emptyText}>NENHUM PERSONAGEM ATIVO</Text>
            )}

            <Text style={styles.inputLabel}>HABILIDADE / TÍTULO</Text>
            <TextInput
              value={pendingTitle}
              onChangeText={setPendingTitle}
              placeholder="Ex.: +3 Presença"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />

            <Text style={styles.inputLabel}>OBSERVAÇÃO</Text>
            <TextInput
              value={pendingObservation}
              onChangeText={setPendingObservation}
              placeholder="O que precisa ser revertido?"
              placeholderTextColor={colors.placeholder}
              multiline
              style={[styles.input, styles.multiline]}
            />

            <Text style={styles.inputLabel}>DURAÇÃO — SEGUNDOS</Text>
            <TextInput
              value={pendingDuration}
              onChangeText={setPendingDuration}
              placeholder="Ex.: 600"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>REMINDER</Text>
            <TextInput
              value={pendingReminder}
              onChangeText={setPendingReminder}
              placeholder="Ex.: voltar Presença ao valor original"
              placeholderTextColor={colors.placeholder}
              multiline
              style={[styles.input, styles.multiline]}
            />

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setPendingModalVisible(false)}
                style={styles.modalCancel}
              >
                <Text style={styles.modalCancelText}>CANCELAR</Text>
              </Pressable>

              <Pressable
                onPress={createPending}
                disabled={loading || !selectedCharacterId}
                style={[styles.modalConfirm, (!selectedCharacterId || loading) && styles.disabled]}
              >
                <Text style={styles.modalConfirmText}>CRIAR</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !loading && setResetModalVisible(false)}
      >
        <View style={styles.resetBackdrop}>
          <View style={styles.resetModal}>
            <View style={styles.resetTopLine} />
            <Text style={styles.resetEyebrow}>ANIQUILAÇÃO // PROTOCOLO 00</Text>
            <View style={styles.resetWarningMark}>
              <Text style={styles.resetWarningSymbol}>!</Text>
            </View>
            <Text style={styles.resetDialogTitle}>RESET TOTAL</Text>
            <Text style={styles.resetDialogSubtitle}>AÇÃO IRREVERSÍVEL</Text>
            <View style={styles.resetDivider} />
            <Text style={styles.resetBody}>
              Você está prestes a restaurar o sistema ao estado inicial.
            </Text>
            <View style={styles.resetList}>
              <Text style={styles.resetListItem}>— Personagens e inventários</Text>
              <Text style={styles.resetListItem}>— NPCs, acessos e anotações</Text>
              <Text style={styles.resetListItem}>— Pendências e estado da sessão</Text>
            </View>
            <Text style={styles.resetFootnote}>
              TODOS OS DADOS DE PROGRESSO SERÃO PERDIDOS.
            </Text>
            <View style={styles.resetButtons}>
              <Pressable
                disabled={loading}
                onPress={() => setResetModalVisible(false)}
                style={({ pressed }) => [styles.resetCancelButton, pressed && styles.resetPressed]}
              >
                <Text style={styles.resetCancelText}>ABORTAR</Text>
              </Pressable>
              <Pressable
                disabled={loading}
                onPress={executeReset}
                style={({ pressed }) => [styles.resetConfirmButton, pressed && styles.resetPressed, loading && styles.disabled]}
              >
                <Text style={styles.resetConfirmText}>
                  {loading ? "EXECUTANDO..." : "CONFIRMAR RESET"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.resetSystemLabel}>VALTESIA RESEARCH // SISTEMA DE CONTROLE</Text>
          </View>
        </View>
      </Modal>

      <Modal
        visible={singleResetVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !loading && setSingleResetVisible(false)}
      >
        <View style={styles.resetBackdrop}>
          <View style={styles.singleResetModal}>
            <View style={styles.singleResetAccent} />
            <Text style={styles.singleResetEyebrow}>VALTESIA RESEARCH // MANUTENÇÃO</Text>
            <Text style={styles.singleResetHeading}>RESET INDIVIDUAL</Text>
            <Text style={styles.singleResetDescription}>
              Selecione o personagem que deseja restaurar para testes.
              Os demais personagens e o estado global da sessão serão preservados.
            </Text>

            <ScrollView style={styles.singleResetScroll} nestedScrollEnabled>
              {Object.keys(characterDefaults).map((characterId) => {
                const character = characters.find((item) => item.id === characterId);
                const selected = characterId === singleResetId;
                return (
                  <Pressable
                    key={characterId}
                    disabled={loading}
                    onPress={() => setSingleResetId(characterId)}
                    style={[styles.singleResetChoice, selected && styles.singleResetChoiceSelected]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.singleResetName}>
                        {character ? displayCharacter(character) : characterLabels[characterId] || characterId}
                      </Text>
                      <Text style={styles.singleResetRace}>
                        {character?.raca || "RAÇA NÃO INFORMADA"}
                      </Text>
                      <Text style={styles.singleResetState}>
                        {character?.ativo ? "ATIVO" : "INATIVO"}
                      </Text>
                    </View>
                    <Text style={styles.singleResetIndicator}>{selected ? "●" : "○"}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.singleResetWarning}>
              ESTA OPERAÇÃO REMOVE O PROGRESSO DO PERSONAGEM SELECIONADO.
            </Text>
            <View style={styles.resetButtons}>
              <Pressable
                disabled={loading}
                onPress={() => setSingleResetVisible(false)}
                style={styles.resetCancelButton}
              >
                <Text style={styles.resetCancelText}>CANCELAR</Text>
              </Pressable>
              <Pressable
                disabled={loading || !singleResetId}
                onPress={resetOneCharacter}
                style={[
                  styles.resetConfirmButton,
                  (loading || !singleResetId) && styles.disabled,
                ]}
              >
                <Text style={styles.resetConfirmText}>
                  {loading ? "RESTAURANDO..." : "CONFIRMAR RESET"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

function SegmentButton({
  title,
  selected,
  onPress,
}: {
  title: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(baseStyles);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        selected && styles.segmentButtonSelected,
      ]}
    >
      <Text
        style={[
          styles.segmentButtonText,
          selected && styles.segmentButtonTextSelected,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function PendingCard({
  pending,
  onComplete,
  onDelete,
}: {
  pending: PendingData;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const styles = useThemedStyles(baseStyles);

  const [remaining, setRemaining] = useState(() =>
    pending.expiraEm
      ? Math.max(0, Math.ceil((pending.expiraEm - Date.now()) / 1000))
      : 0,
  );

  useEffect(() => {
    if (!pending.expiraEm || pending.concluida) {
      setRemaining(0);
      return;
    }

    const update = () => {
      setRemaining(
        Math.max(0, Math.ceil((pending.expiraEm! - Date.now()) / 1000)),
      );
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [pending.expiraEm, pending.concluida]);

  const expired =
    Boolean(pending.expiraEm) && remaining <= 0 && !pending.concluida;

  return (
    <View
      style={[
        styles.pendingCard,
        pending.concluida && styles.pendingCompleted,
        expired && styles.pendingExpired,
      ]}
    >
      <View style={styles.pendingHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.pendingCharacter}>
            {pending.characterName || pending.characterId}
          </Text>
          <Text style={styles.pendingTitle}>
            {pending.titulo || pending.habilidade || "PENDÊNCIA"}
          </Text>
        </View>

        {pending.expiraEm && !pending.concluida ? (
          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>
              {expired ? "EXPIROU" : "RESTANTE"}
            </Text>
            <Text style={styles.countdownValue}>
              {formatTime(remaining)}
            </Text>
          </View>
        ) : (
          <Text style={styles.manualBadge}>
            {pending.concluida ? "CONCLUÍDA" : "MANUAL"}
          </Text>
        )}
      </View>

      {pending.observacao ? (
        <Text style={styles.pendingObservation}>{pending.observacao}</Text>
      ) : null}

      {pending.lembrete ? (
        <View style={styles.reminder}>
          <Text style={styles.reminderLabel}>REMINDER</Text>
          <Text style={styles.reminderText}>{pending.lembrete}</Text>
        </View>
      ) : null}

      {!pending.concluida && (
        <View style={styles.pendingActions}>
          <Pressable onPress={onComplete} style={styles.completeButton}>
            <Text style={styles.completeText}>CONCLUIR</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={styles.deleteButton}>
            <Text style={styles.deleteText}>EXCLUIR</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const baseStyles = StyleSheet.create({
  gmBottomNav: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#402b2e",
    backgroundColor: "#090708",
    paddingTop: 6,
    paddingHorizontal: 4,
    minHeight: 64,
    elevation: 12,
  },
  gmBottomItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 2,
    gap: 6,
  },
  gmBottomLabel: {
    color: "#a99b9d",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  eventMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 17,
    minHeight: 76,
    borderWidth: 1,
    borderColor: "#302526",
    backgroundColor: "#100c0d",
    marginBottom: 9,
    gap: 13,
  },
  eventMenuIcon: {
    width: 35,
    height: 35,
    borderWidth: 1,
    borderColor: "#593238",
    alignItems: "center",
    justifyContent: "center",
  },
  eventMenuTitle: {
    fontSize: 12,
    letterSpacing: 1.35,
    fontWeight: "700",
    color: "#e2d9d9",
  },
  eventMenuSubtitle: {
    fontSize: 9,
    lineHeight: 14,
    marginTop: 6,
    color: "#8a7a7b",
  },
  eventBackButton: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    marginRight: 3,
  },
  monitorToggle: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#292425",
    backgroundColor: "#0b090a",
    padding: 14,
    marginBottom: 12,
  },
  monitorSummary: {
    color: "#84797a",
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 6,
  },
  tenguQuickAction: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    gap: 12,
    borderColor: "#61373b",
    borderWidth: 1,
    backgroundColor: "#1a0e10",
    marginVertical: 10,
  },
  tenguQuickTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: "#f0dddd",
  },
  tenguQuickSubtitle: {
    fontSize: 8,
    lineHeight: 13,
    color: "#bb898e",
    marginTop: 5,
  },
  npcCardPreviewPanel: {
    borderWidth: 1,
    borderColor: "#3d3032",
    marginTop: 12,
    padding: 9,
  },
  npcCardPreviewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingVertical: 7,
    paddingHorizontal: 3,
  },
  npcCardPreviewTitle: {
    color: "#d2bbbd",
    fontSize: 10,
    flex: 1,
    letterSpacing: 0.8,
  },
  npcCardImage: {
    width: "100%",
    height: 395,
    alignSelf: "center",
    marginTop: 8,
  },
  npcUnlockActions: { marginTop: 14 },
  npcUnlockHint: {
    fontSize: 9,
    lineHeight: 16,
    color: "#927f81",
    marginBottom: 11,
  },
  npcAllButton: {
    borderWidth: 1,
    borderColor: "#6c4548",
    padding: 14,
    backgroundColor: "#200f12",
    alignItems: "center",
  },
  npcAllButtonText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#e3c8cb",
    letterSpacing: 1,
    textAlign: "center",
  },
  pendingModalContent: { paddingBottom: 22 },
  operationFeedback: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#694146",
    backgroundColor: "#241518",
    color: "#e3ccce",
    fontSize: 10,
    lineHeight: 17,
    letterSpacing: 0.3,
    marginBottom: 8,
  },

  npcUnlockPanel: {
    borderWidth: 1,
    borderColor: "#563030",
    backgroundColor: "#100b0b",
    padding: 14,
    marginBottom: 18,
  },
  npcUnlockEyebrow: {
    color: "#b76f73",
    fontSize: 9,
    letterSpacing: 1.35,
    marginBottom: 8,
  },
  npcUnlockHelp: {
    color: "#ae9b9b",
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 11,
  },
  npcUnlockSearch: {
    borderWidth: 1,
    borderColor: "#514044",
    backgroundColor: "#0b0909",
    color: "#f2e8e8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
    marginBottom: 10,
  },
  npcUnlockScroll: {
    maxHeight: 225,
  },
  npcUnlockList: {
    gap: 5,
    paddingBottom: 6,
  },
  npcUnlockChoice: {
    borderWidth: 1,
    borderColor: "#3b3030",
    backgroundColor: "#151010",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  npcUnlockChoiceSelected: {
    borderColor: "#c15c61",
    backgroundColor: "#2c1418",
  },
  npcUnlockName: {
    color: "#f2eaea",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  npcUnlockAvailability: {
    color: "#987f7f",
    fontSize: 9,
    letterSpacing: 0.4,
    marginTop: 4,
  },
  npcUnlockMark: {
    color: "#d67b7e",
    fontSize: 19,
    marginLeft: 8,
  },
  npcUnlockRecipientCount: {
    color: "#af8c8e",
    fontSize: 9,
    marginVertical: 12,
    letterSpacing: 0.7,
  },
  npcUnlockConfirmPanel: {
    borderWidth: 1,
    borderColor: "#734141",
    backgroundColor: "#1c0f11",
    padding: 12,
  },
  npcUnlockConfirmTitle: {
    color: "#f0dada",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  npcUnlockActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  npcUnlockCancel: {
    borderWidth: 1,
    borderColor: "#6a5959",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 12,
    flex: 1,
  },
  npcUnlockCancelText: {
    color: "#d6bdbd",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  npcUnlockExecute: {
    borderWidth: 1,
    borderColor: "#94464c",
    backgroundColor: "#60272d",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    flex: 1,
  },
  npcUnlockExecuteText: {
    color: "#f9e7e7",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },
  destructionPanel: {
    padding: 15,
    borderWidth: 1,
    borderColor: "#743939",
    backgroundColor: "#100909",
    marginBottom: 10,
  },
  destructionPanelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  destructionEyebrow: {
    color: "#956363",
    fontSize: 8,
    letterSpacing: 1.0,
    flexShrink: 1,
  },
  destructionStatus: {
    color: "#c98a8a",
    fontSize: 8,
    letterSpacing: 1,
  },
  destructionTime: {
    color: "#eee1e1",
    fontSize: 34,
    fontWeight: "300",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
    letterSpacing: 3,
    marginTop: 19,
    marginBottom: 10,
  },
  destructionDescription: {
    color: "#907f7f",
    fontSize: 10,
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 15,
  },
  destructionActionButton: {
    minHeight: 43,
    backgroundColor: "#4a1c1c",
    borderWidth: 1,
    borderColor: "#9c4343",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  destructionActionText: {
    color: "#e8d9d9",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    textAlign: "center",
  },
  destructionConfirmBox: {
    padding: 13,
    borderWidth: 1,
    borderColor: "#5d3434",
    backgroundColor: "#190e0e",
  },
  destructionConfirmTitle: {
    color: "#f1dcdc",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
  },
  destructionConfirmText: {
    color: "#ae9999",
    fontSize: 10,
    lineHeight: 17,
    marginVertical: 12,
    textAlign: "center",
  },
  destructionConfirmActions: {
    flexDirection: "row",
    gap: 9,
  },
  destructionCancel: {
    flex: 1,
    minHeight: 43,
    borderWidth: 1,
    borderColor: "#4b3b3b",
    justifyContent: "center",
    alignItems: "center",
  },
  destructionCancelText: {
    color: "#b3a0a0",
    fontSize: 9,
    letterSpacing: 1,
  },
  destructionConfirmButton: {
    flex: 1,
    minHeight: 43,
    borderWidth: 1,
    borderColor: "#a74d4d",
    backgroundColor: "#5a2323",
    justifyContent: "center",
    alignItems: "center",
  },
  destructionConfirmButtonText: {
    color: "#f1e4e4",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  tenguConfirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  tenguConfirmModal: {
    width: "100%",
    maxWidth: 430,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: "#542c2c",
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 18,
    overflow: "hidden",
  },
  tenguConfirmAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#a03e3e",
  },
  tenguConfirmEyebrow: {
    color: "#824343",
    fontSize: 8,
    letterSpacing: 1.6,
    textAlign: "center",
  },
  tenguConfirmSymbolFrame: {
    width: 43,
    height: 43,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#854343",
    marginTop: 20,
    marginBottom: 15,
    transform: [{ rotate: "45deg" }],
  },
  tenguConfirmSymbol: {
    color: "#c65d5d",
    fontSize: 24,
    fontWeight: "300",
    transform: [{ rotate: "-45deg" }],
  },
  tenguConfirmTitle: {
    color: "#ece3e3",
    fontSize: 21,
    fontWeight: "400",
    letterSpacing: 2.6,
    textAlign: "center",
  },
  tenguConfirmSubtitle: {
    color: "#9d5151",
    fontSize: 9,
    letterSpacing: 1.6,
    textAlign: "center",
    marginTop: 9,
  },
  tenguConfirmDivider: {
    height: 1,
    backgroundColor: "#332626",
    marginVertical: 20,
  },
  tenguConfirmBody: {
    color: "#bab2b2",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },
  tenguConfirmFootnote: {
    color: "#766666",
    fontSize: 8,
    lineHeight: 14,
    letterSpacing: 0.8,
    textAlign: "center",
    marginTop: 16,
  },
  tenguConfirmActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 24,
  },
  tenguConfirmCancel: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#383131",
    alignItems: "center",
    justifyContent: "center",
  },
  tenguConfirmCancelText: {
    color: "#928787",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  tenguConfirmSend: {
    flex: 1.15,
    minHeight: 46,
    backgroundColor: "#4a1c1c",
    borderWidth: 1,
    borderColor: "#a04848",
    alignItems: "center",
    justifyContent: "center",
  },
  tenguConfirmSendText: {
    color: "#f2e4e4",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "600",
  },
  tenguConfirmSystem: {
    color: "#4f3b3b",
    fontSize: 7,
    letterSpacing: 1.2,
    textAlign: "center",
    marginTop: 21,
  },
  tenguNotifyButton: {
    borderWidth: 1,
    borderColor: "#4b2c2c",
    backgroundColor: "#100a0a",
    paddingHorizontal: 13,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  tenguNotifyTitle: {
    color: "#e6d7d7",
    fontSize: 11,
    letterSpacing: 1.4,
  },
  tenguNotifyDescription: {
    color: "#977e7e",
    fontSize: 9,
    marginTop: 6,
    lineHeight: 15,
  },
  tenguNotifyArrow: {
    color: "#b47e7e",
    fontSize: 26,
    marginLeft: 10,
  },
  resetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  resetModal: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: "#4a2020",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 17,
    overflow: "hidden",
  },
  resetTopLine: {
    height: 2,
    backgroundColor: "#9e2929",
    marginTop: -22,
    marginHorizontal: -22,
    marginBottom: 21,
  },
  resetEyebrow: {
    color: "#8e3939",
    fontSize: 9,
    letterSpacing: 2,
    textAlign: "center",
  },
  resetWarningMark: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderColor: "#873232",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 19,
    marginBottom: 13,
    transform: [{ rotate: "45deg" }],
  },
  resetWarningSymbol: {
    color: "#c64a4a",
    fontSize: 25,
    fontWeight: "300",
    transform: [{ rotate: "-45deg" }],
  },
  resetDialogTitle: {
    color: "#e7e2df",
    fontSize: 25,
    fontWeight: "300",
    letterSpacing: 4,
    textAlign: "center",
  },
  resetDialogSubtitle: {
    color: "#a33a3a",
    fontSize: 9,
    letterSpacing: 2.2,
    textAlign: "center",
    marginTop: 7,
  },
  resetDivider: {
    height: 1,
    backgroundColor: "#292020",
    marginVertical: 19,
  },
  resetBody: {
    color: "#b4b0ad",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
  },
  resetList: {
    backgroundColor: "#0d0b0b",
    borderLeftWidth: 2,
    borderLeftColor: "#642828",
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginTop: 16,
    gap: 8,
  },
  resetListItem: {
    color: "#88817e",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  resetFootnote: {
    color: "#b04444",
    fontSize: 8,
    letterSpacing: 1.1,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 17,
  },
  resetButtons: {
    flexDirection: "row",
    gap: 9,
    marginTop: 19,
  },
  resetCancelButton: {
    flex: 0.8,
    minHeight: 45,
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  resetCancelText: {
    color: "#888",
    fontSize: 9,
    letterSpacing: 1.5,
  },
  resetConfirmButton: {
    flex: 1.2,
    minHeight: 45,
    backgroundColor: "#581e1e",
    borderWidth: 1,
    borderColor: "#a23b3b",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  resetConfirmText: {
    color: "#f1e7e4",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 1.1,
  },
  resetPressed: {
    opacity: 0.65,
  },
  resetSystemLabel: {
    color: "#393232",
    fontSize: 7,
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 18,
  },

  attackPanel: {
    borderWidth: 1,
    borderColor: "#563036",
    backgroundColor: "#0d090a",
    padding: 14,
    gap: 10,
  },
  attackEyebrow: {
    color: "#b36b73",
    fontSize: 9,
    letterSpacing: 1.3,
  },
  attackDescription: {
    color: "#948184",
    fontSize: 9,
    lineHeight: 16,
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  attackButton: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: "#3f2a2e",
    backgroundColor: "#151011",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  attackButtonActive: {
    backgroundColor: "#36171c",
    borderColor: "#a45660",
  },
  attackIconFrame: {
    width: 45,
    height: 45,
    borderWidth: 1,
    borderColor: "#76434b",
    justifyContent: "center",
    alignItems: "center",
  },
  attackTitle: {
    color: "#f0e0e1",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  attackSubtitle: {
    color: "#ad848a",
    marginTop: 6,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  attackStopButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#644147",
    backgroundColor: "#261518",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 7,
  },
  attackStopText: {
    color: "#dcc5c5",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  attackFootnote: {
    color: "#88767a",
    fontSize: 8,
    lineHeight: 14,
    marginTop: 4,
    letterSpacing: 0.5,
  },

  customTimerPanel: {
    borderWidth: 1, borderColor: "#537783", backgroundColor: "#0c151c",
    padding: 16, gap: 12, marginBottom: 10,
  },
  customTimerEyebrow: { color: "#83aeb9", fontSize: 9, letterSpacing: 1.4 },
  customTimerStatusRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  customTimerStatus: { color: "#b9dce3", fontSize: 10, letterSpacing: 1.5 },
  customTimerNameInput: {
    borderWidth: 1, borderColor: "#4a7281", backgroundColor: "#111e29",
    color: "#effbff", fontSize: 12, paddingHorizontal: 12, paddingVertical: 13,
  },
  customTimerFields: { flexDirection: "row", gap: 9 },
  customTimerField: { flex: 1, gap: 8 },
  customTimerFieldLabel: { color: "#84aab8", fontSize: 9, letterSpacing: 1.1, textAlign: "center" },
  customTimerInput: {
    borderWidth: 1, borderColor: "#4a7281", color: "#e7f8fb",
    backgroundColor: "#12212b", textAlign: "center", fontSize: 24,
    paddingVertical: 10, fontVariant: ["tabular-nums"],
  },
  customTimerHint: { color: "#8bafba", fontSize: 9, lineHeight: 16, letterSpacing: 0.45 },
  customTimerStartButton: {
    borderWidth: 1, borderColor: "#81bfcc", backgroundColor: "#204452",
    paddingVertical: 15, alignItems: "center", marginTop: 5,
  },
  customTimerStartText: { color: "#e2f8fc", fontSize: 10, letterSpacing: 1.3, fontWeight: "700" },
  customTimerActiveName: { color: "#e3f7fa", fontSize: 15, letterSpacing: 1.5, textAlign: "center" },
  customTimerClock: {
    color: "#e7fbff", fontSize: 34, fontVariant: ["tabular-nums"],
    textAlign: "center", letterSpacing: 2,
  },
  customTimerConfirm: { borderWidth: 1, borderColor: "#4d7180", padding: 12, gap: 12 },
  customTimerStopButton: {
    borderWidth: 1, borderColor: "#6b8690", paddingVertical: 14,
    alignItems: "center", marginTop: 5,
  },
  customTimerStopText: { color: "#c5dee5", fontSize: 10, letterSpacing: 1.2 },
  radioPanel: {
    borderWidth: 1, borderColor: "#352525", backgroundColor: "#090707", padding: 14,
  },
  radioEyebrow: { color: "#884545", fontSize: 8, letterSpacing: 1.25, marginBottom: 13 },
  radioStatusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 17 },
  radioLed: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#403434" },
  radioLedLive: { backgroundColor: "#bb4545" },
  radioStatusText: { color: "#bdaaaa", fontSize: 9, letterSpacing: 0.8, flexShrink: 1 },
  radioHelp: { color: "#625454", fontSize: 8, letterSpacing: 1.2, marginBottom: 9 },
  radioCategory: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#34272a", paddingTop: 15 },
  radioCategoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  radioCategoryTitle: { color: "#e0caca", fontSize: 11, fontWeight: "700", letterSpacing: 1.4, flexShrink: 1 },
  radioCategoryCount: { color: "#8f656a", fontSize: 10, letterSpacing: 1, marginLeft: 8 },
  radioCategorySubtitle: { color: "#766467", fontSize: 8, lineHeight: 13, letterSpacing: 0.55, marginBottom: 11 },
  radioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radioTrack: {
    width: "48%", flexGrow: 1, minHeight: 48, borderWidth: 1, borderColor: "#302626",
    paddingHorizontal: 11, flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#0c0a0a",
  },
  radioTrackSelected: { borderColor: "#a34b4b", backgroundColor: "#261010" },
  radioTrackText: { color: "#a79b9b", fontSize: 10, letterSpacing: 0.6, flexShrink: 1, marginRight: 5 },
  radioTrackTextSelected: { color: "#f0dbdb" },
  radioTrackMark: { color: "#b56464", fontSize: 12 },
  radioSelected: { color: "#937474", fontSize: 8, letterSpacing: 1, marginTop: 15 },
  radioFootnote: { color: "#5e5050", fontSize: 8, letterSpacing: 0.6, lineHeight: 14, marginTop: 13 },

  singleResetButton: {
    borderWidth: 1,
    borderColor: "#393939",
    backgroundColor: "#0d0d0d",
    padding: 14,
    marginTop: 9,
  },
  singleResetTitle: {
    color: "#c5c5c5",
    fontSize: 10,
    letterSpacing: 1.4,
    textAlign: "center",
  },
  singleResetSubtitle: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 0.6,
    textAlign: "center",
    marginTop: 7,
  },
  singleResetModal: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#090909",
    borderWidth: 1,
    borderColor: "#3b3030",
    padding: 20,
    maxHeight: "85%",
  },
  singleResetAccent: {
    height: 2,
    backgroundColor: "#8e3535",
    marginTop: -20,
    marginHorizontal: -20,
    marginBottom: 20,
  },
  singleResetEyebrow: {
    color: "#8b4949",
    fontSize: 8,
    letterSpacing: 1.5,
    textAlign: "center",
  },
  singleResetHeading: {
    color: "#e6e6e6",
    fontSize: 20,
    letterSpacing: 2.5,
    textAlign: "center",
    marginTop: 12,
  },
  singleResetDescription: {
    color: "#999",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginVertical: 16,
  },
  singleResetScroll: {
    flexGrow: 0,
  },
  singleResetChoice: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: "#272727",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 7,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
  },
  singleResetChoiceSelected: {
    borderColor: "#a04b4b",
    backgroundColor: "#201111",
  },
  singleResetName: {
    color: "#e0e0e0",
    fontSize: 11,
    letterSpacing: 1,
  },
  singleResetRace: {
    color: "#a18e8e",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  singleResetState: {
    color: "#777",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 5,
  },
  singleResetIndicator: {
    color: "#b75c5c",
    fontSize: 16,
  },
  singleResetWarning: {
    color: "#ae6060",
    fontSize: 8,
    letterSpacing: 1,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 13,
  },

  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  content: {
    paddingTop: 38,
    paddingHorizontal: 18,
    paddingBottom: 32,
  },

  header: {
    marginBottom: 20,
  },

  eyebrow: {
    color: "#444",
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 7,
  },

  title: {
    color: "#eee",
    fontSize: 29,
    fontWeight: "300",
    letterSpacing: 4,
  },

  sessionCard: {
    borderWidth: 1,
    borderColor: "#252525",
    backgroundColor: "#090909",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  sessionCardLocked: {
    borderColor: "#5b3030",
  },

  sessionMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },

  sessionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
  },

  sessionDotOpen: {
    backgroundColor: "#788577",
  },

  sessionDotLocked: {
    backgroundColor: "#a14e4e",
  },

  sessionTitle: {
    color: "#ddd",
    fontSize: 12,
    letterSpacing: 1.4,
  },

  sessionSubtitle: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },

  sessionButton: {
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  sessionButtonText: {
    color: "#aaa",
    fontSize: 9,
    letterSpacing: 1.2,
  },

  section: {
    marginBottom: 27,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 11,
  },

  kicker: {
    color: "#4d4d4d",
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 5,
  },

  sectionTitle: {
    color: "#e4e4e4",
    fontSize: 17,
    letterSpacing: 2,
  },

  counter: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.2,
  },

  emptyBox: {
    borderWidth: 1,
    borderColor: "#181818",
    padding: 17,
  },

  emptyText: {
    color: "#444",
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.3,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: "#282828",
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 9,
  },

  secondaryButtonText: {
    color: "#888",
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  disabled: {
    opacity: 0.35,
  },

  playerList: {
    gap: 8,
  },

  playerCard: {
    width: 145,
    minHeight: 70,
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#080808",
    padding: 11,
    justifyContent: "center",
  },

  playerCardSelected: {
    borderColor: "#777",
    backgroundColor: "#101010",
  },

  playerDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#333",
  },

  playerDotSelected: {
    backgroundColor: "#bbb",
  },

  playerName: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 1.2,
  },

  playerRace: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 5,
  },

  targetBar: {
    borderLeftWidth: 2,
    borderLeftColor: "#666",
    marginTop: 10,
    paddingLeft: 9,
  },

  targetLabel: {
    color: "#444",
    fontSize: 8,
    letterSpacing: 1.5,
  },

  targetValue: {
    color: "#bbb",
    fontSize: 9,
    letterSpacing: 1.1,
    marginTop: 3,
  },

  actionCard: {
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#080808",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  actionCardMain: {
    flex: 1,
  },

  actionCardTitle: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 1.4,
  },

  actionCardSubtitle: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 5,
  },

  actionArrow: {
    color: "#777",
    fontSize: 22,
    fontWeight: "200",
    marginLeft: 10,
  },

  monitorCard: {
    borderWidth: 1,
    borderColor: "#202020",
    backgroundColor: "#080808",
    padding: 12,
    marginBottom: 8,
  },

  monitorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    marginBottom: 2,
  },

  monitorName: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 1.2,
  },

  monitorSub: {
    color: "#555",
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.8,
  },

  activeBadge: {
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  activeBadgeText: {
    color: "#777",
    fontSize: 8,
    letterSpacing: 1.2,
  },

  effectRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
    paddingVertical: 9,
  },

  effectMain: {
    flex: 1,
    paddingRight: 8,
  },

  effectTitle: {
    color: "#bbb",
    fontSize: 8,
    letterSpacing: 1,
  },

  effectSub: {
    color: "#4b4b4b",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 3,
  },

  smallButton: {
    borderWidth: 1,
    borderColor: "#292929",
    paddingVertical: 7,
    paddingHorizontal: 7,
  },

  smallButtonText: {
    color: "#777",
    fontSize: 8,
    letterSpacing: 0.8,
  },

  manualBlock: {
    borderLeftWidth: 1,
    borderLeftColor: "#333",
    paddingLeft: 8,
    marginTop: 9,
  },

  manualLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 3,
  },

  manualText: {
    color: "#888",
    fontSize: 8,
    lineHeight: 13,
  },

  mutedText: {
    color: "#444",
    fontSize: 8,
    lineHeight: 14,
  },

  pendingCard: {
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#080808",
    padding: 12,
    marginBottom: 8,
  },

  pendingCompleted: {
    opacity: 0.42,
  },

  pendingExpired: {
    borderColor: "#603a3a",
  },

  pendingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  pendingCharacter: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  pendingTitle: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1,
  },

  countdown: {
    alignItems: "flex-end",
  },

  countdownLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  countdownValue: {
    color: "#ccc",
    fontSize: 13,
    letterSpacing: 1.2,
    marginTop: 2,
  },

  manualBadge: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  pendingObservation: {
    color: "#777",
    fontSize: 8,
    lineHeight: 14,
    marginTop: 9,
  },

  reminder: {
    borderLeftWidth: 2,
    borderLeftColor: "#555",
    paddingLeft: 8,
    marginTop: 9,
  },

  reminderLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.4,
    marginBottom: 3,
  },

  reminderText: {
    color: "#aaa",
    fontSize: 8,
    lineHeight: 14,
  },

  pendingActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
  },

  completeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#303030",
    alignItems: "center",
    paddingVertical: 8,
  },

  completeText: {
    color: "#888",
    fontSize: 8,
    letterSpacing: 1.1,
  },

  deleteButton: {
    borderWidth: 1,
    borderColor: "#382323",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 13,
  },

  deleteText: {
    color: "#744",
    fontSize: 8,
    letterSpacing: 1.1,
  },

  debugGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#1a1a1a",
  },

  debugCell: {
    width: "50%",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#1a1a1a",
    padding: 12,
  },

  debugValue: {
    color: "#ccc",
    fontSize: 17,
  },

  debugLabel: {
    color: "#4d4d4d",
    fontSize: 8,
    letterSpacing: 1.3,
    marginTop: 4,
  },

  dangerSection: {
    borderTopWidth: 1,
    borderTopColor: "#202020",
    paddingTop: 20,
    marginTop: 5,
  },

  resetButton: {
    borderWidth: 1,
    borderColor: "#552727",
    backgroundColor: "#0b0606",
    padding: 14,
    marginTop: 9,
  },

  resetTitle: {
    color: "#a45a5a",
    fontSize: 8,
    letterSpacing: 1.4,
    textAlign: "center",
  },

  resetSubtitle: {
    color: "#4d3333",
    fontSize: 8,
    letterSpacing: 0.7,
    textAlign: "center",
    marginTop: 6,
  },

  exitButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 68,
    borderWidth: 1,
    borderColor: "#514445",
    backgroundColor: "#111011",
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginTop: 18,
  },

  exitText: {
    color: "#e5dddd",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  exitSubtitle: {
    color: "#817577",
    fontSize: 8,
    letterSpacing: 0.7,
    marginTop: 7,
    textAlign: "center",
  },

  bigActionGrid: {
    gap: 10,
    marginTop: 12,
  },

  bigActionButton: {
    minHeight: 92,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    backgroundColor: "#090909",
    paddingHorizontal: 16,
    paddingVertical: 15,
    justifyContent: "center",
  },

  bigActionTitle: {
    color: "#e2e2e2",
    fontSize: 15,
    letterSpacing: 2,
  },

  bigActionSubtitle: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 1.1,
    marginTop: 6,
  },

  bigActionArrow: {
    position: "absolute",
    right: 15,
    top: 28,
    color: "#666",
    fontSize: 30,
    fontWeight: "200",
  },

  operationModal: {
    maxHeight: "92%",
    flexShrink: 1,
    borderTopWidth: 1,
    borderColor: "#333",
    backgroundColor: "#080808",
  },

  modalPlayerList: {
    gap: 8,
    paddingBottom: 3,
  },

  modalPlayer: {
    minWidth: 125,
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#090909",
    padding: 12,
  },

  modalPlayerSelected: {
    borderColor: "#777",
    backgroundColor: "#111",
  },

  modalPlayerName: {
    color: "#ddd",
    fontSize: 11,
    letterSpacing: 1.1,
  },

  modalPlayerRace: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 5,
  },

  modalTarget: {
    borderLeftWidth: 2,
    borderLeftColor: "#777",
    paddingLeft: 9,
    marginTop: 10,
  },

  modalTargetLabel: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1.4,
  },

  modalTargetValue: {
    color: "#ddd",
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 3,
  },

  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },

  segmentColumn: {
    gap: 7,
  },

  segmentButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#252525",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  segmentButtonSelected: {
    borderColor: "#777",
    backgroundColor: "#141414",
  },

  segmentButtonText: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 1.1,
  },

  segmentButtonTextSelected: {
    color: "#ddd",
  },

  selectionRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: "#181818",
    paddingVertical: 10,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  selectionRowSelected: {
    backgroundColor: "#101010",
    borderLeftWidth: 2,
    borderLeftColor: "#777",
  },

  selectionTitle: {
    color: "#ddd",
    fontSize: 10,
    letterSpacing: 0.9,
  },

  selectionSub: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 5,
  },

  selectionMark: {
    color: "#aaa",
    fontSize: 16,
    marginLeft: 10,
  },

  largeChoice: {
    borderWidth: 1,
    borderColor: "#252525",
    padding: 13,
  },

  largeChoiceSelected: {
    borderColor: "#777",
    backgroundColor: "#111",
  },

  largeChoiceTitle: {
    color: "#ddd",
    fontSize: 11,
    letterSpacing: 1.2,
  },

  largeChoiceSub: {
    color: "#666",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  modalExecute: {
    borderWidth: 1,
    borderColor: "#555",
    backgroundColor: "#151515",
    paddingVertical: 15,
    marginTop: 18,
  },

  modalExecuteText: {
    color: "#eee",
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
  },

  eventChoiceSelected: {
    borderWidth: 1,
    borderColor: "#777",
    backgroundColor: "#111",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  eventChoiceMark: {
    color: "#aaa",
    fontSize: 15,
    marginLeft: 10,
  },

  alertPanel: {
    borderWidth: 1,
    borderColor: "#252525",
    backgroundColor: "#090909",
    padding: 13,
  },

  alertPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  alertPanelLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.4,
  },

  alertPanelStatus: {
    color: "#ccc",
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 4,
  },

  alertPanelPercent: {
    color: "#ddd",
    fontSize: 20,
    letterSpacing: 1,
  },

  alertTrack: {
    height: 12,
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#050505",
    overflow: "hidden",
  },

  alertFill: {
    height: "100%",
    backgroundColor: "#777",
  },

  alertControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },

  alertControlButton: {
    width: 70,
    height: 54,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },

  alertControlSymbol: {
    color: "#ddd",
    fontSize: 22,
    lineHeight: 24,
  },

  alertControlLabel: {
    color: "#555",
    fontSize: 7,
    letterSpacing: 1,
  },

  alertValueBox: {
    flex: 1,
    height: 54,
    borderWidth: 1,
    borderColor: "#1d1d1d",
    alignItems: "center",
    justifyContent: "center",
  },

  alertValue: {
    color: "#bbb",
    fontSize: 18,
    letterSpacing: 1.4,
  },

  alertActionRow: {
    flexDirection: "row",
    gap: 8,
  },

  eventCharacterStatus: {
    color: "#777",
    fontSize: 7,
    letterSpacing: 0.8,
    marginTop: 8,
  },

  eventWarning: {
    borderLeftWidth: 2,
    borderLeftColor: "#555",
    backgroundColor: "#0a0a0a",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 16,
  },

  eventWarningText: {
    color: "#666",
    fontSize: 8,
    lineHeight: 14,
    letterSpacing: 0.5,
  },

  placeholderPanel: {
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "#090909",
    padding: 18,
  },

  placeholderTitle: {
    color: "#ddd",
    fontSize: 14,
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  placeholderText: {
    color: "#777",
    fontSize: 10,
    lineHeight: 17,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.86)",
    justifyContent: "flex-end",
  },

  releaseModal: {
    maxHeight: "92%",
    borderTopWidth: 1,
    borderColor: "#333",
    backgroundColor: "#080808",
  },

  pendingModal: {
    margin: 18,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#090909",
    padding: 17,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },

  modalKicker: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.8,
    marginBottom: 4,
  },

  modalTitle: {
    color: "#ddd",
    fontSize: 14,
    letterSpacing: 1.8,
  },

  closeButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: "#777",
    fontSize: 24,
    fontWeight: "200",
  },

  modalTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
  },

  modalTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
  },

  modalTabSelected: {
    borderBottomWidth: 2,
    borderBottomColor: "#777",
  },

  modalTabText: {
    color: "#4b4b4b",
    fontSize: 9,
    letterSpacing: 1.2,
  },

  modalTabTextSelected: {
    color: "#ddd",
  },

  modalContent: {
    padding: 16,
    paddingBottom: 35,
  },

  modalSectionTitle: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 1.7,
    marginTop: 14,
    marginBottom: 8,
  },

  modalCurrentState: {
    borderWidth: 1,
    borderColor: "#202020",
    padding: 11,
  },

  currentStateLabel: {
    color: "#444",
    fontSize: 8,
    letterSpacing: 1.2,
    marginBottom: 9,
  },

  currentTierRow: {
    flexDirection: "row",
    gap: 7,
  },

  currentTier: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#1b1b1b",
    padding: 8,
  },

  currentTierLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  currentTierValue: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  currentTierEnabled: {
    color: "#bbb",
  },

  modalActionRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 9,
  },

  modalPrimaryButton: {
    borderWidth: 1,
    borderColor: "#454545",
    backgroundColor: "#111",
    paddingVertical: 12,
    paddingHorizontal: 10,
    flex: 1,
    marginTop: 8,
  },

  modalPrimaryText: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  modalDangerButton: {
    borderWidth: 1,
    borderColor: "#4a2929",
    backgroundColor: "#0c0606",
    paddingVertical: 12,
    paddingHorizontal: 10,
    flex: 1,
    marginTop: 8,
  },

  modalDangerText: {
    color: "#9b5b5b",
    fontSize: 9,
    letterSpacing: 1.2,
    textAlign: "center",
  },

  tierControl: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    paddingVertical: 11,
  },

  tierControlTitle: {
    color: "#ccc",
    fontSize: 9,
    letterSpacing: 1,
  },

  tierControlSub: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  tierToggle: {
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 8,
    paddingHorizontal: 9,
  },

  tierToggleEnabled: {
    borderColor: "#5b3535",
  },

  tierToggleText: {
    color: "#888",
    fontSize: 8,
    letterSpacing: 1,
  },

  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    paddingVertical: 9,
  },

  cardInfoName: {
    color: "#aaa",
    fontSize: 8,
  },

  cardInfoTier: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
  },

  modalSecondaryWide: {
    borderWidth: 1,
    borderColor: "#292929",
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginTop: 8,
  },

  modalSecondaryText: {
    color: "#888",
    fontSize: 9,
    letterSpacing: 1.1,
    textAlign: "center",
  },

  npcRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#171717",
    paddingVertical: 11,
    paddingHorizontal: 8,
  },

  npcRowSelected: {
    backgroundColor: "#101010",
    borderLeftWidth: 2,
    borderLeftColor: "#777",
  },

  npcRealName: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1,
  },

  npcMeta: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 4,
  },

  npcSelect: {
    color: "#777",
    fontSize: 14,
    marginLeft: 8,
  },

  npcEditor: {
    borderWidth: 1,
    borderColor: "#282828",
    backgroundColor: "#0a0a0a",
    padding: 12,
    marginTop: 12,
  },

  npcEditorName: {
    color: "#eee",
    fontSize: 12,
    letterSpacing: 1.2,
  },

  npcEditorMeta: {
    color: "#666",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 5,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  checkboxChecked: {
    backgroundColor: "#222",
    borderColor: "#777",
  },

  checkMark: {
    color: "#ddd",
    fontSize: 11,
  },

  checkLabel: {
    color: "#aaa",
    fontSize: 8,
    letterSpacing: 1,
  },

  inputLabel: {
    color: "#555",
    fontSize: 8,
    letterSpacing: 1.3,
    marginTop: 9,
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: "#252525",
    backgroundColor: "#050505",
    color: "#ddd",
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  multiline: {
    minHeight: 58,
    textAlignVertical: "top",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 17,
  },

  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#252525",
    paddingVertical: 12,
    alignItems: "center",
  },

  modalCancelText: {
    color: "#666",
    fontSize: 9,
    letterSpacing: 1.2,
  },

  modalConfirm: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#555",
    backgroundColor: "#151515",
    paddingVertical: 12,
    alignItems: "center",
  },

  modalConfirmText: {
    color: "#ddd",
    fontSize: 9,
    letterSpacing: 1.2,
  },
  galleryMasterList: {
    borderWidth: 1,
    borderColor: "#292222",
    backgroundColor: "#080707",
  },
  galleryMasterPhoto: {
    flexDirection: "row",
    alignItems: "center",
    padding: 9,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#292222",
  },
  galleryMasterPhotoSelected: {
    backgroundColor: "#231212",
    borderLeftWidth: 2,
    borderLeftColor: "#a75454",
  },
  galleryMasterThumb: {
    width: 68,
    height: 72,
    backgroundColor: "#151111",
  },
  documentsSection: {
    gap: 0,
  },
  documentsStep: {
    color: "#895858",
    fontSize: 9,
    letterSpacing: 1.7,
    marginTop: 18,
    marginBottom: 10,
  },
  documentsSearch: {
    minHeight: 48,
    color: "#e6e0de",
    backgroundColor: "#100d0d",
    borderWidth: 1,
    borderColor: "#483030",
    paddingHorizontal: 13,
    fontSize: 12,
  },
  documentsCategories: {
    gap: 7,
    paddingTop: 11,
    paddingBottom: 9,
  },
  documentsCategoryButton: {
    borderWidth: 1,
    borderColor: "#292222",
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#0c0a0a",
  },
  documentsCategoryButtonSelected: {
    borderColor: "#894646",
    backgroundColor: "#241313",
  },
  documentsCategoryText: {
    color: "#786e6e",
    fontSize: 9,
    letterSpacing: 0.8,
  },
  documentsCategoryTextSelected: {
    color: "#ebd9d9",
  },
  documentsCount: {
    color: "#675959",
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 7,
  },
  documentsResults: {
    maxHeight: 245,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#252020",
    backgroundColor: "#080707",
  },
  documentsResultRow: {
    minHeight: 59,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#201a1a",
  },
  documentsResultSelected: {
    backgroundColor: "#231212",
    borderLeftWidth: 2,
    borderLeftColor: "#a75454",
    paddingLeft: 9,
  },
  documentsResultMain: {
    flex: 1,
    paddingRight: 10,
  },
  documentsResultTitle: {
    fontSize: 11,
    color: "#e2dada",
    letterSpacing: 0.4,
  },
  documentsResultCategory: {
    fontSize: 9,
    color: "#766767",
    marginTop: 5,
  },
  documentsResultMark: {
    color: "#b56a6a",
    fontSize: 16,
  },
  documentsEmpty: {
    color: "#766767",
    textAlign: "center",
    paddingVertical: 18,
    fontSize: 9,
  },
  documentsSelected: {
    marginTop: 16,
    marginBottom: 2,
    padding: 14,
    borderWidth: 1,
    borderColor: "#4e3030",
    backgroundColor: "#100b0b",
  },
  documentsSelectedTitle: {
    color: "#f1e7e5",
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 19,
  },
  documentsSelectedMeta: {
    color: "#7a6969",
    fontSize: 9,
    lineHeight: 14,
  },
  documentsPreviewButton: {
    marginTop: 13,
    backgroundColor: "#2f1616",
    borderWidth: 1,
    borderColor: "#995151",
    paddingVertical: 13,
    alignItems: "center",
  },
  documentsPreviewText: {
    color: "#f1dedc",
    fontSize: 10,
    letterSpacing: 1.1,
  },
  documentsPreviewed: {
    textAlign: "center",
    color: "#a08080",
    fontSize: 8,
    marginTop: 10,
    letterSpacing: 1.2,
  },
  documentsRecipientActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  documentsAuxButton: {
    borderWidth: 1,
    borderColor: "#363030",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  documentsAuxText: {
    color: "#aaa0a0",
    fontSize: 8,
    letterSpacing: 0.7,
  },
  documentsRecipientGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  documentsRecipient: {
    width: "48%",
    flexGrow: 1,
    minHeight: 68,
    backgroundColor: "#0b0a0a",
    borderWidth: 1,
    borderColor: "#2b2424",
    padding: 11,
  },
  documentsRecipientSelected: {
    backgroundColor: "#231212",
    borderColor: "#aa5a5a",
  },
  documentsRecipientHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  documentsRecipientName: {
    color: "#e0d4d4",
    fontSize: 10,
    letterSpacing: 0.7,
    flex: 1,
  },
  documentsRecipientCheck: {
    color: "#b77979",
    fontSize: 16,
  },
  documentsRecipientRace: {
    color: "#a08b8b",
    fontSize: 8,
    letterSpacing: 0.7,
    marginTop: 4,
  },
  documentsRecipientStatus: {
    color: "#988686",
    fontSize: 8,
    marginTop: 9,
  },
  documentsFeedback: {
    color: "#d6aaaa",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 14,
    letterSpacing: 0.6,
  },
  documentsExecute: {
    borderWidth: 1,
    borderColor: "#a04c4c",
    backgroundColor: "#441d1d",
    minHeight: 49,
    marginTop: 16,
    paddingHorizontal: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  documentsExecuteText: {
    color: "#f3e8e6",
    fontSize: 10,
    letterSpacing: 1,
    textAlign: "center",
  },
});
