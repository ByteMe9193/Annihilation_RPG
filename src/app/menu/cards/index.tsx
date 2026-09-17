import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/services/firebase/config";
import { updateCharacter } from "@/services/firebase/characters";

type SkillCardEffect = {
  tipo: string;
  campo: string;
  valor: number;
  maximo?: number;
};

type SkillCardRecarga = {
  habilitada: boolean;
  segundos: number | null;
};

type SkillCard = {
  id: string;
  nome: string;
  descricao: string;
  imagem: string;
  personagem: string;
  tier: number;
  efeitos?: SkillCardEffect[];
  recarga?: SkillCardRecarga;
};

type TierKey = "tier1" | "tier2" | "tier3";

type SelectedCards = {
  tier1: SkillCard | null;
  tier2: SkillCard | null;
  tier3: SkillCard | null;
};

type UnlockedTiers = {
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
};

type Cooldowns = {
  tier1: number | null;
  tier2: number | null;
  tier3: number | null;
};

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
  fledgling: require("@/assets/skillCards/fledgling.png"),
  gloryOfWar: require("@/assets/skillCards/gloryOfWar.png"),
  hardenedSkin: require("@/assets/skillCards/hardenedSkin.png"),
  holographicChip: require("@/assets/skillCards/holographicChip.png"),
  incantation: require("@/assets/skillCards/incantation.png"),
  lightBow: require("@/assets/skillCards/lightBow.png"),
  malware: require("@/assets/skillCards/malware.png"),
  mimicry: require("@/assets/skillCards/mimicry.png"),
  necrobioticCuirass: require("@/assets/skillCards/necrobioticCuirass.png"),
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
};

const firebaseIds: Record<string, string> = {
  Ciborgue: "cyborg",
  Tengu: "tengu",
  Elfo: "elf",
  Tiefling: "tiefling",
  Draconata: "dragonborn",
};

const tierTitles: Record<TierKey, string> = {
  tier1: "TIER 1",
  tier2: "TIER 2",
  tier3: "TIER 3",
};

export default function CardsScreen() {
  const { width } = useWindowDimensions();

  const [character, setCharacter] = useState<string | null>(null);

  const [cards, setCards] = useState<Record<TierKey, SkillCard[]>>({
    tier1: [],
    tier2: [],
    tier3: [],
  });

  const [chosenCards, setChosenCards] = useState<SelectedCards>({
    tier1: null,
    tier2: null,
    tier3: null,
  });

  const [unlockedTiers, setUnlockedTiers] = useState<UnlockedTiers>({
    tier1: false,
    tier2: false,
    tier3: false,
  });

  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const [cooldowns, setCooldowns] = useState<Cooldowns>({
    tier1: null,
    tier2: null,
    tier3: null,
  });

  const [now, setNow] = useState(Date.now());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  /*
   * Mantém a interface atualizada enquanto houver
   * alguma habilidade em recarga.
   */
  useEffect(() => {
    const hasCooldown = Object.values(cooldowns).some(
      (value) => value !== null && value > Date.now(),
    );

    if (!hasCooldown) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldowns]);

  function formatCardName(name: string) {
    if (name === "downToAFineArt") {
      return "DOWN TO A FINE ART";
    }

    return name.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase();
  }

  function getCardImage(imageName: string) {
    return skillCardImages[imageName];
  }

  function getRemainingSeconds(tier: TierKey) {
    const cooldownEnd = cooldowns[tier];

    if (!cooldownEnd) {
      return 0;
    }

    return Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
  }

  function formatCooldown(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  async function loadCards() {
    try {
      setLoading(true);
      setError(null);

      const selectedCharacter = await AsyncStorage.getItem("selectedCharacter");

      if (!selectedCharacter) {
        setError("Nenhum personagem selecionado.");
        return;
      }

      setCharacter(selectedCharacter);

      const characterId = firebaseIds[selectedCharacter];

      if (!characterId) {
        setError("Personagem não configurado.");
        return;
      }

      const characterRef = await getDoc(doc(db, "characters", characterId));

      if (!characterRef.exists()) {
        setError("Personagem não encontrado.");
        return;
      }

      const characterData = characterRef.data();

      /*
       * =====================================================
       * TIERS LIBERADOS
       * =====================================================
       *
       * Tier 1 é controlado pelo Firebase também.
       *
       * Não existe fallback para true.
       *
       * Se estiver false, não aparece absolutamente nada
       * daquele Tier.
       */

      const firebaseTiers = characterData.skillCardTiers ?? {};

      const loadedUnlockedTiers: UnlockedTiers = {
        tier1: firebaseTiers.tier1 === true,
        tier2: firebaseTiers.tier2 === true,
        tier3: firebaseTiers.tier3 === true,
      };

      setUnlockedTiers(loadedUnlockedTiers);

      /*
       * =====================================================
       * CARTAS ESCOLHIDAS
       * =====================================================
       */

      const selectedCardIds = {
        tier1: characterData.skillCards?.tier1 ?? null,
        tier2: characterData.skillCards?.tier2 ?? null,
        tier3: characterData.skillCards?.tier3 ?? null,
      };

      const loadedChosenCards: SelectedCards = {
        tier1: null,
        tier2: null,
        tier3: null,
      };

      for (const tier of ["tier1", "tier2", "tier3"] as TierKey[]) {
        const cardId = selectedCardIds[tier];

        if (!cardId) {
          continue;
        }

        const selectedCardRef = await getDoc(doc(db, "skillCards", cardId));

        if (selectedCardRef.exists()) {
          loadedChosenCards[tier] = {
            id: selectedCardRef.id,
            ...(selectedCardRef.data() as Omit<SkillCard, "id">),
          };
        }
      }

      setChosenCards(loadedChosenCards);

      /*
       * =====================================================
       * COOLDOWNS
       * =====================================================
       */

      const savedCooldowns = characterData.skillCardCooldowns ?? {};

      setCooldowns({
        tier1: savedCooldowns.tier1 ?? null,
        tier2: savedCooldowns.tier2 ?? null,
        tier3: savedCooldowns.tier3 ?? null,
      });

      /*
       * =====================================================
       * RECURSOS DE CARTAS PASSIVAS
       * =====================================================
       *
       * Se uma carta já estiver escolhida e possuir um efeito
       * de recurso, garantimos que o recurso exista no personagem.
       * Isso também corrige personagens que escolheram a carta
       * antes da estrutura { atual, maximo } ser implementada.
       */

      const currentResources = characterData.recursos ?? {};
      const repairedResources = { ...currentResources };
      let resourcesNeedRepair = false;

      for (const tier of ["tier1", "tier2", "tier3"] as TierKey[]) {
        const chosenCard = loadedChosenCards[tier];

        if (!chosenCard) {
          continue;
        }

        for (const effect of chosenCard.efeitos ?? []) {
          if (effect.tipo !== "recurso") {
            continue;
          }

          const existing = repairedResources[effect.campo];

          if (existing === undefined) {
            repairedResources[effect.campo] = {
              atual: effect.valor,
              ...(effect.maximo !== undefined ? { maximo: effect.maximo } : {}),
            };
            resourcesNeedRepair = true;
          } else if (typeof existing !== "object" || existing === null) {
            repairedResources[effect.campo] = {
              atual: Number(existing) || effect.valor,
              ...(effect.maximo !== undefined ? { maximo: effect.maximo } : {}),
            };
            resourcesNeedRepair = true;
          }
        }
      }

      if (resourcesNeedRepair) {
        await updateCharacter(characterId, {
          recursos: repairedResources,
        });
      }

      /*
       * =====================================================
       * CARTAS DISPONÍVEIS
       * =====================================================
       */

      const loadedCards: Record<TierKey, SkillCard[]> = {
        tier1: [],
        tier2: [],
        tier3: [],
      };

      for (const tierNumber of [1, 2, 3]) {
        const tierKey = `tier${tierNumber}` as TierKey;

        /*
         * Tier bloqueado = não carrega nada.
         */

        if (!loadedUnlockedTiers[tierKey]) {
          continue;
        }

        /*
         * Se já existe carta escolhida nesse Tier,
         * não mostramos a seleção novamente.
         */

        if (selectedCardIds[tierKey]) {
          continue;
        }

        const cardsQuery = query(
          collection(db, "skillCards"),
          where("personagem", "==", selectedCharacter),
          where("tier", "==", tierNumber),
        );

        const snapshot = await getDocs(cardsQuery);

        loadedCards[tierKey] = snapshot.docs.map((cardDoc) => ({
          id: cardDoc.id,
          ...(cardDoc.data() as Omit<SkillCard, "id">),
        }));
      }

      setCards(loadedCards);
    } catch (err) {
      console.error("ERRO AO CARREGAR CARTAS:", err);

      setError("Não foi possível carregar as cartas.");
    } finally {
      setLoading(false);
    }
  }

  function toggleCard(cardId: string) {
    if (saving) {
      return;
    }

    setSelectedCard((current) => (current === cardId ? null : cardId));
  }

  async function chooseCard(card: SkillCard, tier: TierKey) {
    if (!character || saving || chosenCards[tier]) {
      return;
    }

    const characterId = firebaseIds[character];

    if (!characterId) {
      return;
    }

    try {
      setSaving(true);

      /*
       * =====================================================
       * CARREGA O PERSONAGEM
       * =====================================================
       */

      const characterRef = await getDoc(doc(db, "characters", characterId));

      if (!characterRef.exists()) {
        return;
      }

      const characterData = characterRef.data();

      /*
       * =====================================================
       * ATUALIZAÇÕES
       * =====================================================
       */

      const updates: Record<string, any> = {};

      /*
       * =====================================================
       * SALVA A CARTA ESCOLHIDA
       * =====================================================
       */

      updates[`skillCards.${tier}`] = card.id;

      /*
       * =====================================================
       * ESTADOS
       * =====================================================
       *
       * Estados de Armadura/Escudo são criados
       * AUTOMATICAMENTE quando a carta é escolhida.
       *
       * Isso faz com que o Reveal e a Ficha já mostrem:
       *
       * ARMADURA 10/10
       * ou
       * ESCUDO 10/10
       *
       * imediatamente após a escolha.
       */

      const currentStates = characterData.estados ?? {};

      const updatedStates = {
        ...currentStates,
      };

      let statesChanged = false;

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "estado") {
          continue;
        }

        /*
         * PELE ENDURECIDA
         *
         * Cria ARMADURA 10/10.
         */

        if (effect.campo === "armadura") {
          if (updatedStates.armadura === undefined) {
            updatedStates.armadura = {
              atual: effect.valor,
              maximo: effect.maximo ?? 10,
            };

            statesChanged = true;
          }
        }

        /*
         * COURAÇA NECROBIÓTICA
         *
         * Cria ESCUDO 10/10.
         */

        if (effect.campo === "escudo") {
          if (updatedStates.escudo === undefined) {
            updatedStates.escudo = {
              atual: effect.valor,
              maximo: effect.maximo ?? 10,
            };

            statesChanged = true;
          }
        }
      }

      if (statesChanged) {
        updates.estados = updatedStates;
      }

      /*
       * =====================================================
       * RECURSOS
       * =====================================================
       *
       * Continua funcionando para Rancor,
       * Flechas de Luz, Energia etc.
       */

      const currentResources = characterData.recursos ?? {};

      const updatedResources = {
        ...currentResources,
      };

      let resourcesChanged = false;

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "recurso") {
          continue;
        }

        if (updatedResources[effect.campo] === undefined) {
          updatedResources[effect.campo] = {
            atual: effect.valor,
            ...(effect.maximo !== undefined
              ? {
                  maximo: effect.maximo,
                }
              : {}),
          };

          resourcesChanged = true;
        }
      }

      if (resourcesChanged) {
        updates.recursos = updatedResources;
      }

      /*
       * =====================================================
       * SALVA TUDO
       * =====================================================
       */

      await updateCharacter(characterId, updates);

      /*
       * =====================================================
       * ATUALIZA A INTERFACE
       * =====================================================
       */

      setChosenCards((current) => ({
        ...current,
        [tier]: card,
      }));

      setCards((current) => ({
        ...current,
        [tier]: [],
      }));

      setSelectedCard(null);
    } catch (err) {
      console.error("ERRO AO SALVAR CARTA:", err);

      setError("Não foi possível salvar sua escolha.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * ATIVAÇÃO DA HABILIDADE
   * =========================================================
   */

  async function activateCard(card: SkillCard, tier: TierKey) {
    if (!character || saving) {
      return;
    }

    const remainingSeconds = getRemainingSeconds(tier);

    if (remainingSeconds > 0) {
      return;
    }

    const characterId = firebaseIds[character];

    if (!characterId) {
      return;
    }

    try {
      setSaving(true);

      const characterRef = await getDoc(doc(db, "characters", characterId));

      if (!characterRef.exists()) {
        return;
      }

      const characterData = characterRef.data();

      const updates: Record<string, any> = {};

      /*
       * =====================================================
       * ESTADOS ATUAIS
       * =====================================================
       */

      const currentStates = characterData.estados ?? {};

      const updatedStates = {
        ...currentStates,
      };

      let statesChanged = false;

      /*
       * =====================================================
       * PELE ENDURECIDA
       * =====================================================
       *
       * Primeira ativação:
       * ARMADURA 10/10
       *
       * Ativações seguintes:
       * +2 ARMADURA
       *
       * Máximo: 10
       */

      if (card.imagem === "hardenedSkin") {
        const currentArmor = updatedStates.armadura;

        const currentValue = currentArmor?.atual ?? 0;

        const maximo = currentArmor?.maximo ?? 10;

        const newValue =
          currentArmor === undefined ? 10 : Math.min(currentValue + 2, maximo);

        updatedStates.armadura = {
          atual: newValue,
          maximo: maximo,
        };

        statesChanged = true;
      }

      /*
       * =====================================================
       * COURAÇA NECROBIÓTICA
       * =====================================================
       *
       * Primeira ativação:
       * ESCUDO 10/10
       *
       * Ativações seguintes:
       * +3 ESCUDO
       *
       * Máximo: 10
       */

      if (card.imagem === "necrobioticCuirass") {
        const currentShield = updatedStates.escudo;

        const currentValue = currentShield?.atual ?? 0;

        const maximo = currentShield?.maximo ?? 10;

        const newValue =
          currentShield === undefined ? 10 : Math.min(currentValue + 3, maximo);

        updatedStates.escudo = {
          atual: newValue,
          maximo: maximo,
        };

        statesChanged = true;
      }

      /*
       * =====================================================
       * OUTROS EFEITOS DE ESTADO
       * =====================================================
       *
       * Mantém o sistema genérico para futuras cartas
       * que utilizem outros estados.
       */

      for (const effect of card.efeitos ?? []) {
        if (
          effect.tipo === "estado" &&
          effect.campo !== "armadura" &&
          effect.campo !== "escudo"
        ) {
          const existingState = updatedStates[effect.campo];

          const currentValue = existingState?.atual ?? 0;

          let newValue =
            existingState === undefined
              ? effect.valor
              : currentValue + effect.valor;

          if (effect.maximo !== undefined) {
            newValue = Math.min(newValue, effect.maximo);
          }

          updatedStates[effect.campo] = {
            atual: Math.max(0, newValue),
            ...(effect.maximo !== undefined
              ? {
                  maximo: effect.maximo,
                }
              : {}),
          };

          statesChanged = true;
        }
      }

      /*
       * =====================================================
       * RECURSOS
       * =====================================================
       */

      const currentResources = characterData.recursos ?? {};

      const updatedResources = {
        ...currentResources,
      };

      let resourcesChanged = false;

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "recurso") {
          continue;
        }

        const existing = updatedResources[effect.campo];

        const currentValue = existing?.atual ?? effect.valor;

        let newValue = currentValue + effect.valor;

        if (effect.maximo !== undefined) {
          newValue = Math.min(newValue, effect.maximo);
        }

        newValue = Math.max(0, newValue);

        updatedResources[effect.campo] = {
          atual: newValue,
          ...(effect.maximo !== undefined
            ? {
                maximo: effect.maximo,
              }
            : existing?.maximo !== undefined
              ? {
                  maximo: existing.maximo,
                }
              : {}),
        };

        resourcesChanged = true;
      }

      /*
       * =====================================================
       * ATRIBUTOS
       * =====================================================
       */

      for (const effect of card.efeitos ?? []) {
        if (effect.tipo !== "atributo") {
          continue;
        }

        const currentValue = characterData[effect.campo] ?? 0;

        updates[effect.campo] = currentValue + effect.valor;
      }

      /*
       * =====================================================
       * SALVA ESTADOS
       * =====================================================
       */

      if (statesChanged) {
        updates.estados = updatedStates;
      }

      /*
       * =====================================================
       * SALVA RECURSOS
       * =====================================================
       */

      if (resourcesChanged) {
        updates.recursos = updatedResources;
      }

      /*
       * =====================================================
       * COOLDOWN
       * =====================================================
       */

      let cooldownEnd: number | null = null;

      if (
        card.recarga?.habilitada &&
        card.recarga.segundos &&
        card.recarga.segundos > 0
      ) {
        cooldownEnd = Date.now() + card.recarga.segundos * 1000;

        updates[`skillCardCooldowns.${tier}`] = cooldownEnd;
      } else {
        updates[`skillCardCooldowns.${tier}`] = null;
      }

      /*
       * =====================================================
       * SALVA TUDO NO FIREBASE
       * =====================================================
       */

      console.log("💾 ATUALIZAÇÃO DA HABILIDADE:", {
        card: card.imagem,
        states: updates.estados,
        resources: updates.recursos,
      });

      await updateCharacter(characterId, updates);

      /*
       * Atualiza cooldown localmente.
       */

      setCooldowns((current) => ({
        ...current,
        [tier]: cooldownEnd,
      }));

      setNow(Date.now());
    } catch (err) {
      console.error("❌ ERRO AO ATIVAR CARTA:", err);

      setError("Não foi possível ativar a habilidade.");
    } finally {
      setSaving(false);
    }
  }

  /*
   * =========================================================
   * RENDERIZA CARTA ESCOLHIDA
   * =========================================================
   */

  function renderChosenCard(card: SkillCard, tier: TierKey) {
    const remainingSeconds = getRemainingSeconds(tier);

    const isOnCooldown = remainingSeconds > 0;

    const hasCooldown =
      card.recarga?.habilitada === true && (card.recarga.segundos ?? 0) > 0;

    const stateEffect = (card.efeitos ?? []).find(
      (effect) =>
        effect.tipo === "estado" &&
        (effect.campo === "armadura" || effect.campo === "escudo"),
    );

    const isSceneRecovery = !!stateEffect;

    const sceneRecoveryText = stateEffect
      ? stateEffect.campo === "armadura"
        ? "RECUPERA +2 ARMADURA POR CENA • MÁX. 10"
        : "RECUPERA +3 ESCUDO POR CENA • MÁX. 10"
      : null;

    return (
      <View key={tier} style={styles.activeCardSection}>
        <Text style={styles.subtitle}>{tierTitles[tier]}</Text>

        <View style={styles.activeCard}>
          <View style={styles.activeCardHeader}>
            <Text style={styles.activeCardTitle}>
              {formatCardName(card.imagem)}
            </Text>
          </View>

          <View style={styles.activeCardBody}>
            {getCardImage(card.imagem) ? (
              <Image
                source={getCardImage(card.imagem)}
                style={styles.activeCardImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.imagePlaceholderSmall}>
                <Text style={styles.placeholderText}>
                  IMAGEM NÃO ENCONTRADA
                </Text>
              </View>
            )}

            <View style={styles.activeCardInfo}>
              <Text style={styles.activeCardDescription}>{card.descricao}</Text>

              <Pressable
                style={({ pressed }) => [
                  styles.activateButton,
                  isOnCooldown && styles.activateButtonDisabled,
                  pressed && !isOnCooldown && styles.activateButtonPressed,
                ]}
                onPress={() => activateCard(card, tier)}
                disabled={saving || isOnCooldown}
              >
                <Text
                  style={[
                    styles.activateButtonText,
                    isOnCooldown && styles.activateButtonTextDisabled,
                  ]}
                >
                  {isOnCooldown
                    ? "EM RECARGA"
                    : saving
                      ? "PROCESSANDO..."
                      : isSceneRecovery
                        ? "PASSAR CENA"
                        : "ATIVAR HABILIDADE"}
                </Text>
              </Pressable>

              {hasCooldown && isOnCooldown && (
                <View style={styles.cooldownContainer}>
                  <Text style={styles.cooldownLabel}>RECARGA</Text>

                  <Text style={styles.cooldownValue}>
                    {formatCooldown(remainingSeconds)}
                  </Text>
                </View>
              )}

              {isSceneRecovery ? (
                <Text style={styles.noCooldownText}>{sceneRecoveryText}</Text>
              ) : !hasCooldown ? (
                <Text style={styles.noCooldownText}>SEM RECARGA</Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }

  /*
   * =========================================================
   * RENDERIZA SELEÇÃO
   * =========================================================
   */

  function renderTierSelection(tier: TierKey) {
    /*
     * Tier falso = absolutamente nada.
     */

    if (!unlockedTiers[tier]) {
      return null;
    }

    /*
     * Carta já escolhida = painel de ativação.
     */

    if (chosenCards[tier]) {
      return renderChosenCard(chosenCards[tier]!, tier);
    }

    const tierCards = cards[tier];

    /*
     * Tier liberado mas sem cartas.
     */

    if (tierCards.length === 0) {
      return (
        <View key={tier} style={styles.emptyTierContainer}>
          <Text style={styles.subtitle}>{tierTitles[tier]}</Text>

          <Text style={styles.emptyText}>NENHUMA CARTA DISPONÍVEL</Text>
        </View>
      );
    }

    /*
     * Seleção de cartas.
     */

    return (
      <View key={tier} style={styles.selectionSection}>
        <Text style={styles.subtitle}>{tierTitles[tier]}</Text>

        <Text style={styles.instruction}>
          Escolha uma das duas cartas disponíveis.
        </Text>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="center"
          nestedScrollEnabled
        >
          {tierCards.map((item) => (
            <View
              key={item.id}
              style={[
                styles.cardPage,
                {
                  width: width - 40,
                },
              ]}
            >
              <Pressable onPress={() => toggleCard(item.id)} disabled={saving}>
                {getCardImage(item.imagem) ? (
                  <Image
                    source={getCardImage(item.imagem)}
                    style={styles.skillCardImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.placeholderText}>
                      IMAGEM NÃO ENCONTRADA
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text style={styles.cardName}>{formatCardName(item.imagem)}</Text>

              {selectedCard === item.id && (
                <View style={styles.descriptionContainer}>
                  <View style={styles.separator} />

                  <Text style={styles.descriptionLabel}>DESCRIÇÃO</Text>

                  <Text style={styles.description}>{item.descricao}</Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.chooseButton,
                      pressed && styles.chooseButtonPressed,
                    ]}
                    onPress={() => chooseCard(item, tier)}
                    disabled={saving}
                  >
                    <Text style={styles.chooseButtonText}>
                      {saving ? "SALVANDO..." : "SELECIONAR HABILIDADE"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
   */

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />

        <Text style={styles.loadingText}>CARREGANDO CARTAS...</Text>
      </View>
    );
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  /*
   * =========================================================
   * TELA
   * =========================================================
   */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pageContent}
      >
        <Text style={styles.title}>CARTAS</Text>

        {renderTierSelection("tier1")}
        {renderTierSelection("tier2")}
        {renderTierSelection("tier3")}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  pageContent: {
    paddingBottom: 110,
  },

  title: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 15,
  },

  subtitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 10,
  },

  instruction: {
    color: "#777777",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 25,
  },

  selectionSection: {
    marginBottom: 55,
  },

  activeCardSection: {
    marginBottom: 55,
  },

  emptyTierContainer: {
    alignItems: "center",
    marginBottom: 45,
    paddingVertical: 30,
  },

  emptyText: {
    color: "#444444",
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 20,
  },

  cardPage: {
    alignItems: "center",
    paddingHorizontal: 20,
  },

  skillCardImage: {
    width: 300,
    height: 420,
  },

  cardName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 12,
  },

  descriptionContainer: {
    width: "100%",
    paddingHorizontal: 5,
    marginTop: 20,
    alignItems: "center",
  },

  separator: {
    width: "100%",
    height: 1,
    backgroundColor: "#292929",
    marginBottom: 18,
  },

  descriptionLabel: {
    color: "#666666",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
    marginBottom: 10,
  },

  description: {
    color: "#cccccc",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },

  chooseButton: {
    width: "100%",
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#777777",
    backgroundColor: "#090909",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
    marginBottom: 10,
    paddingHorizontal: 15,
  },

  chooseButtonPressed: {
    backgroundColor: "#161616",
    borderColor: "#ffffff",
  },

  chooseButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },

  /*
   * =====================================================
   * CARTA ATIVA
   * =====================================================
   */

  activeCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#333333",
    backgroundColor: "#090909",
    marginTop: 20,
    overflow: "hidden",
  },

  activeCardHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#292929",
    paddingVertical: 14,
    paddingHorizontal: 15,
  },

  activeCardTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 2,
    textAlign: "center",
  },

  activeCardBody: {
    flexDirection: "column",
    padding: 15,
    alignItems: "center",
  },

  activeCardImage: {
    width: 220,
    height: 315,
    marginBottom: 20,
  },

  activeCardInfo: {
    width: "100%",
    alignItems: "center",
  },

  activeCardDescription: {
    width: "100%",
    color: "#aaaaaa",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  activateButton: {
    width: "100%",
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#777777",
    backgroundColor: "#101010",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 10,
  },

  activateButtonPressed: {
    backgroundColor: "#1a1a1a",
    borderColor: "#ffffff",
  },

  activateButtonDisabled: {
    borderColor: "#333333",
    backgroundColor: "#080808",
  },

  activateButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  activateButtonTextDisabled: {
    color: "#555555",
  },

  cooldownContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 14,
  },

  cooldownLabel: {
    color: "#555555",
    fontSize: 8,
    letterSpacing: 2,
  },

  cooldownValue: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 3,
  },

  noCooldownText: {
    width: "100%",
    color: "#444444",
    fontSize: 8,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 12,
  },

  /*
   * =====================================================
   * CARTA ESCOLHIDA / PLACEHOLDER
   * =====================================================
   */

  imagePlaceholder: {
    width: 300,
    height: 420,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  imagePlaceholderSmall: {
    width: 115,
    height: 165,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    color: "#555555",
    fontSize: 9,
    textAlign: "center",
  },

  loadingText: {
    color: "#777777",
    textAlign: "center",
    marginTop: 15,
    fontSize: 11,
    letterSpacing: 2,
  },

  errorText: {
    color: "#ffffff",
    textAlign: "center",
    marginTop: 50,
    fontSize: 14,
  },
});
