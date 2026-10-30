import { useAppTheme } from "@/theme/AppTheme";
import { useThemedStyles } from "@/theme/useThemedStyles";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";

import { documentCategories } from "@/constants/documentCategories";
import { db } from "@/services/firebase/config";
import DocumentShareModal from "@/components/DocumentShareModal";

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

type AccessState = {
  characterId: string | null;
  status: "loading" | "ready" | "error";
  documents: Set<string>;
};

export default function DocumentsScreen() {
  const styles = useThemedStyles(baseStyles);
  const { colors } = useAppTheme();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [access, setAccess] = useState<AccessState>({
    characterId: null,
    status: "loading",
    documents: new Set(),
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [sharingDocumentId, setSharingDocumentId] = useState<string | null>(null);
  const [receivedDocument, setReceivedDocument] = useState<null | {
    id: string;
    titulo: string;
    remetente: string;
  }>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setProfileLoading(true);

      async function loadCharacter() {
        try {
          const selected = await AsyncStorage.getItem("selectedCharacter");
          if (!active) return;

          const id = selected
            ? characterIds[selected.trim().toLocaleLowerCase("pt-BR")] ?? null
            : null;

          setCharacterId(id);
          setErrorMessage(null);
        } catch (error) {
          console.error("Erro ao carregar personagem dos documentos:", error);
          if (active) {
            setCharacterId(null);
            setErrorMessage("Não foi possível identificar o personagem deste dispositivo.");
          }
        } finally {
          if (active) setProfileLoading(false);
        }
      }

      void loadCharacter();
      return () => {
        active = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!characterId) {
      setAccess({ characterId: null, status: "ready", documents: new Set() });
      return;
    }

    setAccess({ characterId, status: "loading", documents: new Set() });

    const unsubscribe = onSnapshot(
      collection(db, "characters", characterId, "documentAccess"),
      (snapshot) => {
        const documents = new Set<string>();
        snapshot.forEach((item) => {
          if (item.data().liberado === true) documents.add(item.id);
        });
        setAccess({ characterId, status: "ready", documents });
      },
      (error) => {
        console.error("Erro ao sincronizar acesso aos documentos:", error);
        setAccess({ characterId, status: "error", documents: new Set() });
      },
    );

    return unsubscribe;
  }, [characterId, refreshKey]);

  useEffect(() => {
    if (!characterId) {
      setReceivedDocument(null);
      return;
    }
    return onSnapshot(
      collection(db, "characters", characterId, "notifications"),
      (snapshot) => {
        const unread = snapshot.docs
          .filter((entry) => entry.data().tipo === "documento_recebido" && entry.data().lida !== true)
          .sort((a, b) => (a.data().criadaEm?.toMillis?.() ?? 0) - (b.data().criadaEm?.toMillis?.() ?? 0));
        const item = unread[0];
        setReceivedDocument(item ? {
          id: item.id,
          titulo: String(item.data().documentoTitulo ?? "Documento"),
          remetente: String(item.data().remetenteNome ?? "Outro personagem"),
        } : null);
      },
      (error) => console.error("Erro ao consultar documentos compartilhados:", error),
    );
  }, [characterId]);

  const dismissReceivedDocument = async () => {
    if (!characterId || !receivedDocument) return;
    const current = receivedDocument;
    setReceivedDocument(null);
    try {
      await updateDoc(doc(db, "characters", characterId, "notifications", current.id), { lida: true });
    } catch (error) {
      console.error("Erro ao confirmar recebimento do documento:", error);
    }
  };

  const loading =
    profileLoading ||
    (characterId !== null &&
      (access.characterId !== characterId || access.status === "loading"));

  const allowedDocuments =
    !loading && access.status === "ready" && access.characterId === characterId
      ? access.documents
      : new Set<string>();

  const openDocument = async (id: string) => {
    if (!characterId || openingId || !allowedDocuments.has(id)) return;

    setOpeningId(id);
    setErrorMessage(null);

    try {
      const permission = await getDoc(
        doc(db, "characters", characterId, "documentAccess", id),
      );

      if (!permission.exists() || permission.data().liberado !== true) {
        setErrorMessage("O acesso a este documento foi revogado.");
        return;
      }

      router.push({
        pathname: "/menu/documents/viewer",
        params: { document: id },
      });
    } catch (error) {
      console.error("Erro ao verificar permissão do documento:", error);
      setErrorMessage("Não foi possível confirmar o acesso ao documento.");
    } finally {
      setOpeningId(null);
    }
  };

  const totalLiberados = documentCategories.reduce(
    (total, category) =>
      total + category.documents.filter((item) => allowedDocuments.has(item.id)).length,
    0,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>DOCUMENTOS</Text>
      <Text style={styles.subtitle}>ARQUIVO DE EVIDÊNCIAS COLETADAS</Text>
      {receivedDocument && !loading && (
        <View style={styles.sharedNotice}>
          <Text style={styles.sharedNoticeTitle}>DOCUMENTO RECEBIDO</Text>
          <Text style={styles.sharedNoticeText}>{receivedDocument.titulo}</Text>
          <Text style={styles.sharedNoticeDetail}>COMPARTILHADO POR {receivedDocument.remetente.toUpperCase()}</Text>
          <Pressable accessibilityRole="button" onPress={() => void dismissReceivedDocument()} style={styles.sharedNoticeButton}>
            <Text style={styles.sharedNoticeButtonText}>ENTENDI</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.textMuted} size="small" />
          <Text style={styles.stateLabel}>SINCRONIZANDO DOCUMENTOS...</Text>
        </View>
      ) : !characterId ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>PERSONAGEM NÃO IDENTIFICADO</Text>
          <Text style={styles.stateDescription}>
            Selecione um personagem para consultar os documentos liberados.
          </Text>
          <Pressable style={styles.stateButton} onPress={() => router.replace("/")}>
            <Text style={styles.stateButtonText}>VOLTAR AO INÍCIO</Text>
          </Pressable>
        </View>
      ) : access.status === "error" ? (
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>ARQUIVO INDISPONÍVEL</Text>
          <Text style={styles.stateDescription}>
            Não foi possível consultar as permissões dos documentos. Verifique a
            conexão e o acesso ao Firestore.
          </Text>
          <Pressable
            style={styles.stateButton}
            onPress={() => setRefreshKey((value) => value + 1)}
          >
            <Text style={styles.stateButtonText}>TENTAR NOVAMENTE</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {errorMessage ? (
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{errorMessage}</Text>
            </View>
          ) : null}

          {totalLiberados === 0 ? (
            <View style={styles.centerState}>
              <Text style={styles.stateTitle}>NENHUM DOCUMENTO DISPONÍVEL</Text>
              <Text style={styles.stateDescription}>
                Os documentos encontrados durante a investigação aparecerão aqui
                quando forem liberados pelo Mestre.
              </Text>
            </View>
          ) : (
            documentCategories
              .filter((category) =>
                category.documents.some((item) => allowedDocuments.has(item.id)),
              )
              .map((category) => {
              const expanded = selectedCategory === category.id;
              const available = category.documents.filter((item) =>
                allowedDocuments.has(item.id),
              );
              const count = available.length;

              return (
                <View key={category.id} style={styles.category}>
                  <Pressable
                    style={styles.categoryHeader}
                    onPress={() =>
                      setSelectedCategory(expanded ? null : category.id)
                    }
                  >
                    <Text style={styles.symbol}>{category.symbol}</Text>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      <Text style={styles.categoryCount}>
                        {count === 0
                          ? "NENHUM DOCUMENTO DISPONÍVEL"
                          : `${count} ${count === 1 ? "DOCUMENTO DISPONÍVEL" : "DOCUMENTOS DISPONÍVEIS"}`}
                      </Text>
                    </View>
                    <Text style={styles.arrow}>{expanded ? "−" : "+"}</Text>
                  </Pressable>

                  {expanded && (
                    <View style={styles.documentList}>
                      {count === 0 ? (
                        <Text style={styles.emptyCategory}>ARQUIVO VAZIO</Text>
                      ) : (
                        available.map((item) => (
                          <View key={item.id} style={styles.documentRow}>
                            <Pressable
                              style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingVertical: 4 }}
                              disabled={openingId !== null}
                              onPress={() => void openDocument(item.id)}
                              accessibilityLabel={`Abrir documento ${item.title}`}
                            >
                              <Text style={styles.documentIcon}>▤</Text>
                              <Text style={styles.documentTitle}>{item.title}</Text>
                              {openingId === item.id ? (
                                <ActivityIndicator size="small" color={colors.textMuted} />
                              ) : (
                                <Text style={styles.documentArrow}>›</Text>
                              )}
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Compartilhar documento ${item.title}`}
                              onPress={() => setSharingDocumentId(item.id)}
                              style={{ paddingHorizontal: 13, paddingVertical: 12 }}
                            >
                              <Text style={{ fontSize: 20, color: "#bda7aa" }}>↗</Text>
                            </Pressable>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
      {errorMessage && (loading || !characterId || access.status === "error") ? (
        <Text style={styles.footerError}>{errorMessage}</Text>
      ) : null}
      <DocumentShareModal
        visible={sharingDocumentId !== null}
        senderId={characterId}
        initialDocumentId={sharingDocumentId}
        onClose={() => setSharingDocumentId(null)}
      />
    </View>
  );
}

const baseStyles = StyleSheet.create({
  sharedNotice: { marginHorizontal: 15, marginVertical: 12, padding: 15, backgroundColor: "#181012", borderWidth: 1, borderColor: "#6d4b52" },
  sharedNoticeTitle: { color: "#dec7cc", fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  sharedNoticeText: { color: "#f0e8e9", fontSize: 14, fontWeight: "700", marginTop: 10 },
  sharedNoticeDetail: { color: "#a28d91", fontSize: 9, letterSpacing: 1, marginTop: 6 },
  sharedNoticeButton: { alignSelf: "flex-end", borderColor: "#6d4b52", borderWidth: 1, paddingHorizontal: 15, paddingVertical: 8, marginTop: 13 },
  sharedNoticeButtonText: { color: "#dec7cc", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 110,
  },
  heading: {
    color: "#f0f0f0",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 3,
  },
  subtitle: {
    color: "#686868",
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 7,
    marginBottom: 26,
  },
  list: { paddingBottom: 30 },
  category: {
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#0b0b0b",
    marginBottom: 10,
  },
  categoryHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  symbol: { width: 38, color: "#aab2b6", fontSize: 25 },
  categoryInfo: { flex: 1 },
  categoryTitle: {
    color: "#e4e4e4",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  categoryCount: {
    color: "#686868",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 6,
  },
  arrow: { color: "#888", fontSize: 23, paddingHorizontal: 5 },
  documentList: {
    borderTopWidth: 1,
    borderTopColor: "#292929",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1c",
    paddingHorizontal: 6,
  },
  documentIcon: { color: "#7e898e", fontSize: 15, marginRight: 12 },
  documentTitle: {
    flex: 1,
    color: "#c9c9c9",
    fontSize: 12,
    lineHeight: 18,
  },
  documentArrow: { color: "#777", fontSize: 23, paddingLeft: 8 },
  centerState: {
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#0b0b0b",
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  stateLabel: {
    color: "#787878",
    fontSize: 10,
    letterSpacing: 1.1,
    textAlign: "center",
  },
  stateTitle: {
    color: "#dddddd",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textAlign: "center",
  },
  stateDescription: {
    color: "#888888",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
  },
  stateButton: {
    borderWidth: 1,
    borderColor: "#565656",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 6,
  },
  stateButtonText: { color: "#dddddd", fontSize: 10, letterSpacing: 1.2 },
  emptyCategory: {
    textAlign: "center",
    color: "#5d5d5d",
    fontSize: 9,
    letterSpacing: 1,
    paddingVertical: 17,
  },
  messageBox: {
    borderWidth: 1,
    borderColor: "#5c3030",
    backgroundColor: "#1b0c0c",
    padding: 12,
    marginBottom: 12,
  },
  messageText: { color: "#d4a0a0", fontSize: 10, lineHeight: 16 },
  footerError: { color: "#c78484", fontSize: 10, marginTop: 12 },
});
