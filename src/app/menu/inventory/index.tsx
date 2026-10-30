import { useAppTheme } from "@/theme/AppTheme";
import { useThemedStyles } from "@/theme/useThemedStyles";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/services/firebase/config";

type InventoryCategory =
  | "acessorio"
  | "arma"
  | "artefato"
  | "cartao"
  | "chave"
  | "comida"
  | "diversos"
  | "documento"
  | "eletronico"
  | "ferramenta"
  | "material"
  | "medicamento"
  | "missao"
  | "municao"
  | "organica"
  | "radio"
  | "roupa";

type InventoryItem = {
  id: string;
  nome: string;
  categoria: InventoryCategory;
  categoriaAutomatica: InventoryCategory;
  quantidade: number;
};

const inventoryCategories: Record<
  InventoryCategory,
  {
    nome: string;
    icon: any;
    keywords: string[];
  }
> = {
  acessorio: {
    nome: "ACESSÓRIO",
    icon: require("@/assets/icons/acessorio.png"),
    keywords: [
      "oculos",
      "relogio",
      "pulseira",
      "colar",
      "brinco",
      "anel",
      "broche",
      "gravata",
      "cinto",
      "bolsa",
      "mochila",
      "carteira",
      "bandana",
      "lenco",
      "mascara",
      "capacete",
      "viseira",
      "monoculo",
      "luneta",
      "binoculo",
      "capa",
      "manto",
      "capuz",
      "coldre",
      "bainha",
      "aljava",
      "sacola",
      "necessaire",
    ],
  },

  arma: {
    nome: "ARMA",
    icon: require("@/assets/icons/arma.png"),
    keywords: [
      "espada",
      "faca",
      "adaga",
      "punhal",
      "machado",
      "martelo",
      "marreta",
      "clava",
      "maca",
      "lanca",
      "alabarda",
      "foice",
      "mangual",
      "porrete",
      "bastao",
      "katana",
      "rapiera",
      "sabre",
      "florete",
      "pistola",
      "revolver",
      "rifle",
      "fuzil",
      "carabina",
      "escopeta",
      "espingarda",
      "metralhadora",
      "submetralhadora",
      "arma",
      "canhao",
      "lancachamas",
      "besta",
      "arco",
      "chakram",
      "estilingue",
      "escudo",
    ],
  },

  artefato: {
    nome: "ARTEFATO",
    icon: require("@/assets/icons/artefato.png"),
    keywords: [
      "artefato",
      "reliquia",
      "totem",
      "talisma",
      "amuleto",
      "grimorio",
      "oraculo",
      "cristal",
      "runa",
      "simbolo",
      "idolo",
      "esfera",
    ],
  },

  cartao: {
    nome: "CARTÃO",
    icon: require("@/assets/icons/cartao.png"),
    keywords: [
      "cartao",
      "cracha",
      "credencial",
      "badge",
      "identidade",
      "identificacao",
      "passaporte",
      "distintivo",
      "permissao",
    ],
  },

  chave: {
    nome: "CHAVE",
    icon: require("@/assets/icons/chave.png"),
    keywords: [
      "chave",
      "chaveiro",
      "token",
      "senha",
      "codigo",
      "passkey",
      "acesso",
    ],
  },

  comida: {
    nome: "COMIDA",
    icon: require("@/assets/icons/comida.png"),
    keywords: [
      "comida",
      "alimento",
      "racao",
      "refeicao",
      "lanche",
      "carne",
      "pao",
      "fruta",
      "legume",
      "verdura",
      "biscoito",
      "chocolate",
      "doce",
      "conserva",
      "enlatado",
      "bebida",
      "agua",
      "suco",
      "cafe",
    ],
  },

  diversos: {
    nome: "DIVERSOS",
    icon: require("@/assets/icons/diversos.png"),
    keywords: [],
  },

  documento: {
    nome: "DOCUMENTO",
    icon: require("@/assets/icons/documento.png"),
    keywords: [
      "documento",
      "arquivo",
      "relatorio",
      "papel",
      "ficha",
      "registro",
      "prontuario",
      "contrato",
      "manual",
      "livro",
      "diario",
      "caderno",
      "nota",
      "bilhete",
      "mapa",
      "planta",
      "laudo",
    ],
  },

  eletronico: {
    nome: "ELETRÔNICO",
    icon: require("@/assets/icons/eletronico.png"),
    keywords: [
      "computador",
      "notebook",
      "tablet",
      "celular",
      "telefone",
      "smartphone",
      "terminal",
      "monitor",
      "tela",
      "console",
      "pendrive",
      "disco",
      "hd",
      "ssd",
      "cartao-sd",
      "memoria",
      "chip",
      "microchip",
      "processador",
      "placa",
      "bateria",
      "pilha",
      "fonte",
      "circuito",
      "sensor",
      "camera",
      "drone",
      "robo",
      "androide",
      "implante",
    ],
  },

  ferramenta: {
    nome: "FERRAMENTA",
    icon: require("@/assets/icons/ferramenta.png"),
    keywords: [
      "ferramenta",
      "alicate",
      "furadeira",
      "serra",
      "serrote",
      "broca",
      "parafusadeira",
      "parafuso",
      "porca",
      "alavanca",
      "pe-de-cabra",
      "pinca",
      "estilete",
      "trena",
      "nivel",
      "soldador",
      "macarico",
    ],
  },

  material: {
    nome: "MATERIAL",
    icon: require("@/assets/icons/material.png"),
    keywords: [
      "material",
      "metal",
      "ferro",
      "aco",
      "cobre",
      "aluminio",
      "bronze",
      "prata",
      "ouro",
      "platina",
      "madeira",
      "pedra",
      "tijolo",
      "cimento",
      "concreto",
      "vidro",
      "plastico",
      "borracha",
      "tecido",
      "couro",
      "fio",
      "cabo",
      "sucata",
      "peca",
      "barra",
      "tubo",
      "residuo",
    ],
  },

  medicamento: {
    nome: "MEDICAMENTO",
    icon: require("@/assets/icons/medicamento.png"),
    keywords: [
      "medicamento",
      "remedio",
      "antibiotico",
      "analgesico",
      "antidoto",
      "vacina",
      "soro",
      "injecao",
      "comprimido",
      "capsula",
      "pomada",
      "unguento",
      "droga",
      "estimulante",
      "sedativo",
      "anestesico",
      "curativo",
      "bandagem",
    ],
  },

  missao: {
    nome: "MISSÃO",
    icon: require("@/assets/icons/missao.png"),
    keywords: [
      "missao",
      "objetivo",
      "evidencia",
      "prova",
      "alvo",
      "entrega",
      "encomenda",
      "pacote",
      "carga",
    ],
  },

  municao: {
    nome: "MUNIÇÃO",
    icon: require("@/assets/icons/municao.png"),
    keywords: [
      "municao",
      "bala",
      "cartucho",
      "projetil",
      "flecha",
      "virote",
      "dardo",
      "granada",
      "foguete",
    ],
  },

  organica: {
    nome: "ORGÂNICA",
    icon: require("@/assets/icons/organica.png"),
    keywords: [
      "organico",
      "organica",
      "celula",
      "sangue",
      "plasma",
      "secrecao",
      "fluido",
      "saliva",
      "suor",
      "veneno",
      "toxina",
      "esporo",
      "fungo",
      "bacteria",
      "virus",
      "parasita",
      "larva",
      "ovo",
      "orgao",
      "osso",
      "carne",
      "glandula",
    ],
  },

  radio: {
    nome: "RÁDIO",
    icon: require("@/assets/icons/radio.png"),
    keywords: [
      "radio",
      "comunicador",
      "transmissor",
      "receptor",
      "transceptor",
      "walkie-talkie",
      "walkietalkie",
      "intercomunicador",
      "beacon",
      "sinalizador",
      "antena",
    ],
  },

  roupa: {
    nome: "ROUPA",
    icon: require("@/assets/icons/roupa.png"),
    keywords: [
      "roupa",
      "camisa",
      "camiseta",
      "blusa",
      "calca",
      "shorts",
      "bermuda",
      "saia",
      "vestido",
      "terno",
      "uniforme",
      "jaqueta",
      "casaco",
      "sobretudo",
      "moletom",
      "sueter",
      "colete",
      "meia",
      "luva",
      "bota",
      "sapato",
      "tenis",
      "sandalia",
      "coturno",
      "farda",
      "vestimenta",
    ],
  },
};

const categoryOrder: InventoryCategory[] = [
  "acessorio",
  "arma",
  "artefato",
  "cartao",
  "chave",
  "comida",
  "diversos",
  "documento",
  "eletronico",
  "ferramenta",
  "material",
  "medicamento",
  "missao",
  "municao",
  "organica",
  "radio",
  "roupa",
];

function normalizeWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getInventoryCategory(
  itemName: string
): InventoryCategory {
  const trimmedName = itemName.trim();

  if (!trimmedName) {
    return "diversos";
  }

  const firstWord = normalizeWord(
    trimmedName.split(/\s+/)[0]
  );

  for (const category of categoryOrder) {
    const data = inventoryCategories[category];

    if (data.keywords.includes(firstWord)) {
      return category;
    }
  }

  return "diversos";
}

export default function InventoryScreen() {
  const styles = useThemedStyles(baseStyles);
  const { colors } = useAppTheme();

  const [character, setCharacter] = useState<string | null>(
    null
  );

  const [items, setItems] = useState<InventoryItem[]>([]);

  const [newItem, setNewItem] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("1");

  const [categoryModalVisible, setCategoryModalVisible] =
    useState(false);

  const [selectedItem, setSelectedItem] =
    useState<InventoryItem | null>(null);

  const [deleteModalVisible, setDeleteModalVisible] =
    useState(false);

  const [itemToDelete, setItemToDelete] =
    useState<InventoryItem | null>(null);
  const [deleteQuantity, setDeleteQuantity] = useState("1");

  const [transferModalVisible, setTransferModalVisible] =
    useState(false);

  const [itemToTransfer, setItemToTransfer] =
    useState<InventoryItem | null>(null);

  const [activeCharacters, setActiveCharacters] = useState<
    { id: string; nome: string; raca: string }[]
  >([]);

  const [destinationCharacterIds, setDestinationCharacterIds] = useState<string[]>([]);
  const [transferQuantity, setTransferQuantity] = useState("1");

  const [saving, setSaving] = useState(false);

  type ReceivedNotification = {
    id: string;
    itemNome: string;
    quantidade: number;
    remetenteNome: string;
  };

  const [notificationQueue, setNotificationQueue] = useState<
    ReceivedNotification[]
  >([]);
  const [activeNotification, setActiveNotification] =
    useState<ReceivedNotification | null>(null);

  const seenNotificationIds = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadCharacter() {
        const selected =
          await AsyncStorage.getItem(
            "selectedCharacter"
          );

        if (mounted) {
          setCharacter(selected);
        }
      }

      loadCharacter();

      return () => {
        mounted = false;
      };
    }, [])
  );

  useEffect(() => {
    if (!character) {
      setItems([]);
      return;
    }

    const characterIdMap: Record<string, string> = {
      Ciborgue: "cyborg",
      Tengu: "tengu",
      Elfo: "elf",
      Tiefling: "tiefling",
      Draconata: "dragonborn",
    };

    const characterId =
      characterIdMap[character];

    if (!characterId) {
      return;
    }

    const inventoryRef = collection(
      db,
      "characters",
      characterId,
      "inventory"
    );

    const unsubscribe = onSnapshot(
      inventoryRef,
      (snapshot) => {
        const loadedItems: InventoryItem[] =
          snapshot.docs.map((itemDoc) => {
            const data =
              itemDoc.data();

            return {
              id: itemDoc.id,
              nome: data.nome ?? "",
              categoria:
                data.categoria ??
                "diversos",
              categoriaAutomatica:
                data.categoriaAutomatica ??
                "diversos",
              quantidade: Math.max(0, Number(data.quantidade) || 1),
            };
          });

        setItems(loadedItems);
      },
      (error) => {
        console.error(
          "ERRO AO CARREGAR INVENTÁRIO:",
          error
        );
      }
    );

    return unsubscribe;
  }, [character]);

  useEffect(() => {
    if (!character) {
      setNotificationQueue([]);
      setActiveNotification(null);
      seenNotificationIds.current.clear();
      return;
    }

    const characterIdMap: Record<string, string> = {
      Ciborgue: "cyborg",
      Tengu: "tengu",
      Elfo: "elf",
      Tiefling: "tiefling",
      Draconata: "dragonborn",
    };

    const characterId = characterIdMap[character];

    if (!characterId) {
      return;
    }

    const notificationsRef = collection(
      db,
      "characters",
      characterId,
      "notifications"
    );

    const unsubscribe = onSnapshot(
      notificationsRef,
      (snapshot) => {
        const unreadNotifications: ReceivedNotification[] =
          snapshot.docs
            .filter((notificationDoc) => {
              const data = notificationDoc.data();

              return (
                data.tipo === "item_recebido" &&
                data.lida !== true &&
                !seenNotificationIds.current.has(notificationDoc.id)
              );
            })
            .map((notificationDoc) => {
              const data = notificationDoc.data();

              return {
                id: notificationDoc.id,
                itemNome: String(data.itemNome ?? "Item"),
                quantidade: Math.max(
                  1,
                  Number(data.quantidade) || 1
                ),
                remetenteNome: String(
                  data.remetenteNome ?? "Alguém"
                ),
              };
            });

        if (unreadNotifications.length === 0) {
          return;
        }

        unreadNotifications.forEach((notification) => {
          seenNotificationIds.current.add(notification.id);
        });

        setNotificationQueue((current) => [
          ...current,
          ...unreadNotifications,
        ]);
      },
      (error) => {
        console.error(
          "ERRO AO SINCRONIZAR NOTIFICAÇÕES:",
          error
        );
      }
    );

    return unsubscribe;
  }, [character]);

  useEffect(() => {
    if (activeNotification || notificationQueue.length === 0) {
      return;
    }

    const [nextNotification, ...remaining] =
      notificationQueue;

    setNotificationQueue(remaining);
    setActiveNotification(nextNotification);
  }, [notificationQueue, activeNotification]);

  useEffect(() => {
    if (!activeNotification || !character) {
      return;
    }

    const characterIdMap: Record<string, string> = {
      Ciborgue: "cyborg",
      Tengu: "tengu",
      Elfo: "elf",
      Tiefling: "tiefling",
      Draconata: "dragonborn",
    };

    const characterId = characterIdMap[character];

    if (!characterId) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await updateDoc(
          doc(
            db,
            "characters",
            characterId,
            "notifications",
            activeNotification.id
          ),
          {
            lida: true,
          }
        );
      } catch (error) {
        console.error(
          "ERRO AO MARCAR NOTIFICAÇÃO COMO LIDA:",
          error
        );
      } finally {
        setActiveNotification(null);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeNotification, character]);

  async function addItem() {
    const itemName = newItem.trim();

    if (!itemName) {
      return;
    }

    if (!character || saving) {
      return;
    }

    const characterIdMap: Record<string, string> = {
      Ciborgue: "cyborg",
      Tengu: "tengu",
      Elfo: "elf",
      Tiefling: "tiefling",
      Draconata: "dragonborn",
    };

    const characterId =
      characterIdMap[character];

    if (!characterId) {
      return;
    }

    try {
      setSaving(true);

      const categoriaAutomatica =
        getInventoryCategory(itemName);

      const quantity = Math.max(1, parseInt(newItemQuantity, 10) || 1);

      const inventorySnapshot = await getDocs(
        collection(
          db,
          "characters",
          characterId,
          "inventory"
        )
      );

      const existingDoc = inventorySnapshot.docs.find((inventoryDoc) => {
        const data = inventoryDoc.data();
        return (
          String(data.nome ?? "").trim().toLowerCase() ===
            itemName.toLowerCase() &&
          (data.categoria ?? "diversos") === categoriaAutomatica
        );
      });

      if (existingDoc) {
        const currentQuantity = Math.max(
          1,
          Number(existingDoc.data().quantidade) || 1
        );

        await setDoc(
          existingDoc.ref,
          {
            quantidade: currentQuantity + quantity,
          },
          { merge: true }
        );
      } else {
        const itemRef = doc(
          collection(
            db,
            "characters",
            characterId,
            "inventory"
          )
        );

        const item: InventoryItem = {
          id: itemRef.id,
          nome: itemName,
          categoria: categoriaAutomatica,
          categoriaAutomatica,
          quantidade: quantity,
        };

        await setDoc(itemRef, item);
      }

      setNewItem("");
      setNewItemQuantity("1");

      Keyboard.dismiss();
    } catch (error) {
      console.error(
        "ERRO AO ADICIONAR ITEM:",
        error
      );

      Alert.alert(
        "Erro",
        "Não foi possível adicionar o item."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeCategory(
    category: InventoryCategory
  ) {
    if (!selectedItem || !character) {
      return;
    }

    const characterIdMap: Record<string, string> = {
      Ciborgue: "cyborg",
      Tengu: "tengu",
      Elfo: "elf",
      Tiefling: "tiefling",
      Draconata: "dragonborn",
    };

    const characterId =
      characterIdMap[character];

    if (!characterId) {
      return;
    }

    try {
      const itemRef = doc(
        db,
        "characters",
        characterId,
        "inventory",
        selectedItem.id
      );

      await setDoc(
        itemRef,
        {
          categoria: category,
        },
        {
          merge: true,
        }
      );

      setCategoryModalVisible(false);
      setSelectedItem(null);
    } catch (error) {
      console.error(
        "ERRO AO ALTERAR CATEGORIA:",
        error
      );

      Alert.alert(
        "Erro",
        "Não foi possível alterar o ícone."
      );
    }
  }

  function removeItem(item: InventoryItem) {
    if (!character) {
      return;
    }

    setItemToDelete(item);
    setDeleteModalVisible(true);
  }

  async function confirmDeleteItem() {
    if (!character || !itemToDelete) {
      return;
    }

    const characterIdMap: Record<string, string> = {
      Ciborgue: "cyborg",
      Tengu: "tengu",
      Elfo: "elf",
      Tiefling: "tiefling",
      Draconata: "dragonborn",
    };

    const characterId = characterIdMap[character];

    if (!characterId) {
      return;
    }

    try {
      setSaving(true);

      const quantityToRemove = Math.max(
        1,
        parseInt(deleteQuantity, 10) || 1
      );

      const itemRef = doc(
        db,
        "characters",
        characterId,
        "inventory",
        itemToDelete.id
      );

      const currentQuantity = Math.max(
        1,
        Number(itemToDelete.quantidade) || 1
      );

      if (quantityToRemove >= currentQuantity) {
        await deleteDoc(itemRef);
      } else {
        await setDoc(
          itemRef,
          {
            quantidade: currentQuantity - quantityToRemove,
          },
          { merge: true }
        );
      }

      setDeleteModalVisible(false);
      setItemToDelete(null);
      setDeleteQuantity("1");
    } catch (error) {
      console.error(
        "ERRO AO REMOVER ITEM:",
        error
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadActiveCharacters() {
    try {
      const charactersRef = collection(db, "characters");
      const snapshot = await getDocs(charactersRef);

      const active = snapshot.docs
        .filter((characterDoc) => {
          const data = characterDoc.data();
          return data.ativo === true;
        })
        .map((characterDoc) => {
          const data = characterDoc.data();

          return {
            id: characterDoc.id,
            nome: String(data.nome || characterDoc.id),
            raca: String(data.raca || "RAÇA NÃO INFORMADA"),
          };
        });

      setActiveCharacters(active);
    } catch (error) {
      console.error(
        "❌ ERRO AO CARREGAR PERSONAGENS ATIVOS:",
        error
      );
      setActiveCharacters([]);
    }
  }

  async function openTransferModal(item: InventoryItem) {
    setItemToTransfer(item);
    setDestinationCharacterIds([]);
    setTransferQuantity("1");
    setTransferModalVisible(true);
    await loadActiveCharacters();
  }

  function closeTransferModal() {
    if (saving) {
      return;
    }

    setTransferModalVisible(false);
    setItemToTransfer(null);
    setDestinationCharacterIds([]);
    setTransferQuantity("1");
  }

  async function transferItem() {
    if (!character || !itemToTransfer || saving || destinationCharacterIds.length === 0) return;

    const characterIdMap: Record<string, string> = {
      Ciborgue: "cyborg",
      Tengu: "tengu",
      Elfo: "elf",
      Tiefling: "tiefling",
      Draconata: "dragonborn",
    };
    const originId = characterIdMap[character];
    if (!originId) return;

    const targets = activeCharacters.filter((target) =>
      destinationCharacterIds.includes(target.id) && target.id !== originId,
    );
    if (targets.length === 0) return;

    const perRecipient = Number(transferQuantity);
    const total = perRecipient * targets.length;
    const available = Number(itemToTransfer.quantidade) || 0;
    if (!Number.isSafeInteger(perRecipient) || perRecipient <= 0 || total > available) {
      Alert.alert("Quantidade inválida", `Cada destino recebe a mesma quantidade. Necessário: ${total} un.; disponível: ${available} un.`);
      return;
    }

    try {
      setSaving(true);
      const originRef = doc(db, "characters", originId, "inventory", itemToTransfer.id);
      const targetInventory = await Promise.all(targets.map(async (target) => {
        const inventoryRef = collection(db, "characters", target.id, "inventory");
        const snapshot = await getDocs(inventoryRef);
        const matched = snapshot.docs.find((entry) => {
          const data = entry.data();
          return String(data.nome ?? "").trim().toLowerCase() === itemToTransfer.nome.trim().toLowerCase()
            && (data.categoria ?? "diversos") === itemToTransfer.categoria;
        });
        return {
          target,
          itemRef: matched?.ref ?? doc(inventoryRef),
          notificationRef: doc(collection(db, "characters", target.id, "notifications")),
        };
      }));

      await runTransaction(db, async (transaction) => {
        const sender = await transaction.get(doc(db, "characters", originId));
        const origin = await transaction.get(originRef);
        const currentQuantity = Number(origin.data()?.quantidade) || 0;
        if (!origin.exists() || currentQuantity < total) {
          throw new Error("Quantidade insuficiente no inventário de origem.");
        }

        const destinationStates = await Promise.all(targetInventory.map(async (entry) => ({
          ...entry,
          targetData: await transaction.get(doc(db, "characters", entry.target.id)),
          inventoryData: await transaction.get(entry.itemRef),
        })));
        if (destinationStates.some((entry) => !entry.targetData.exists() || entry.targetData.data().ativo !== true)) {
          throw new Error("Um dos personagens selecionados não está mais ativo.");
        }

        const remaining = currentQuantity - total;
        if (remaining === 0) transaction.delete(originRef);
        else transaction.update(originRef, { quantidade: remaining });

        for (const entry of destinationStates) {
          if (entry.inventoryData.exists()) {
            transaction.update(entry.itemRef, {
              quantidade: (Number(entry.inventoryData.data().quantidade) || 0) + perRecipient,
            });
          } else {
            transaction.set(entry.itemRef, {
              id: entry.itemRef.id,
              nome: itemToTransfer.nome,
              categoria: itemToTransfer.categoria,
              categoriaAutomatica: itemToTransfer.categoriaAutomatica,
              quantidade: perRecipient,
            });
          }
          transaction.set(entry.notificationRef, {
            tipo: "item_recebido",
            titulo: "ITEM RECEBIDO",
            itemNome: itemToTransfer.nome,
            quantidade: perRecipient,
            remetenteId: originId,
            remetenteNome: String(sender.data()?.nome || character),
            lida: false,
            criadaEm: serverTimestamp(),
          });
        }
      });

      setTransferModalVisible(false);
      setItemToTransfer(null);
      setDestinationCharacterIds([]);
      setTransferQuantity("1");
    } catch (error) {
      console.error("ERRO AO TRANSFERIR ITENS:", error);
      Alert.alert("Transferência não concluída", error instanceof Error ? error.message : "Verifique a conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const renderItem = ({
    item,
  }: {
    item: InventoryItem;
  }) => {
    const category =
      inventoryCategories[
        item.categoria
      ] ??
      inventoryCategories.diversos;

    return (
      <View style={styles.itemRow}>
        <Pressable
          style={styles.itemIconButton}
          onPress={() => {
            setSelectedItem(item);
            setCategoryModalVisible(true);
          }}
        >
          <Image
            source={category.icon}
            style={styles.itemIcon}
            resizeMode="contain"
          />
        </Pressable>

        <View style={styles.itemNameContainer}>
          <Text
            style={styles.itemName}
            numberOfLines={2}
          >
            {item.nome}
          </Text>
          <Text style={styles.itemQuantity}>
            ×{item.quantidade}
          </Text>
        </View>

        <Pressable
          style={styles.transferButton}
          onPress={() => openTransferModal(item)}
        >
          <Text style={styles.transferText}>
            ⇄
          </Text>
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={() => removeItem(item)}
        >
          <Text style={styles.deleteText}>
            ×
          </Text>
        </Pressable>
      </View>
    );
  };

  const selectedCategoryName = useMemo(() => {
    if (!selectedItem) {
      return "";
    }

    return (
      inventoryCategories[
        selectedItem.categoria
      ]?.nome ?? "DIVERSOS"
    );
  }, [selectedItem]);

  return (
    <>
      {activeNotification && (
        <Pressable
          style={styles.receivedNotification}
          onPress={() => setActiveNotification(null)}
        >
          <Text style={styles.receivedNotificationTitle}>
            ITEM RECEBIDO
          </Text>

          <Text style={styles.receivedNotificationText}>
            Você recebeu{" "}
            <Text style={styles.receivedNotificationHighlight}>
              {activeNotification.quantidade}×{" "}
              {activeNotification.itemNome}
            </Text>{" "}
            de{" "}
            <Text style={styles.receivedNotificationHighlight}>
              {activeNotification.remetenteNome}
            </Text>
            .
          </Text>

          <Text style={styles.receivedNotificationHint}>
            Toque para fechar
          </Text>
        </Pressable>
      )}

      <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          INVENTÁRIO
        </Text>

        <Text style={styles.subtitle}>
          {items.length}{" "}
          {items.length === 1
            ? "ITEM"
            : "ITENS"}
        </Text>
      </View>

      <View style={styles.addContainer}>
        <TextInput
          value={newItem}
          onChangeText={setNewItem}
          placeholder="ADICIONAR ITEM..."
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          onSubmitEditing={addItem}
          returnKeyType="done"
          autoCapitalize="sentences"
        />

        <TextInput
          value={newItemQuantity}
          onChangeText={(value) =>
            setNewItemQuantity(value.replace(/[^0-9]/g, ""))
          }
          keyboardType="number-pad"
          placeholder="QTD"
          placeholderTextColor={colors.placeholder}
          style={styles.quantityInput}
        />

        <Pressable
          style={[
            styles.addButton,
            saving && styles.disabledButton,
          ]}
          onPress={addItem}
          disabled={saving}
        >
          <Text style={styles.addButtonText}>
            +
          </Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image
            source={
              inventoryCategories.diversos.icon
            }
            style={styles.emptyIcon}
            resizeMode="contain"
          />

          <Text style={styles.emptyTitle}>
            INVENTÁRIO VAZIO
          </Text>

          <Text style={styles.emptyText}>
            Adicione um item para começar.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            styles.listContent
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDeleteModalVisible(false);
          setItemToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.warningMark}>
              <Text style={styles.warningMarkText}>
                !
              </Text>
            </View>

            <Text style={styles.confirmModalTitle}>
              EXCLUIR ITEM
            </Text>

            {itemToDelete && (
              <>
                <Text
                  style={styles.confirmModalItemName}
                  numberOfLines={2}
                >
                  {itemToDelete.nome}
                </Text>

                <Text style={styles.confirmModalText}>
                  QUANTIDADE ATUAL: {itemToDelete.quantidade}
                </Text>

                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>REMOVER</Text>
                  <TextInput
                    value={deleteQuantity}
                    onChangeText={(value) =>
                      setDeleteQuantity(value.replace(/[^0-9]/g, ""))
                    }
                    keyboardType="number-pad"
                    style={styles.modalQuantityInput}
                  />
                  <Text style={styles.quantityUnit}>UN.</Text>
                </View>

                <Text style={styles.confirmModalText}>
                  SE A QUANTIDADE CHEGAR A ZERO, O ITEM SERÁ REMOVIDO.
                </Text>
              </>
            )}

            <View style={styles.confirmButtons}>
              <Pressable
                style={styles.confirmCancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setItemToDelete(null);
                }}
                disabled={saving}
              >
                <Text style={styles.confirmCancelText}>
                  CANCELAR
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmDeleteButton,
                  saving && styles.disabledButton,
                ]}
                onPress={confirmDeleteItem}
                disabled={saving}
              >
                <Text style={styles.confirmDeleteText}>
                  {saving ? "REMOVENDO..." : "EXCLUIR"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={transferModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTransferModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <Text style={styles.confirmModalTitle}>
              TRANSFERIR ITEM
            </Text>

            {itemToTransfer && (
              <Text
                style={styles.confirmModalItemName}
                numberOfLines={2}
              >
                {itemToTransfer.nome}
              </Text>
            )}

            {itemToTransfer && (
              <Text style={styles.confirmModalText}>
                DISPONÍVEL: {itemToTransfer.quantidade} UN.
              </Text>
            )}

            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>TRANSFERIR</Text>
              <TextInput
                value={transferQuantity}
                onChangeText={(value) =>
                  setTransferQuantity(value.replace(/[^0-9]/g, ""))
                }
                keyboardType="number-pad"
                style={styles.modalQuantityInput}
              />
              <Text style={styles.quantityUnit}>UN.</Text>
            </View>

            <Text style={styles.confirmModalText}>
              PERSONAGENS ATIVOS
            </Text>

            <ScrollView style={styles.transferCharacters} nestedScrollEnabled>
              {activeCharacters
                .filter((entry) => entry.id !== ({ Ciborgue: "cyborg", Tengu: "tengu", Elfo: "elf", Tiefling: "tiefling", Draconata: "dragonborn" } as Record<string, string>)[character ?? ""])
                .map((target) => {
                  const selected = destinationCharacterIds.includes(target.id);
                  return (
                    <Pressable
                      key={target.id}
                      style={[styles.transferCharacterButton, selected && styles.transferCharacterSelected]}
                      onPress={() => setDestinationCharacterIds((current) => selected ? current.filter((id) => id !== target.id) : [...current, target.id])}
                      disabled={saving}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.transferCharacterText}>{target.nome.toUpperCase()}</Text>
                        <Text style={styles.transferCharacterRace}>{target.raca.toUpperCase()}</Text>
                      </View>
                      <Text style={styles.transferCheckbox}>{selected ? "☑" : "□"}</Text>
                    </Pressable>
                  );
                })}
              {activeCharacters.filter((entry) => entry.id !== ({ Ciborgue: "cyborg", Tengu: "tengu", Elfo: "elf", Tiefling: "tiefling", Draconata: "dragonborn" } as Record<string, string>)[character ?? ""]).length === 0 && (
                <Text style={styles.noActiveCharactersText}>NENHUM OUTRO PERSONAGEM ATIVO.</Text>
              )}
            </ScrollView>

            {destinationCharacterIds.length > 0 && itemToTransfer && (
              <View style={styles.transferConfirmation}>
                <Text style={styles.transferConfirmationText}>
                  {transferQuantity || "0"} UN. PARA CADA PERSONAGEM
                </Text>
                <Text style={styles.transferConfirmationName}>
                  {destinationCharacterIds.length} DESTINATÁRIO(S) · TOTAL: {(Number(transferQuantity) || 0) * destinationCharacterIds.length} UN.
                </Text>
                <View style={styles.confirmButtons}>
                  <Pressable
                    style={styles.confirmCancelButton}
                    onPress={() => setDestinationCharacterIds([])}
                    disabled={saving}
                  >
                    <Text style={styles.confirmCancelText}>LIMPAR</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.confirmTransferButton, (saving || !Number.isSafeInteger(Number(transferQuantity)) || Number(transferQuantity) < 1 || Number(transferQuantity) * destinationCharacterIds.length > itemToTransfer.quantidade) && styles.disabledButton]}
                    onPress={() => void transferItem()}
                    disabled={saving || !Number.isSafeInteger(Number(transferQuantity)) || Number(transferQuantity) < 1 || Number(transferQuantity) * destinationCharacterIds.length > itemToTransfer.quantidade}
                  >
                    <Text style={styles.confirmTransferText}>{saving ? "TRANSFERINDO..." : "CONFIRMAR TRANSFERÊNCIA"}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Pressable
              style={styles.closeButton}
              onPress={closeTransferModal}
              disabled={saving}
            >
              <Text style={styles.closeButtonText}>
                CANCELAR
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCategoryModalVisible(false);
          setSelectedItem(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              ALTERAR ÍCONE
            </Text>

            {selectedItem && (
              <>
                <Text
                  style={styles.modalItemName}
                  numberOfLines={2}
                >
                  {selectedItem.nome}
                </Text>

                <Text style={styles.suggestionText}>
                  SUGESTÃO AUTOMÁTICA:{" "}
                  {inventoryCategories[
                    selectedItem
                      .categoriaAutomatica
                  ]?.nome ??
                    "DIVERSOS"}
                </Text>

                <Text style={styles.currentText}>
                  ATUAL: {selectedCategoryName}
                </Text>
              </>
            )}

            <FlatList
              data={categoryOrder}
              keyExtractor={(category) =>
                category
              }
              numColumns={4}
              columnWrapperStyle={
                styles.categoryRow
              }
              contentContainerStyle={
                styles.categoryGrid
              }
              renderItem={({ item: category }) => {
                const data =
                  inventoryCategories[
                    category
                  ];

                const isSelected =
                  selectedItem?.categoria ===
                  category;

                return (
                  <Pressable
                    style={[
                      styles.categoryButton,
                      isSelected &&
                        styles.categoryButtonSelected,
                    ]}
                    onPress={() =>
                      changeCategory(
                        category
                      )
                    }
                  >
                    <Image
                      source={data.icon}
                      style={styles.categoryIcon}
                      resizeMode="contain"
                    />

                    <Text
                      style={
                        styles.categoryName
                      }
                      numberOfLines={2}
                    >
                      {data.nome}
                    </Text>
                  </Pressable>
                );
              }}
            />

            <Pressable
              style={styles.closeButton}
              onPress={() => {
                setCategoryModalVisible(false);
                setSelectedItem(null);
              }}
            >
              <Text style={styles.closeButtonText}>
                FECHAR
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </>
  );
}

const baseStyles = StyleSheet.create({
  receivedNotification: {
    position: "absolute",
    top: "50%",
    left: 22,
    right: 22,
    zIndex: 9999,
    elevation: 30,
    backgroundColor: "#090909",
    borderWidth: 2,
    borderColor: "#777",
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 26,
    transform: [{ translateY: -110 }],
    shadowColor: "#000",
    shadowOpacity: 0.8,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },

  receivedNotificationTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
    textAlign: "center",
  },

  receivedNotificationText: {
    color: "#ddd",
    fontSize: 20,
    lineHeight: 30,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 18,
  },

  receivedNotificationHighlight: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
  },

  receivedNotificationHint: {
    color: "#777",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 20,
  },

  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingBottom: 50,
  },

  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 12,
  },

  title: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  subtitle: {
    color: "#666",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 3,
  },

  addContainer: {
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 12,
  },

  input: {
    flex: 1,
    height: 48,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 7,
    paddingHorizontal: 15,
    color: "#fff",
    fontSize: 14,
  },

  quantityInput: {
    width: 58,
    height: 48,
    marginLeft: 8,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 7,
    paddingHorizontal: 8,
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
  },

  addButton: {
    width: 48,
    height: 48,
    marginLeft: 8,
    borderRadius: 7,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.5,
  },

  addButtonText: {
    color: "#000",
    fontSize: 28,
    fontWeight: "300",
    lineHeight: 30,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  itemRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#161616",
  },

  itemIconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  itemIcon: {
    width: 31,
    height: 31,
  },

  itemNameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },

  itemName: {
    flex: 1,
    color: "#eee",
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 10,
  },

  itemQuantity: {
    color: "#777",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
    marginRight: 4,
  },

  deleteButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  transferButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  transferText: {
    color: "#555",
    fontSize: 22,
    fontWeight: "300",
  },

  deleteText: {
    color: "#555",
    fontSize: 25,
    fontWeight: "300",
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },

  emptyIcon: {
    width: 54,
    height: 54,
    opacity: 0.45,
    marginBottom: 14,
  },

  emptyTitle: {
    color: "#666",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  emptyText: {
    color: "#444",
    fontSize: 12,
    marginTop: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },

  modalContainer: {
    width: "100%",
    maxHeight: "85%",
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#252525",
    borderRadius: 10,
    padding: 18,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
  },

  modalItemName: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    marginTop: 9,
  },

  suggestionText: {
    color: "#666",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 12,
  },

  currentText: {
    color: "#888",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 15,
  },

  categoryGrid: {
    paddingVertical: 5,
  },

  categoryRow: {
    justifyContent: "flex-start",
  },

  categoryButton: {
    width: "23%",
    aspectRatio: 0.9,
    marginRight: "2.66%",
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#181818",
    borderRadius: 7,
    backgroundColor: "#000000",
    padding: 5,
  },

  categoryButtonSelected: {
    borderColor: "#777",
    backgroundColor: "#161616",
  },

  categoryIcon: {
    width: 31,
    height: 31,
    marginBottom: 5,
  },

  categoryName: {
    color: "#aaa",
    fontSize: 8,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  confirmModalContainer: {
    width: "100%",
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#292929",
    borderRadius: 8,
    padding: 22,
  },

  warningMark: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: "#6f2b2b",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  warningMarkText: {
    color: "#a33",
    fontSize: 20,
    fontWeight: "700",
  },

  confirmModalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
  },

  confirmModalItemName: {
    color: "#ddd",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 8,
  },

  quantityLabel: {
    color: "#888",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  modalQuantityInput: {
    width: 70,
    height: 42,
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 6,
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  quantityUnit: {
    color: "#555",
    fontSize: 10,
    fontWeight: "800",
  },

  confirmModalText: {
    color: "#666",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 15,
    letterSpacing: 0.8,
    textAlign: "center",
    marginTop: 13,
  },

  confirmButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 22,
  },

  confirmCancelButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmCancelText: {
    color: "#888",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  confirmDeleteButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#6f2b2b",
    borderRadius: 6,
    backgroundColor: "#160909",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmDeleteText: {
    color: "#b44",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  transferCharacters: {
    marginTop: 18,
    maxHeight: 240,
  },

  transferCharacterButton: {
    minHeight: 53,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 6,
    backgroundColor: "#050505",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  transferCharacterSelected: {
    borderColor: "#877177",
    backgroundColor: "#1c1719",
  },
  transferCharacterRace: {
    color: "#797173",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 5,
  },
  transferCheckbox: {
    color: "#bba6aa",
    fontSize: 22,
    marginLeft: 12,
  },

  transferCharacterText: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  noActiveCharactersText: {
    color: "#555",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 10,
  },

  transferConfirmation: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1c1c1c",
  },

  transferConfirmationText: {
    color: "#666",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
  },

  transferConfirmationName: {
    color: "#ddd",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
    textAlign: "center",
    marginTop: 7,
  },

  confirmTransferButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#3d3d3d",
    borderRadius: 6,
    backgroundColor: "#151515",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmTransferText: {
    color: "#ddd",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  closeButton: {
    height: 44,
    borderWidth: 1,
    borderColor: "#242424",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },

  closeButtonText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
});