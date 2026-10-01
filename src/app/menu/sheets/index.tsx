import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { getCharacter, updateCharacter } from "@/services/firebase/characters";

import { db } from "@/services/firebase/config";

/*
 * =========================================================
 * PERSONAGENS
 * =========================================================
 */

const firebaseIds: Record<string, string> = {
  Ciborgue: "cyborg",
  Tengu: "tengu",
  Elfo: "elf",
  Tiefling: "tiefling",
  Draconata: "dragonborn",
};

/*
 * =========================================================
 * ÍCONES DE INSPEÇÃO
 * =========================================================
 *
 * Os tipos usados aqui são os mesmos definidos em
 * characterDefaults.inspecao.
 */

const inspectionIcons: Record<string, any> = {
  roupa: require("@/assets/icons/inspecao_roupa.png"),
  olho: require("@/assets/icons/inspecao_olho.png"),
  pele: require("@/assets/icons/inspecao_pele.png"),
  postura: require("@/assets/icons/inspecao_postura.png"),
  raca: require("@/assets/icons/inspecao_raca.png"),
  fisico: require("@/assets/icons/inspecao_fisico.png"),
  voz: require("@/assets/icons/inspecao_voz.png"),
};

/*
 * =========================================================
 * FOTOS
 * =========================================================
 */

const characterPhotos: Record<string, any> = {
  Ciborgue: require("@/assets/characters/cyborg-photo.png"),
  Tengu: require("@/assets/characters/tengu-photo.png"),
  Elfo: require("@/assets/characters/elf-photo.png"),
  Tiefling: require("@/assets/characters/tiefling-photo.png"),
  Draconata: require("@/assets/characters/dragonborn-photo.png"),
};

/*
 * =========================================================
 * IMAGENS DAS SKILL CARDS
 * =========================================================
 */

const skillCardImages: Record<string, any> = {
  acquiredImmunity: require("@/assets/skillCards/acquiredImmunity.png"),
  ancestralGrudge: require("@/assets/skillCards/ancestralGrudge.png"),
  bloodCorruption: require("@/assets/skillCards/bloodCorruption.png"),
  bornIntoTheHatred: require("@/assets/skillCards/bornIntoTheHatred.png"),
  demonShape: require("@/assets/skillCards/demonShape.png"),
  downToAFineArt: require("@/assets/skillCards/downToAFineArt.png"),
  draconicSpikes: require("@/assets/skillCards/draconicSpikes.png"),
  elementalHeritage: require("@/assets/skillCards/elementalHeritage.png"),
  extendedWarranty: require("@/assets/skillCards/extendedWarranty.png"),
  featheredDread: require("@/assets/skillCards/featheredDread.png"),
  feralInstinct: require("@/assets/skillCards/feralInstinct.png"),
  gloryOfWar: require("@/assets/skillCards/gloryOfWar.png"),
  hardenedSkin: require("@/assets/skillCards/hardenedSkin.png"),
  holographicChip: require("@/assets/skillCards/holographicChip.png"),
  incantation: require("@/assets/skillCards/incantation.png"),
  lightBow: require("@/assets/skillCards/lightBow.png"),
  malware: require("@/assets/skillCards/malware.png"),
  mimicry: require("@/assets/skillCards/mimicry.png"),
  necroticEmesis: require("@/assets/skillCards/necroticEmesis.png"),
  nowYouSeeMe: require("@/assets/skillCards/nowYouSeeMe.png"),
  opportunityStrike: require("@/assets/skillCards/opportunityStrike.png"),
  organicKnowledge: require("@/assets/skillCards/organicKnowledge.png"),
  overcharge: require("@/assets/skillCards/overcharge.png"),
  overclock: require("@/assets/skillCards/overclock.png"),
  performativeGenerosity: require("@/assets/skillCards/performativeGenerosity.png"),
  rancor: require("@/assets/skillCards/rancor.png"),
  terminator: require("@/assets/skillCards/terminator.png"),
  tribalAfflatus: require("@/assets/skillCards/tribalAfflatus.png"),
  fledgling: require("@/assets/skillCards/fledgling.png"),
  necrobioticCuirass: require("@/assets/skillCards/necrobioticCuirass.png"),
};

/*
 * =========================================================
 * ATRIBUTOS
 * =========================================================
 */

const attributes = [
  { key: "forca", label: "FOR" },
  { key: "agilidade", label: "AGI" },
  { key: "destreza", label: "DES" },
  { key: "vigor", label: "VIG" },
  { key: "intelecto", label: "INT" },
  { key: "presenca", label: "PRE" },
];

/*
 * =========================================================
 * TIPOS
 * =========================================================
 */

type SkillCardEffect = {
  tipo: string;
  campo: string;
  valor: number;
  maximo?: number;
  valorMaximo?: number;
};

type SkillCardCooldown = {
  habilitada: boolean;
  segundos: number | null;
};

type SkillCardData = {
  id: string;
  nome?: string;
  descricao?: string;
  imagem?: string;
  personagem?: string;
  tier?: number;
  efeitos?: SkillCardEffect[];
  recarga?: SkillCardCooldown;
};

/*
 * =========================================================
 * FORMATADOR DE NOME
 * =========================================================
 */

function formatCardName(name: string) {
  if (name === "downToAFineArt") {
    return "DOWN TO A FINE ART";
  }

  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
}

/*
 * =========================================================
 * FICHA COMPLETA
 * =========================================================
 */

export default function CompleteSheet() {
  const { width } = useWindowDimensions();

  /*
   * -------------------------------------------------------
   * PERSONAGEM
   * -------------------------------------------------------
   */

  const [characterName, setCharacterName] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);

  /*
   * -------------------------------------------------------
   * IDENTIDADE
   * -------------------------------------------------------
   */

  const [name, setName] = useState("");
  const [race, setRace] = useState("");

  /*
   * -------------------------------------------------------
   * ESTADOS BÁSICOS
   * -------------------------------------------------------
   */

  const [vidaAtual, setVidaAtual] = useState(0);
  const [vidaMaxima, setVidaMaxima] = useState(0);
  const [evasao, setEvasao] = useState(0);
  const [instintoAtual, setInstintoAtual] = useState(0);

  /*
   * -------------------------------------------------------
   * ATRIBUTOS
   * -------------------------------------------------------
   */

  const [attributeValues, setAttributeValues] = useState<
    Record<string, number>
  >({
    forca: 0,
    agilidade: 0,
    destreza: 0,
    vigor: 0,
    intelecto: 0,
    presenca: 0,
  });

  /*
   * -------------------------------------------------------
   * CLASSE
   * -------------------------------------------------------
   */

  const [classe, setClasse] = useState("");

  /*
   * -------------------------------------------------------
   * SKILL CARDS
   * -------------------------------------------------------
   */

  const [skillCards, setSkillCards] = useState<any>({
    tier1: null,
    tier2: null,
    tier3: null,
  });

  const [skillCardData, setSkillCardData] = useState<{
    tier1: SkillCardData | null;
    tier2: SkillCardData | null;
    tier3: SkillCardData | null;
  }>({
    tier1: null,
    tier2: null,
    tier3: null,
  });

  /*
   * -------------------------------------------------------
   * COOLDOWNS
   *
   * Armazena o timestamp em que cada carta termina.
   * -------------------------------------------------------
   */

  const [skillCardCooldowns, setSkillCardCooldowns] = useState<{
    tier1: number | null;
    tier2: number | null;
    tier3: number | null;
  }>({
    tier1: null,
    tier2: null,
    tier3: null,
  });

  const [currentTime, setCurrentTime] = useState(Date.now());

  const [activatingSkillCard, setActivatingSkillCard] = useState(false);

  /*
   * -------------------------------------------------------
   * RECURSOS
   *
   * Recursos acumuláveis/gastáveis ficam em "recursos".
   * Ex.: Rancor, Flechas de Luz e Energia.
   * -------------------------------------------------------
   */

  const [recursos, setRecursos] = useState<
    Record<
      string,
      {
        atual: number;
        maximo?: number;
      }
    >
  >({});

  /*
   * -------------------------------------------------------
   * ESTADOS DINÂMICOS
   *
   * Estados que fazem parte diretamente da condição do
   * personagem ficam em "estados".
   * Ex.: armadura e escudo.
   * -------------------------------------------------------
   */

  const [estados, setEstados] = useState<
    Record<
      string,
      {
        atual: number;
        maximo?: number;
      }
    >
  >({});

  /*
   * -------------------------------------------------------
   * OUTROS CAMPOS
   * -------------------------------------------------------
   */

  const [escolhasImportantes, setEscolhasImportantes] = useState<string[]>([]);

  const [efeitosAtivos, setEfeitosAtivos] = useState("");

  const [modificacoes, setModificacoes] = useState("");

  const [inspecao, setInspecao] = useState<any[]>([]);

  /*
   * -------------------------------------------------------
   * MODAL
   * -------------------------------------------------------
   */

  const [selectedSkillCard, setSelectedSkillCard] =
    useState<SkillCardData | null>(null);

  const [modalVisible, setModalVisible] = useState(false);

  const modalOverlayOpacity = useRef(new Animated.Value(0)).current;

  const modalOpacity = useRef(new Animated.Value(0)).current;

  const modalScale = useRef(new Animated.Value(0.94)).current;

  const modalTranslateY = useRef(new Animated.Value(14)).current;

  /*
   * =========================================================
   * ABRIR SKILL CARD
   * =========================================================
   */

  function openSkillCard(card: SkillCardData) {
    setSelectedSkillCard(card);
    setModalVisible(true);

    modalOverlayOpacity.setValue(0);
    modalOpacity.setValue(0);
    modalScale.setValue(0.9);
    modalTranslateY.setValue(24);

    Animated.timing(modalOverlayOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),

      Animated.spring(modalScale, {
        toValue: 1,
        friction: 10,
        tension: 45,
        delay: 100,
        useNativeDriver: true,
      }),

      Animated.timing(modalTranslateY, {
        toValue: 0,
        duration: 550,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }

  /*
   * =========================================================
   * FECHAR SKILL CARD
   * =========================================================
   */

  function closeSkillCard() {
    Animated.parallel([
      Animated.timing(modalOverlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),

      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),

      Animated.timing(modalScale, {
        toValue: 0.94,
        duration: 300,
        useNativeDriver: true,
      }),

      Animated.timing(modalTranslateY, {
        toValue: 12,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      setSelectedSkillCard(null);
    });
  }

  /*
   * =========================================================
   * RECUPERAR PERSONAGEM DO CELULAR
   * =========================================================
   */

  useEffect(() => {
    async function loadSelectedCharacter() {
      try {
        const storedCharacter = await AsyncStorage.getItem("selectedCharacter");

        if (!storedCharacter || !firebaseIds[storedCharacter]) {
          console.error("Nenhum personagem selecionado.");

          setLoading(false);
          return;
        }

        setCharacterName(storedCharacter);
      } catch (error) {
        console.error("Erro ao recuperar personagem:", error);

        setLoading(false);
      }
    }

    loadSelectedCharacter();
  }, []);

  /*
   * =========================================================
   * ID FIREBASE
   * =========================================================
   */

  const firebaseCharacterId = characterName ? firebaseIds[characterName] : null;

  /*
   * =========================================================
   * FOTO
   * =========================================================
   */

  const photo = characterName ? characterPhotos[characterName] : null;

  /*
   * =========================================================
   * SINCRONIZAÇÃO DA FICHA EM TEMPO REAL
   * =========================================================
   */

  useEffect(() => {
    if (!characterName || !firebaseCharacterId) {
      return;
    }

    setLoading(true);

    const characterRef = doc(db, "characters", firebaseCharacterId);

    const unsubscribe = onSnapshot(
      characterRef,
      async (snapshot) => {
        try {
          if (!snapshot.exists()) {
            console.error("Personagem não encontrado no Firebase.");
            setLoading(false);
            return;
          }

          const firebaseData = snapshot.data();

          setName(firebaseData.nome ?? characterName);
          setRace(firebaseData.raca ?? characterName);

          setVidaAtual(firebaseData.vidaAtual ?? 0);
          setVidaMaxima(firebaseData.vidaMaxima ?? 0);
          setEvasao(firebaseData.evasao ?? 0);
          setInstintoAtual(firebaseData.instintoAtual ?? 0);

          setAttributeValues({
            forca: firebaseData.forca ?? 0,
            agilidade: firebaseData.agilidade ?? 0,
            destreza: firebaseData.destreza ?? 0,
            vigor: firebaseData.vigor ?? 0,
            intelecto: firebaseData.intelecto ?? 0,
            presenca: firebaseData.presenca ?? 0,
          });

          setClasse(firebaseData.classe ?? "");

          const loadedSkillCards = firebaseData.skillCards ?? {
            tier1: null,
            tier2: null,
            tier3: null,
          };

          setSkillCards(loadedSkillCards);

          const tiers = ["tier1", "tier2", "tier3"] as const;

          const loadedCardData: {
            tier1: SkillCardData | null;
            tier2: SkillCardData | null;
            tier3: SkillCardData | null;
          } = {
            tier1: null,
            tier2: null,
            tier3: null,
          };

          for (const tier of tiers) {
            const cardId = loadedSkillCards[tier];

            if (!cardId) {
              continue;
            }

            const cardSnapshot = await getDoc(doc(db, "skillCards", cardId));

            if (cardSnapshot.exists()) {
              loadedCardData[tier] = {
                id: cardSnapshot.id,
                ...(cardSnapshot.data() as Omit<SkillCardData, "id">),
              };
            }
          }

          setSkillCardData(loadedCardData);

          setSkillCardCooldowns({
            tier1: firebaseData.skillCardCooldowns?.tier1 ?? null,
            tier2: firebaseData.skillCardCooldowns?.tier2 ?? null,
            tier3: firebaseData.skillCardCooldowns?.tier3 ?? null,
          });

          setEstados(firebaseData.estados ?? {});
          setRecursos(firebaseData.recursos ?? {});

          setEscolhasImportantes(firebaseData.escolhasImportantes ?? []);
          setEfeitosAtivos(firebaseData.efeitosAtivos ?? "");
          setModificacoes(firebaseData.modificacoes ?? "");
          setInspecao(firebaseData.inspecao ?? []);

          setCurrentTime(Date.now());
        } catch (error) {
          console.error("Erro ao sincronizar ficha:", error);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Erro na sincronização da ficha:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [characterName, firebaseCharacterId]);

  /*
   * =========================================================
   * ATUALIZAÇÃO DO RELÓGIO DOS COOLDOWNS
   * =========================================================
   */

  useEffect(() => {
    const hasCooldown = Object.values(skillCardCooldowns).some(
      (cooldown) => cooldown !== null && cooldown > Date.now(),
    );

    if (!hasCooldown) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [skillCardCooldowns]);

  /*
   * =========================================================
   * SALVAR CAMPO
   * =========================================================
   */

  async function saveField(field: string, value: any) {
    if (!firebaseCharacterId) {
      return;
    }

    try {
      await updateCharacter(firebaseCharacterId, {
        [field]: value,
      });
    } catch (error) {
      console.error(`Erro ao salvar ${field}:`, error);
    }
  }

  /*
   * =========================================================
   * ATRIBUTO
   * =========================================================
   */

  function updateAttribute(key: string, text: string) {
    const value = Number(text);

    setAttributeValues((previous) => ({
      ...previous,
      [key]: Number.isNaN(value) ? 0 : value,
    }));
  }

  /*
   * =========================================================
   * TEMPO RESTANTE
   * =========================================================
   */

  function getSkillCardRemainingSeconds(tier: "tier1" | "tier2" | "tier3") {
    const cooldownEnd = skillCardCooldowns[tier];

    if (!cooldownEnd) {
      return 0;
    }

    return Math.max(0, Math.ceil((cooldownEnd - currentTime) / 1000));
  }

  /*
   * =========================================================
   * FORMATAR TEMPO
   * =========================================================
   */

  function formatCooldown(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  /*
   * =========================================================
   * ATIVAR SKILL CARD
   * =========================================================
   */

  async function activateSkillCard(tier: "tier1" | "tier2" | "tier3") {
    if (!firebaseCharacterId || !selectedSkillCard || activatingSkillCard) {
      return;
    }

    /*
     * Impede ativação durante cooldown.
     */

    const remainingSeconds = getSkillCardRemainingSeconds(tier);

    if (remainingSeconds > 0) {
      return;
    }

    try {
      setActivatingSkillCard(true);

      /*
       * Busca o estado mais atual diretamente do Firebase.
       */

      const characterSnapshot = await getDoc(
        doc(db, "characters", firebaseCharacterId),
      );

      if (!characterSnapshot.exists()) {
        return;
      }

      const characterData = characterSnapshot.data();
      const updates: Record<string, any> = {};

      /*
       * =====================================================
       * EFEITOS
       * =====================================================
       *
       * Cada efeito vem do Firestore e é interpretado pelo
       * seu "tipo". A carta não precisa ser conhecida pelo app.
       */

      const effects = selectedSkillCard.efeitos ?? [];

      const currentStates = characterData.estados ?? {};
      const updatedStates = {
        ...currentStates,
      };

      const currentResources = characterData.recursos ?? {};
      const updatedResources = {
        ...currentResources,
      };

      let statesChanged = false;
      let resourcesChanged = false;

      /*
       * Efeitos que o app ainda não possui uma regra específica
       * não são descartados. Eles ficam registrados de forma
       * estruturada para uso posterior.
       */

      const currentStructuredEffects =
        characterData.efeitosAtivosEstruturados ?? [];

      const updatedStructuredEffects = [...currentStructuredEffects];

      let structuredEffectsChanged = false;

      for (const effect of effects) {
        if (!effect || !effect.tipo || !effect.campo) {
          continue;
        }

        /*
         * -----------------------------------------------------
         * ATRIBUTO
         * -----------------------------------------------------
         *
         * Exemplo:
         * {
         *   tipo: "atributo",
         *   campo: "presenca",
         *   valor: 3
         * }
         */

        if (effect.tipo === "atributo") {
          const currentValue = Number(characterData[effect.campo] ?? 0);

          updates[effect.campo] = currentValue + Number(effect.valor ?? 0);

          continue;
        }

        /*
         * -----------------------------------------------------
         * ESTADO
         * -----------------------------------------------------
         *
         * Estados ficam diretamente em "estados".
         * Exemplo: escudoRegenerativo.
         */

        if (effect.tipo === "estado") {
          const existingState = updatedStates[effect.campo];

          /*
           * Pele Endurecida: PASSAR CENA recupera +2 de
           * armadura por cena, nunca ultrapassando o máximo.
           */
          const isHardenedSkin =
            selectedSkillCard.imagem === "hardenedSkin" &&
            effect.campo === "armadura";

          const isNecrobioticCuirass =
            selectedSkillCard.imagem === "necrobioticCuirass" &&
            effect.campo === "escudo";

          const effectMaximo = effect.maximo ?? effect.valorMaximo;

          if (existingState === undefined) {
            updatedStates[effect.campo] = {
              atual: Math.max(
                0,
                Math.min(
                  isHardenedSkin
                    ? Number(effect.valor ?? 0)
                    : Number(effect.valor ?? 0),
                  Number(effectMaximo ?? effect.valor ?? 0),
                ),
              ),
              ...(effectMaximo !== undefined ? { maximo: effectMaximo } : {}),
            };
            statesChanged = true;
            continue;
          }

          const maximo = effectMaximo ?? existingState.maximo;

          let newValue = Number(existingState.atual ?? 0);

          if (isHardenedSkin) {
            newValue += 2;
          } else if (isNecrobioticCuirass) {
            newValue += 3;
          } else if (Number(effect.valor ?? 0) !== 0) {
            newValue += Number(effect.valor ?? 0);
          }

          if (maximo !== undefined) {
            newValue = Math.min(newValue, Number(maximo));
          }

          newValue = Math.max(0, newValue);

          updatedStates[effect.campo] = {
            ...existingState,
            atual: newValue,
            ...(maximo !== undefined ? { maximo } : {}),
          };

          statesChanged = true;
          continue;
        }

        /*
         * -----------------------------------------------------
         * RECURSO
         * -----------------------------------------------------
         *
         * Exemplo:
         * {
         *   tipo: "recurso",
         *   campo: "rancor",
         *   valor: 0,
         *   maximo: 5
         * }
         *
         * Se o recurso não existir, ele é criado.
         * Se já existir, valor 0 apenas garante sua existência.
         */

        if (effect.tipo === "recurso") {
          const existingResource = updatedResources[effect.campo];

          if (existingResource === undefined) {
            updatedResources[effect.campo] = {
              atual: Number(effect.valor ?? 0),
              ...(effect.maximo !== undefined
                ? {
                    maximo: effect.maximo,
                  }
                : {}),
            };

            resourcesChanged = true;
            continue;
          }

          let newValue = Number(existingResource.atual ?? 0);

          if (Number(effect.valor ?? 0) !== 0) {
            newValue += Number(effect.valor ?? 0);
          }

          const maximo = effect.maximo ?? existingResource.maximo;

          if (maximo !== undefined) {
            newValue = Math.min(newValue, Number(maximo));
          }

          newValue = Math.max(0, newValue);

          updatedResources[effect.campo] = {
            ...existingResource,
            atual: newValue,
            ...(maximo !== undefined
              ? {
                  maximo: maximo,
                }
              : {}),
          };

          resourcesChanged = true;
          continue;
        }

        /*
         * -----------------------------------------------------
         * OUTROS TIPOS
         * -----------------------------------------------------
         *
         * Mantemos qualquer efeito desconhecido registrado.
         * Isso permite adicionar novos tipos no Firestore sem
         * quebrar a ativação da carta.
         */

        updatedStructuredEffects.push({
          cardId: selectedSkillCard.id,
          cardNome: selectedSkillCard.nome ?? selectedSkillCard.id,
          tipo: effect.tipo,
          campo: effect.campo,
          valor: Number(effect.valor ?? 0),
          ...(effect.maximo !== undefined
            ? {
                maximo: effect.maximo,
              }
            : {}),
        });

        structuredEffectsChanged = true;
      }

      /*
       * =====================================================
       * SALVAR ESTADOS
       * =====================================================
       */

      if (statesChanged) {
        updates.estados = updatedStates;
      }

      /*
       * =====================================================
       * SALVAR RECURSOS
       * =====================================================
       */

      if (resourcesChanged) {
        updates.recursos = updatedResources;
      }

      /*
       * =====================================================
       * SALVAR EFEITOS ESTRUTURADOS
       * =====================================================
       */

      if (structuredEffectsChanged) {
        updates.efeitosAtivosEstruturados = updatedStructuredEffects;
      }

      /*
       * =====================================================
       * COOLDOWN
       * =====================================================
       */

      let cooldownEnd: number | null = null;

      if (
        selectedSkillCard.recarga?.habilitada &&
        selectedSkillCard.recarga.segundos &&
        selectedSkillCard.recarga.segundos > 0
      ) {
        cooldownEnd = Date.now() + selectedSkillCard.recarga.segundos * 1000;
      }

      updates[`skillCardCooldowns.${tier}`] = cooldownEnd;

      /*
       * =====================================================
       * SALVAR TUDO
       * =====================================================
       */

      await updateCharacter(firebaseCharacterId, updates);

      /*
       * =====================================================
       * ATUALIZAR ESTADO LOCAL
       * =====================================================
       */

      setSkillCardCooldowns((current) => ({
        ...current,
        [tier]: cooldownEnd,
      }));

      if (statesChanged) {
        setEstados(updatedStates);
      }

      if (resourcesChanged) {
        setRecursos(updatedResources);
      }

      /*
       * Atualiza visualmente os atributos que foram alterados
       * pela Skill Card.
       */

      const attributeEffects = effects.filter(
        (effect) =>
          effect?.tipo === "atributo" &&
          attributes.some((attribute) => attribute.key === effect.campo),
      );

      if (attributeEffects.length > 0) {
        setAttributeValues((current) => {
          const updated = {
            ...current,
          };

          for (const effect of attributeEffects) {
            updated[effect.campo] =
              (updated[effect.campo] ?? 0) + Number(effect.valor ?? 0);
          }

          return updated;
        });
      }

      setCurrentTime(Date.now());

      console.log(
        `SKILL CARD ATIVADA: ${selectedSkillCard.nome ?? selectedSkillCard.id}`,
        effects,
      );
    } catch (error) {
      console.error("ERRO AO ATIVAR SKILL CARD:", error);
    } finally {
      setActivatingSkillCard(false);
    }
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color="#ffffff" />
      </View>
    );
  }

  /*
   * =========================================================
   * SEM PERSONAGEM
   * =========================================================
   */

  if (!characterName || !firebaseCharacterId) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyText}>Nenhum personagem selecionado.</Text>
      </View>
    );
  }

  /*
   * =========================================================
   * EXISTE SKILL CARD?
   * =========================================================
   */

  const hasSkillCards =
    skillCardData.tier1 || skillCardData.tier2 || skillCardData.tier3;

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* =================================================
            CABEÇALHO
        ================================================= */}

        <View style={styles.header}>
          <Text style={styles.system}>Aniquilação</Text>

          <Text style={styles.title}>FICHA COMPLETA</Text>

          <View style={styles.line} />
        </View>

        {/* =================================================
            IDENTIDADE
        ================================================= */}

        <View style={styles.identity}>
          {photo && (
            <Image source={photo} resizeMode="contain" style={styles.photo} />
          )}

          <TextInput
            value={name}
            onChangeText={setName}
            onBlur={() => saveField("nome", name)}
            style={styles.nameInput}
            selectionColor="#ffffff"
          />

          <Text style={styles.race}>{race.toUpperCase()}</Text>
        </View>

        {/* =================================================
            FICHA BÁSICA
        ================================================= */}

        <View style={styles.section}>
          <SectionHeader title="FICHA BÁSICA" />

          <View style={styles.stateGrid}>
            {/* VIDA */}

            <StateBox label="VIDA">
              <View style={styles.valueRow}>
                <TextInput
                  value={String(vidaAtual)}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = Number(text);

                    setVidaAtual(Number.isNaN(value) ? 0 : value);
                  }}
                  onBlur={() => saveField("vidaAtual", vidaAtual)}
                  style={styles.valueInput}
                  selectionColor="#ffffff"
                />

                <Text style={styles.slash}>/</Text>

                <TextInput
                  value={String(vidaMaxima)}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = Number(text);

                    setVidaMaxima(Number.isNaN(value) ? 0 : value);
                  }}
                  onBlur={() => saveField("vidaMaxima", vidaMaxima)}
                  style={styles.valueInput}
                  selectionColor="#ffffff"
                />
              </View>
            </StateBox>

            {/* ARMADURA / ESCUDO */}

            {(estados.armadura || estados.escudo) && (
              <StateBox label={estados.armadura ? "ARMADURA" : "ESCUDO"}>
                <View style={styles.valueRow}>
                  <TextInput
                    value={String(
                      (estados.armadura ?? estados.escudo)?.atual ?? 0,
                    )}
                    keyboardType="numeric"
                    selectTextOnFocus
                    onChangeText={(text) => {
                      const campo = estados.armadura ? "armadura" : "escudo";
                      const estadoAtual = estados[campo];
                      const value = Number(text);
                      const maximo = estadoAtual?.maximo;

                      if (text === "" || !Number.isNaN(value)) {
                        const safeValue =
                          text === ""
                            ? 0
                            : Math.max(
                                0,
                                maximo !== undefined
                                  ? Math.min(value, maximo)
                                  : value,
                              );

                        setEstados((current) => ({
                          ...current,
                          [campo]: {
                            ...current[campo],
                            atual: safeValue,
                          },
                        }));
                      }
                    }}
                    onBlur={() => saveField("estados", estados)}
                    style={styles.valueInput}
                    selectionColor="#ffffff"
                  />

                  {(estados.armadura ?? estados.escudo)?.maximo !==
                    undefined && (
                    <>
                      <Text style={styles.slash}>/</Text>
                      <Text style={styles.fixedValue}>
                        {(estados.armadura ?? estados.escudo)?.maximo}
                      </Text>
                    </>
                  )}
                </View>
              </StateBox>
            )}

            {/* EVASÃO */}

            <StateBox label="EVASÃO">
              <TextInput
                value={String(evasao)}
                keyboardType="numeric"
                selectTextOnFocus
                onChangeText={(text) => {
                  if (/^\d*$/.test(text)) {
                    setEvasao(text === "" ? 0 : Number(text));
                  }
                }}
                onBlur={() => saveField("evasao", evasao)}
                style={styles.singleValueInput}
                selectionColor="#ffffff"
              />
            </StateBox>

            {/* INSTINTO */}

            <StateBox label="INSTINTO">
              <View style={styles.valueRow}>
                <TextInput
                  value={String(instintoAtual)}
                  keyboardType="numeric"
                  onChangeText={(text) => {
                    const value = Number(text);

                    if (Number.isNaN(value)) {
                      setInstintoAtual(0);

                      return;
                    }

                    setInstintoAtual(Math.min(10, Math.max(0, value)));
                  }}
                  onBlur={() => saveField("instintoAtual", instintoAtual)}
                  style={styles.valueInput}
                  selectionColor="#ffffff"
                />

                <Text style={styles.slash}>/</Text>

                <Text style={styles.fixedValue}>10</Text>
              </View>
            </StateBox>
          </View>

          {/* ATRIBUTOS */}

          <View style={styles.attributesHeader}>
            <SectionHeader title="ATRIBUTOS" />
          </View>

          <View style={styles.attributesGrid}>
            {attributes.map((attribute) => (
              <View key={attribute.key} style={styles.attribute}>
                <Text style={styles.attributeLabel}>{attribute.label}</Text>

                <TextInput
                  value={String(attributeValues[attribute.key] ?? 0)}
                  keyboardType="numeric"
                  onChangeText={(text) => updateAttribute(attribute.key, text)}
                  onBlur={() =>
                    saveField(
                      attribute.key,
                      attributeValues[attribute.key] ?? 0,
                    )
                  }
                  style={styles.attributeInput}
                  selectionColor="#ffffff"
                />
              </View>
            ))}
          </View>
        </View>

        {/* =================================================
            RECURSOS
        ================================================= */}

        {Object.keys(recursos).length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="RECURSOS" />

            <View style={styles.resourcesContainer}>
              {Object.entries(recursos).map(([campo, recurso]) => (
                <View key={campo} style={styles.resourceRow}>
                  <Text style={styles.resourceName}>
                    ◆ {formatCardName(campo)}
                  </Text>

                  <View style={styles.resourceValueRow}>
                    <TextInput
                      value={String(recurso.atual ?? 0)}
                      keyboardType="numeric"
                      selectTextOnFocus
                      onChangeText={(text) => {
                        const value = Number(text);

                        const safeValue = Number.isNaN(value)
                          ? 0
                          : Math.max(
                              0,
                              recurso.maximo !== undefined
                                ? Math.min(value, recurso.maximo)
                                : value,
                            );

                        setRecursos((current) => ({
                          ...current,

                          [campo]: {
                            ...current[campo],
                            atual: safeValue,
                          },
                        }));
                      }}
                      onBlur={() => saveField("recursos", recursos)}
                      style={styles.resourceInput}
                      selectionColor="#ffffff"
                    />

                    {recurso.maximo !== undefined && (
                      <>
                        <Text style={styles.resourceSlash}>/</Text>

                        <Text style={styles.resourceMax}>{recurso.maximo}</Text>
                      </>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* =================================================
            CLASSE
        ================================================= */}

        <View style={styles.section}>
          <SectionHeader title="CLASSE" />

          <Text style={styles.classValue}>
            {classe || "Nenhuma classe definida"}
          </Text>
        </View>

        {/* =================================================
            SKILL CARDS
        ================================================= */}

        {hasSkillCards && (
          <View style={styles.section}>
            <SectionHeader title="SKILL CARDS" />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardsContainer}
            >
              {skillCardData.tier1 && (
                <SkillCard
                  card={skillCardData.tier1}
                  onPress={() => openSkillCard(skillCardData.tier1!)}
                />
              )}

              {skillCardData.tier2 && (
                <SkillCard
                  card={skillCardData.tier2}
                  onPress={() => openSkillCard(skillCardData.tier2!)}
                />
              )}

              {skillCardData.tier3 && (
                <SkillCard
                  card={skillCardData.tier3}
                  onPress={() => openSkillCard(skillCardData.tier3!)}
                />
              )}
            </ScrollView>
          </View>
        )}

        {/* =================================================
            EFEITOS ATIVOS
        ================================================= */}

        <View style={styles.section}>
          <SectionHeader title="EFEITOS ATIVOS" />

          <TextInput
            value={efeitosAtivos}
            onChangeText={setEfeitosAtivos}
            onBlur={() => saveField("efeitosAtivos", efeitosAtivos)}
            multiline
            placeholder="Nenhum efeito ativo."
            placeholderTextColor="#555"
            style={styles.largeTextField}
            selectionColor="#ffffff"
          />
        </View>

        {/* =================================================
            MODIFICAÇÕES
        ================================================= */}

        <View style={styles.section}>
          <SectionHeader title="MODIFICAÇÕES" />

          <TextInput
            value={modificacoes}
            onChangeText={setModificacoes}
            onBlur={() => saveField("modificacoes", modificacoes)}
            multiline
            placeholder="Nenhuma modificação registrada."
            placeholderTextColor="#555"
            style={styles.largeTextField}
            selectionColor="#ffffff"
          />
        </View>

        {/* =================================================
            ESCOLHAS
        ================================================= */}

        <View style={styles.section}>
          <SectionHeader title="ESCOLHAS" />

          {escolhasImportantes.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma escolha registrada.</Text>
          ) : (
            [...escolhasImportantes].reverse().map((choice, index) => (
              <View key={`${choice}-${index}`} style={styles.listItem}>
                <View style={styles.listDot} />

                <Text style={styles.listText}>{choice}</Text>
              </View>
            ))
          )}
        </View>

        {/* =================================================
            INSPEÇÃO
        ================================================= */}

        <View style={styles.section}>
          <SectionHeader title="INSPEÇÃO" />

          {inspecao.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma informação registrada.</Text>
          ) : (
            inspecao.map((item, index) => {
              const icon = inspectionIcons[item?.tipo];

              return (
                <View
                  key={`${item?.tipo ?? "inspecao"}-${index}`}
                  style={styles.inspectionItem}
                >
                  <View style={styles.inspectionIcon}>
                    {icon ? (
                      <Image
                        source={icon}
                        resizeMode="contain"
                        style={styles.inspectionIconImage}
                      />
                    ) : (
                      <Text style={styles.inspectionIconFallback}>•</Text>
                    )}
                  </View>

                  <TextInput
                    value={item?.descricao ?? ""}
                    onChangeText={(text) => {
                      const updated = [...inspecao];

                      updated[index] = {
                        ...updated[index],
                        descricao: text,
                      };

                      setInspecao(updated);
                    }}
                    onBlur={() => saveField("inspecao", inspecao)}
                    multiline
                    style={styles.inspectionText}
                    placeholder="Clique para editar..."
                    placeholderTextColor="#555"
                    selectionColor="#ffffff"
                  />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* =====================================================
          MODAL DA SKILL CARD
      ===================================================== */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSkillCard}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: modalOverlayOpacity,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.skillCardModal,
              {
                opacity: modalOpacity,

                transform: [
                  {
                    scale: modalScale,
                  },
                  {
                    translateY: modalTranslateY,
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalSystem}>
                SKILL CARD // TIER {selectedSkillCard?.tier ?? "—"}
              </Text>

              <View style={styles.modalHeaderLine} />
            </View>

            <Text style={styles.modalTitle}>
              {selectedSkillCard?.imagem
                ? formatCardName(selectedSkillCard.imagem)
                : ""}
            </Text>

            <View style={styles.modalSeparator} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={styles.modalDescription}>
                {selectedSkillCard?.descricao ?? ""}
              </Text>
            </ScrollView>

            {/* =================================================
                CONTROLE DA CARTA
            ================================================= */}

            {selectedSkillCard &&
              (() => {
                const tier = `tier${selectedSkillCard.tier}` as
                  | "tier1"
                  | "tier2"
                  | "tier3";

                const remainingSeconds = getSkillCardRemainingSeconds(tier);

                const isOnCooldown = remainingSeconds > 0;

                const hasCooldown =
                  selectedSkillCard.recarga?.habilitada === true &&
                  (selectedSkillCard.recarga.segundos ?? 0) > 0;

                return (
                  <View>
                    {/* BOTÃO ATIVAR */}

                    <Pressable
                      style={({ pressed }) => [
                        styles.activateSkillButton,

                        isOnCooldown && styles.activateSkillButtonDisabled,

                        pressed &&
                          !isOnCooldown &&
                          styles.activateSkillButtonPressed,
                      ]}
                      onPress={() => activateSkillCard(tier)}
                      disabled={isOnCooldown || activatingSkillCard}
                    >
                      <Text
                        style={[
                          styles.activateSkillButtonText,

                          isOnCooldown &&
                            styles.activateSkillButtonTextDisabled,
                        ]}
                      >
                        {isOnCooldown
                          ? "EM RECARGA"
                          : activatingSkillCard
                            ? "ATIVANDO..."
                            : selectedSkillCard?.imagem === "hardenedSkin"
                              ? "PASSAR CENA"
                              : "ATIVAR HABILIDADE"}
                      </Text>
                    </Pressable>

                    {/* CONTADOR */}

                    {hasCooldown && isOnCooldown && (
                      <View style={styles.modalCooldown}>
                        <Text style={styles.modalCooldownLabel}>RECARGA</Text>

                        <Text style={styles.modalCooldownValue}>
                          {formatCooldown(remainingSeconds)}
                        </Text>
                      </View>
                    )}

                    {/* SEM COOLDOWN */}

                    {!hasCooldown && (
                      <Text style={styles.modalNoCooldown}>SEM RECARGA</Text>
                    )}

                    {/* FECHAR */}

                    <Pressable
                      style={({ pressed }) => [
                        styles.modalCloseButton,

                        pressed && styles.modalCloseButtonPressed,
                      ]}
                      onPress={closeSkillCard}
                    >
                      <Text style={styles.modalCloseButtonText}>FECHAR</Text>
                    </Pressable>
                  </View>
                );
              })()}
          </Animated.View>
        </Animated.View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/*
 * ===========================================================
 * SECTION HEADER
 * ===========================================================
 */

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>◆</Text>

      <Text style={styles.sectionTitle}>{title}</Text>

      <View style={styles.sectionLine} />
    </View>
  );
}

/*
 * ===========================================================
 * STATE BOX
 * ===========================================================
 */

function StateBox({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.stateBox}>
      <Text style={styles.stateLabel}>{label}</Text>

      {children}
    </View>
  );
}

/*
 * ===========================================================
 * SKILL CARD
 * ===========================================================
 */

function SkillCard({
  card,
  onPress,
}: {
  card: SkillCardData;
  onPress: () => void;
}) {
  const image = card.imagem ? skillCardImages[card.imagem] : null;

  return (
    <Pressable onPress={onPress} style={styles.skillCard}>
      {image ? (
        <Image source={image} resizeMode="contain" style={styles.cardImage} />
      ) : (
        <View style={styles.cardPlaceholder}>
          <Text style={styles.cardPlaceholderText}>CARD</Text>
        </View>
      )}

      {card.imagem && (
        <Text style={styles.cardName}>{formatCardName(card.imagem)}</Text>
      )}
    </Pressable>
  );
}

/*
 * ===========================================================
 * ESTILOS
 * ===========================================================
 */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingTop: 50,
    paddingHorizontal: 14,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: 110,
  },

  loading: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    color: "#555",
    fontSize: 11,
    marginTop: 14,
  },

  /*
   * HEADER
   */

  header: {
    alignItems: "center",
  },

  system: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 8,
  },

  title: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: 6,
  },

  line: {
    width: "70%",
    height: 1,
    backgroundColor: "#333",
    marginTop: 12,
  },

  /*
   * IDENTIDADE
   */

  identity: {
    alignItems: "center",
    marginTop: 20,
  },

  photo: {
    width: 200,
    maxHeight: 275,
  },

  nameInput: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 10,
    paddingVertical: 0,
    minWidth: 180,
  },

  race: {
    color: "#666",
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 3,
  },

  /*
   * SEÇÕES
   */

  section: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#0b0b0b",
    padding: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    color: "#aaa",
    fontSize: 9,
    marginRight: 10,
  },

  sectionTitle: {
    color: "#aaa",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "600",
  },

  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#292929",
    marginLeft: 10,
  },

  /*
   * FICHA BÁSICA
   */

  stateGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  stateBox: {
    flex: 1,
    marginHorizontal: 3,
    minHeight: 85,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  stateLabel: {
    color: "#aaa",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  valueInput: {
    color: "#fff",
    fontSize: 19,
    textAlign: "center",
    minWidth: 28,
    padding: 0,
  },

  slash: {
    color: "#777",
    fontSize: 18,
    marginHorizontal: 2,
  },

  fixedValue: {
    color: "#aaa",
    fontSize: 19,
    minWidth: 28,
    textAlign: "center",
  },

  singleValueInput: {
    color: "#fff",
    fontSize: 21,
    textAlign: "center",
    padding: 0,
  },

  /*
   * ATRIBUTOS
   */

  attributesHeader: {
    marginTop: 22,
  },

  attributesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  attribute: {
    alignItems: "center",
    width: "15%",
  },

  attributeLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 7,
  },

  attributeInput: {
    color: "#fff",
    fontSize: 17,
    textAlign: "center",
    width: 38,
    padding: 0,
  },

  /*
   * RECURSOS
   */

  resourcesContainer: {
    marginTop: 12,
  },

  resourceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 42,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
  },

  resourceName: {
    flex: 1,
    color: "#aaa",
    fontSize: 11,
    letterSpacing: 1,
  },

  resourceValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  resourceInput: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    minWidth: 32,
    padding: 0,
  },

  resourceSlash: {
    color: "#555",
    fontSize: 15,
    marginHorizontal: 2,
  },

  resourceMax: {
    color: "#777",
    fontSize: 16,
    minWidth: 25,
    textAlign: "center",
  },

  /*
   * TEXTOS
   */

  textField: {
    color: "#fff",
    fontSize: 17,
    marginTop: 12,
    paddingVertical: 4,
  },

  largeTextField: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    minHeight: 80,
    marginTop: 12,
    textAlignVertical: "top",
    padding: 0,
  },

  /*
   * LISTAS
   */

  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 14,
  },

  listDot: {
    width: 5,
    height: 5,
    backgroundColor: "#777",
    marginTop: 5,
    marginRight: 10,
  },

  listText: {
    flex: 1,
    color: "#bbb",
    fontSize: 13,
    lineHeight: 19,
  },

  /*
   * SKILL CARDS
   */

  cardsContainer: {
    paddingTop: 15,
    paddingBottom: 4,
    paddingRight: 10,
  },

  skillCard: {
    width: 200,
    marginRight: 12,
    alignItems: "center",
    backgroundColor: "transparent",
  },

  cardImage: {
    width: 200,
    height: 280,
    backgroundColor: "transparent",
  },

  cardName: {
    width: 200,
    color: "#aaa",
    fontSize: 12,
    letterSpacing: 1,
    marginTop: 8,
    textAlign: "center",
  },

  cardPlaceholder: {
    width: 200,
    height: 280,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },

  cardPlaceholderText: {
    color: "#444",
    fontSize: 12,
    letterSpacing: 3,
  },

  /*
   * MODAL
   */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  skillCardModal: {
    width: "100%",
    maxHeight: "82%",
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#3a3a3a",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,

    shadowColor: "#000000",

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  modalSystem: {
    color: "#666666",
    fontSize: 9,
    letterSpacing: 2.5,
    fontWeight: "600",
  },

  modalHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#292929",
    marginLeft: 12,
  },

  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 2.5,
    textAlign: "center",
    marginTop: 22,
  },

  modalSeparator: {
    width: "100%",
    height: 1,
    backgroundColor: "#292929",
    marginTop: 18,
    marginBottom: 18,
  },

  modalScroll: {
    flexGrow: 0,
  },

  modalScrollContent: {
    paddingBottom: 4,
  },

  modalDescription: {
    color: "#c4c4c4",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "left",
  },

  /*
   * BOTÃO DE ATIVAÇÃO
   */

  activateSkillButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#777777",
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  activateSkillButtonPressed: {
    backgroundColor: "#181818",
    borderColor: "#ffffff",
  },

  activateSkillButtonDisabled: {
    backgroundColor: "#080808",
    borderColor: "#333333",
  },

  activateSkillButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
  },

  activateSkillButtonTextDisabled: {
    color: "#555555",
  },

  /*
   * COOLDOWN
   */

  modalCooldown: {
    alignItems: "center",
    marginTop: 14,
  },

  modalCooldownLabel: {
    color: "#555555",
    fontSize: 9,
    letterSpacing: 3,
  },

  modalCooldownValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 3,
  },

  modalNoCooldown: {
    color: "#444444",
    fontSize: 9,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 14,
  },

  /*
   * FECHAR MODAL
   */

  modalCloseButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#555555",
    backgroundColor: "#0b0b0b",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  modalCloseButtonPressed: {
    backgroundColor: "#181818",
    borderColor: "#ffffff",
  },

  modalCloseButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 3,
  },

  /*
   * INSPEÇÃO
   */

  inspectionItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 18,
    paddingHorizontal: 4,
  },

  inspectionIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  inspectionIconImage: {
    width: 38,
    height: 38,
  },

  inspectionIconFallback: {
    color: "#777",
    fontSize: 14,
  },

  inspectionText: {
    flex: 1,
    color: "#d0d0d0",
    fontSize: 14,
    lineHeight: 21,
    minHeight: 48,

    backgroundColor: "transparent",

    borderWidth: 0,
    borderBottomWidth: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,

    paddingHorizontal: 4,
    paddingVertical: 4,

    textAlignVertical: "center",

    
  },

  classValue: {
  color: "#fff",
  fontSize: 17,
  marginTop: 12,
  paddingVertical: 4,
},
});
