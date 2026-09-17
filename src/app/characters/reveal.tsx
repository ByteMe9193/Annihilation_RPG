import React, { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useLocalSearchParams } from "expo-router";

import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

import Svg, { Path } from "react-native-svg";

import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase/config";
import { updateCharacter } from "@/services/firebase/characters";

const { width } = Dimensions.get("window");

const characters = {
  Ciborgue: {
    photo: require("@/assets/characters/cyborg-photo.png"),
    race: "Ciborgue",
  },

  Tengu: {
    photo: require("@/assets/characters/tengu-photo.png"),
    race: "Tengu",
  },

  Elfo: {
    photo: require("@/assets/characters/elf-photo.png"),
    race: "Elfo",
  },

  Tiefling: {
    photo: require("@/assets/characters/tiefling-photo.png"),
    race: "Tiefling",
  },

  Draconata: {
    photo: require("@/assets/characters/dragonborn-photo.png"),
    race: "Draconata",
  },
};

const firebaseIds: Record<string, string> = {
  Ciborgue: "cyborg",
  Tengu: "tengu",
  Elfo: "elf",
  Tiefling: "tiefling",
  Draconata: "dragonborn",
};

function EditIcon({ size = 18 }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M3 17.25L3 21L6.75 21L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

export default function CharacterReveal() {
  const { character } = useLocalSearchParams<{
    character?: string;
  }>();

  const characterName = character ?? "Ciborgue";

  const data =
    characters[
      characterName as keyof typeof characters
    ] ?? characters.Ciborgue;

  const firebaseCharacterId =
    firebaseIds[characterName] ?? "cyborg";

  const [name, setName] = useState(data.race);

  const [vidaAtual, setVidaAtual] = useState("0");
  const [vidaMaxima, setVidaMaxima] = useState("0");

  const [evasao, setEvasao] = useState("0");

  const [instintoAtual, setInstintoAtual] = useState("0");

  const [estados, setEstados] = useState<
    Record<string, { atual: number; maximo?: number }>
  >({});

  const [attributes, setAttributes] = useState({
    FOR: "0",
    AGI: "0",
    DES: "0",
    VIG: "0",
    INT: "0",
    PRE: "0",
  });

  // ============================================================
  // SALVAR PERSONAGEM SELECIONADO
  // ============================================================

  useEffect(() => {
    AsyncStorage.setItem(
      "selectedCharacter",
      characterName,
    );
  }, [characterName]);

  // ============================================================
  // SINCRONIZAR PERSONAGEM COM FIREBASE EM TEMPO REAL
  // ============================================================

  useEffect(() => {
    if (!firebaseCharacterId) {
      return;
    }

    const characterRef = doc(
      db,
      "characters",
      firebaseCharacterId,
    );

    const unsubscribe = onSnapshot(
      characterRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.error(
            "❌ PERSONAGEM NÃO ENCONTRADO NO FIREBASE.",
          );
          return;
        }

        const firebaseData = snapshot.data();

        setName(
          firebaseData.nome ?? data.race,
        );

        setVidaAtual(
          String(firebaseData.vidaAtual ?? 0),
        );

        setVidaMaxima(
          String(firebaseData.vidaMaxima ?? 0),
        );

        setEvasao(
          String(firebaseData.evasao ?? 0),
        );

        setInstintoAtual(
          String(firebaseData.instintoAtual ?? 0),
        );

        setEstados(
          firebaseData.estados ?? {},
        );

        setAttributes({
          FOR: String(
            firebaseData.forca ?? 0,
          ),
          AGI: String(
            firebaseData.agilidade ?? 0,
          ),
          DES: String(
            firebaseData.destreza ?? 0,
          ),
          VIG: String(
            firebaseData.vigor ?? 0,
          ),
          INT: String(
            firebaseData.intelecto ?? 0,
          ),
          PRE: String(
            firebaseData.presenca ?? 0,
          ),
        });

        console.log(
          "🔥 FICHA SINCRONIZADA COM O FIREBASE:",
          firebaseData,
        );
      },
      (error) => {
        console.error(
          "❌ ERRO NA SINCRONIZAÇÃO COM O FIREBASE:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, [firebaseCharacterId, data.race]);

  // ============================================================
  // SALVAR CAMPO NO FIREBASE
  // ============================================================

  const saveField = async (
    field: string,
    value: string,
  ) => {
    try {
      const numericFields = [
        "vidaAtual",
        "vidaMaxima",
        "evasao",
        "instintoAtual",
        "forca",
        "agilidade",
        "destreza",
        "vigor",
        "intelecto",
        "presenca",
      ];

      const finalValue =
        numericFields.includes(field)
          ? Number(value)
          : value;

      await updateCharacter(
        firebaseCharacterId,
        {
          [field]: finalValue,
        },
      );

      console.log(
        `💾 ${field} salvo:`,
        finalValue,
      );
    } catch (error) {
      console.error(
        `❌ ERRO AO SALVAR ${field}:`,
        error,
      );
    }
  };

  // ============================================================
  // ATUALIZAR ATRIBUTO LOCALMENTE
  // ============================================================

  const updateAttribute = (
    attribute: keyof typeof attributes,
    value: string,
  ) => {
    setAttributes((current) => ({
      ...current,
      [attribute]: value,
    }));
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={
          styles.contentContainer
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* =====================================================
            CABEÇALHO
        ===================================================== */}

        <Animated.View
          entering={FadeIn.duration(800)}
          style={styles.header}
        >
          <Text style={styles.system}>
            SYSTEM ONLINE
          </Text>

          <Text style={styles.title}>
            IDENTIDADE
          </Text>

          <View style={styles.line} />
        </Animated.View>

        {/* =====================================================
            IDENTIDADE
        ===================================================== */}

        <Animated.View
          entering={FadeInDown.delay(300).duration(800)}
          style={styles.identity}
        >
          <Image
            source={data.photo}
            style={styles.photo}
            resizeMode="cover"
          />

          <View style={styles.nameRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={() =>
                saveField("nome", name)
              }
              style={styles.nameInput}
              placeholder="NOME"
              placeholderTextColor="#555"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.editButton}
              activeOpacity={0.7}
            >
              <EditIcon size={18} />
            </TouchableOpacity>
          </View>

          <Text style={styles.race}>
            {data.race.toUpperCase()}
          </Text>
        </Animated.View>

        {/* =====================================================
            FICHA
        ===================================================== */}

        <Animated.View
          entering={FadeInUp.delay(700).duration(900)}
          style={styles.sheet}
        >
          {/* =================================================
              ESTADO
          ================================================= */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>
              ◉
            </Text>

            <Text style={styles.sectionTitle}>
              ESTADO
            </Text>

            <View style={styles.sectionLine} />
          </View>

          <View style={styles.stateGrid}>
            {/* =================================================
                VIDA
            ================================================= */}

            <View
              style={[
                styles.stateBox,
                (estados.armadura ||
                  estados.escudo) &&
                  styles.stateBoxFour,
              ]}
            >
              <Text style={styles.stateLabel}>
                VIDA
              </Text>

              <View style={styles.valueRow}>
                <TextInput
                  value={vidaAtual}
                  onChangeText={setVidaAtual}
                  onBlur={() =>
                    saveField(
                      "vidaAtual",
                      vidaAtual,
                    )
                  }
                  keyboardType="numeric"
                  style={styles.valueInput}
                />

                <Text style={styles.slash}>
                  /
                </Text>

                <TextInput
                  value={vidaMaxima}
                  onChangeText={setVidaMaxima}
                  onBlur={() =>
                    saveField(
                      "vidaMaxima",
                      vidaMaxima,
                    )
                  }
                  keyboardType="numeric"
                  style={styles.valueInput}
                />
              </View>
            </View>

            {/* =================================================
                ARMADURA
            ================================================= */}

            {estados.armadura && (
              <View
                style={[
                  styles.stateBox,
                  styles.stateBoxFour,
                ]}
              >
                <Text style={styles.stateLabel}>
                  ARMADURA
                </Text>

                <View style={styles.valueRow}>
                  <TextInput
                    value={String(
                      estados.armadura.atual ??
                        0,
                    )}
                    onChangeText={(value) => {
                      const numeric =
                        Number(value);

                      const maximo =
                        estados.armadura?.maximo;

                      if (
                        value === "" ||
                        !Number.isNaN(numeric)
                      ) {
                        const safeValue =
                          value === ""
                            ? 0
                            : Math.max(
                                0,
                                maximo !==
                                  undefined
                                  ? Math.min(
                                      numeric,
                                      maximo,
                                    )
                                  : numeric,
                              );

                        setEstados(
                          (current) => ({
                            ...current,
                            armadura: {
                              ...current.armadura,
                              atual: safeValue,
                            },
                          }),
                        );
                      }
                    }}
                    onBlur={() =>
                      saveField(
                        "estados",
                        JSON.stringify(
                          estados,
                        ),
                      )
                    }
                    keyboardType="numeric"
                    style={styles.valueInput}
                  />

                  {estados.armadura.maximo !==
                    undefined && (
                    <>
                      <Text
                        style={styles.slash}
                      >
                        /
                      </Text>

                      <Text
                        style={
                          styles.fixedValue
                        }
                      >
                        {
                          estados.armadura
                            .maximo
                        }
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* =================================================
                ESCUDO
            ================================================= */}

            {estados.escudo && (
              <View
                style={[
                  styles.stateBox,
                  styles.stateBoxFour,
                ]}
              >
                <Text style={styles.stateLabel}>
                  ESCUDO
                </Text>

                <View style={styles.valueRow}>
                  <TextInput
                    value={String(
                      estados.escudo.atual ??
                        0,
                    )}
                    onChangeText={(value) => {
                      const numeric =
                        Number(value);

                      const maximo =
                        estados.escudo?.maximo;

                      if (
                        value === "" ||
                        !Number.isNaN(numeric)
                      ) {
                        const safeValue =
                          value === ""
                            ? 0
                            : Math.max(
                                0,
                                maximo !==
                                  undefined
                                  ? Math.min(
                                      numeric,
                                      maximo,
                                    )
                                  : numeric,
                              );

                        setEstados(
                          (current) => ({
                            ...current,
                            escudo: {
                              ...current.escudo,
                              atual: safeValue,
                            },
                          }),
                        );
                      }
                    }}
                    onBlur={() =>
                      saveField(
                        "estados",
                        JSON.stringify(
                          estados,
                        ),
                      )
                    }
                    keyboardType="numeric"
                    style={styles.valueInput}
                  />

                  {estados.escudo.maximo !==
                    undefined && (
                    <>
                      <Text
                        style={styles.slash}
                      >
                        /
                      </Text>

                      <Text
                        style={
                          styles.fixedValue
                        }
                      >
                        {
                          estados.escudo.maximo
                        }
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* =================================================
                EVASÃO
            ================================================= */}

            <View
              style={[
                styles.stateBox,
                (estados.armadura ||
                  estados.escudo) &&
                  styles.stateBoxFour,
              ]}
            >
              <Text style={styles.stateLabel}>
                EVASÃO
              </Text>

              <TextInput
                value={evasao}
                onChangeText={setEvasao}
                onBlur={() =>
                  saveField(
                    "evasao",
                    evasao,
                  )
                }
                keyboardType="numeric"
                selectTextOnFocus
                style={
                  styles.singleValueInput
                }
              />
            </View>

            {/* =================================================
                INSTINTO
            ================================================= */}

            <View
              style={[
                styles.stateBox,
                (estados.armadura ||
                  estados.escudo) &&
                  styles.stateBoxFour,
              ]}
            >
              <Text style={styles.stateLabel}>
                INSTINTO
              </Text>

              <View style={styles.valueRow}>
                <TextInput
                  value={instintoAtual}
                  onChangeText={(value) => {
                    const numeric =
                      Number(value);

                    if (
                      value === "" ||
                      numeric <= 10
                    ) {
                      setInstintoAtual(
                        value,
                      );
                    }
                  }}
                  onBlur={() =>
                    saveField(
                      "instintoAtual",
                      instintoAtual,
                    )
                  }
                  keyboardType="numeric"
                  style={styles.valueInput}
                />

                <Text style={styles.slash}>
                  /
                </Text>

                <Text
                  style={styles.fixedValue}
                >
                  10
                </Text>
              </View>
            </View>
          </View>

          {/* =================================================
              ATRIBUTOS
          ================================================= */}

          <View
            style={[
              styles.sectionHeader,
              styles.attributesHeader,
            ]}
          >
            <Text style={styles.sectionIcon}>
              ▥
            </Text>

            <Text style={styles.sectionTitle}>
              ATRIBUTOS
            </Text>

            <View style={styles.sectionLine} />
          </View>

          <View style={styles.attributesGrid}>
            {(
              Object.keys(attributes) as Array<
                keyof typeof attributes
              >
            ).map((attribute) => (
              <View
                style={styles.attribute}
                key={attribute}
              >
                <Text
                  style={
                    styles.attributeLabel
                  }
                >
                  {attribute}
                </Text>

                <TextInput
                  value={
                    attributes[attribute]
                  }
                  onChangeText={(value) =>
                    updateAttribute(
                      attribute,
                      value,
                    )
                  }
                  onBlur={() => {
                    const fieldMap = {
                      FOR: "forca",
                      AGI: "agilidade",
                      DES: "destreza",
                      VIG: "vigor",
                      INT: "intelecto",
                      PRE: "presenca",
                    } as const;

                    saveField(
                      fieldMap[attribute],
                      attributes[
                        attribute
                      ],
                    );
                  }}
                  keyboardType="numeric"
                  style={
                    styles.attributeInput
                  }
                />
              </View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

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
    width: width * 0.7,
    height: 1,
    backgroundColor: "#333",
    marginTop: 12,
  },

  identity: {
    alignItems: "center",
    marginTop: 20,
  },

  photo: {
    width: 200,
    maxHeight: 275,
  },

  nameRow: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  nameInput: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 0,
    paddingVertical: 0,
    minWidth: 180,
  },

  editButton: {
    position: "absolute",
    marginLeft: 220,
    padding: 4,
  },

  race: {
    color: "#666",
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 3,
  },

  sheet: {
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
    fontSize: 12,
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

  stateGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  stateBox: {
    width: "31.5%",
    minHeight: 85,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  stateBoxFour: {
    width: "23.5%",
  },

  stateLabel: {
    color: "#aaa",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },

  resourceValue: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "700",
    textAlign: "center",
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
});