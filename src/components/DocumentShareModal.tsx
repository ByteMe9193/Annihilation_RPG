import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { allDocuments } from "@/constants/documentCategories";
import { db } from "@/services/firebase/config";

type PlayerTarget = {
  id: string;
  nome: string;
  raca: string;
};

type Props = {
  visible: boolean;
  senderId: string | null;
  onClose: () => void;
  initialDocumentId?: string | null;
};

export default function DocumentShareModal({
  visible,
  senderId,
  onClose,
  initialDocumentId = null,
}: Props) {
  const { width, height } = useWindowDimensions();
  const [availableIds, setAvailableIds] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<PlayerTarget[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!visible) return;
    setSelectedDocumentId(initialDocumentId);
    setRecipientIds([]);
    setSearch("");
    setMessage("");
  }, [visible, initialDocumentId, senderId]);

  useEffect(() => {
    if (!visible || !senderId) {
      setAvailableIds([]);
      setLoadingAccess(false);
      return;
    }
    setLoadingAccess(true);
    const unsubscribe = onSnapshot(
      collection(db, "characters", senderId, "documentAccess"),
      (snapshot) => {
        setAvailableIds(
          snapshot.docs.filter((entry) => entry.data().liberado === true).map((entry) => entry.id),
        );
        setLoadingAccess(false);
      },
      () => {
        setAvailableIds([]);
        setLoadingAccess(false);
        setMessage("NÃO FOI POSSÍVEL CONSULTAR SEUS DOCUMENTOS.");
      },
    );
    return unsubscribe;
  }, [visible, senderId]);

  useEffect(() => {
    if (!visible || !senderId) {
      setRecipients([]);
      setLoadingTargets(false);
      return;
    }
    setLoadingTargets(true);
    const unsubscribe = onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
        setRecipients(
          snapshot.docs
            .filter((entry) => entry.id !== senderId && entry.data().ativo === true)
            .map((entry) => ({
              id: entry.id,
              nome: String(entry.data().nome || entry.id),
              raca: String(entry.data().raca || "RAÇA NÃO INFORMADA"),
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
        );
        setLoadingTargets(false);
      },
      () => {
        setRecipients([]);
        setLoadingTargets(false);
        setMessage("NÃO FOI POSSÍVEL CONSULTAR OS PERSONAGENS ATIVOS.");
      },
    );
    return unsubscribe;
  }, [visible, senderId]);

  const availableDocuments = useMemo(() => {
    const ids = new Set(availableIds);
    const term = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return allDocuments.filter((item) => {
      if (!ids.has(item.id)) return false;
      if (!term) return true;
      return `${item.title} ${item.categoryTitle}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(term);
    });
  }, [availableIds, search]);

  const selectedDocument = allDocuments.find((item) => item.id === selectedDocumentId) ?? null;
  const validDocument = selectedDocument !== null && availableIds.includes(selectedDocument.id);
  const validRecipients = recipients.filter((item) => recipientIds.includes(item.id));

  const toggleRecipient = (id: string) => {
    setRecipientIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
    setMessage("");
  };

  const shareDocument = async () => {
    if (busy || !senderId || !selectedDocument || !validDocument || validRecipients.length === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const documentId = selectedDocument.id;
      const results = await runTransaction(db, async (transaction) => {
        const senderAccessRef = doc(db, "characters", senderId, "documentAccess", documentId);
        const senderAccess = await transaction.get(senderAccessRef);
        const senderProfile = await transaction.get(doc(db, "characters", senderId));
        if (senderAccess.data()?.liberado !== true) {
          throw new Error("Você não possui mais acesso a este documento.");
        }

        const targetRefs = validRecipients.map((target) => ({
          target,
          playerRef: doc(db, "characters", target.id),
          accessRef: doc(db, "characters", target.id, "documentAccess", documentId),
          notificationRef: doc(collection(db, "characters", target.id, "notifications")),
        }));
        const states = await Promise.all(targetRefs.map(async (target) => ({
          ...target,
          player: await transaction.get(target.playerRef),
          access: await transaction.get(target.accessRef),
        })));
        let granted = 0;
        for (const state of states) {
          if (!state.player.exists() || state.player.data().ativo !== true) continue;
          if (state.access.data()?.liberado === true) continue;
          transaction.set(state.accessRef, {
            liberado: true,
            compartilhadoPor: senderId,
            alteradoEm: serverTimestamp(),
          }, { merge: true });
          transaction.set(state.notificationRef, {
            tipo: "documento_recebido",
            titulo: "DOCUMENTO COMPARTILHADO",
            documentoId: documentId,
            documentoTitulo: selectedDocument.title,
            remetenteId: senderId,
            remetenteNome: String(senderProfile.data()?.nome || senderId),
            lida: false,
            criadaEm: serverTimestamp(),
          });
          granted++;
        }
        return granted;
      });
      setMessage(
        results > 0
          ? `DOCUMENTO COMPARTILHADO COM ${results} PERSONAGEM(NS).`
          : "OS DESTINATÁRIOS JÁ POSSUEM ACESSO AO DOCUMENTO.",
      );
      setRecipientIds([]);
    } catch (error) {
      console.error("ERRO AO COMPARTILHAR DOCUMENTO:", error);
      setMessage(
        error instanceof Error && error.message === "Você não possui mais acesso a este documento."
          ? "SEU ACESSO AO DOCUMENTO FOI REVOGADO."
          : "NÃO FOI POSSÍVEL COMPARTILHAR. VERIFIQUE A CONEXÃO E AS REGRAS DO FIRESTORE.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <View style={styles.backdrop}>
        <View style={[styles.panel, { width: Math.min(width - 28, 640), maxHeight: height * 0.87 }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>VALTESIA RESEARCH // ARQUIVO COMPARTILHADO</Text>
              <Text style={styles.heading}>COMPARTILHAR DOCUMENTO</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar compartilhamento" onPress={onClose} disabled={busy} style={styles.close}>
              <Ionicons name="close" size={23} color="#aaa" />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.step}>01 / DOCUMENTO ADQUIRIDO</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Pesquisar documentos adquiridos"
              placeholderTextColor="#645b5b"
              style={styles.search}
              autoCorrect={false}
            />
            {loadingAccess ? <ActivityIndicator color="#957a7a" /> : null}
            <ScrollView nestedScrollEnabled style={styles.documentList} keyboardShouldPersistTaps="handled">
              {availableDocuments.map((item) => {
                const selected = item.id === selectedDocumentId;
                return (
                  <Pressable key={item.id} onPress={() => { setSelectedDocumentId(item.id); setMessage(""); }} style={[styles.choice, selected && styles.selected]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceName}>{item.title.toUpperCase()}</Text>
                      <Text style={styles.choiceDetail}>{item.categoryTitle.toUpperCase()}</Text>
                    </View>
                    <Ionicons name={selected ? "checkbox" : "square-outline"} color={selected ? "#c5acac" : "#777"} size={20} />
                  </Pressable>
                );
              })}
              {!loadingAccess && availableDocuments.length === 0 ? <Text style={styles.empty}>NENHUM DOCUMENTO ADQUIRIDO ENCONTRADO</Text> : null}
            </ScrollView>

            <Text style={styles.step}>02 / PERSONAGENS DESTINO</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => setRecipientIds(recipients.map((item) => item.id))} style={styles.aux} disabled={busy}>
                <Text style={styles.auxText}>SELECIONAR TODOS</Text>
              </Pressable>
              <Pressable onPress={() => setRecipientIds([])} style={styles.aux} disabled={busy}>
                <Text style={styles.auxText}>LIMPAR</Text>
              </Pressable>
            </View>
            {loadingTargets ? <ActivityIndicator color="#957a7a" /> : null}
            <View style={styles.targetList}>
              {recipients.map((target) => {
                const selected = recipientIds.includes(target.id);
                return (
                  <Pressable key={target.id} onPress={() => toggleRecipient(target.id)} style={[styles.choice, selected && styles.selected]} disabled={busy}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.choiceName}>{target.nome.toUpperCase()}</Text>
                      <Text style={styles.choiceDetail}>{target.raca.toUpperCase()}</Text>
                    </View>
                    <Ionicons name={selected ? "checkbox" : "square-outline"} color={selected ? "#c5acac" : "#777"} size={20} />
                  </Pressable>
                );
              })}
              {!loadingTargets && recipients.length === 0 ? <Text style={styles.empty}>NENHUM OUTRO PERSONAGEM ATIVO</Text> : null}
            </View>

            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Pressable
              accessibilityRole="button"
              disabled={busy || loadingAccess || loadingTargets || !validDocument || validRecipients.length === 0}
              onPress={() => void shareDocument()}
              style={[styles.confirm, (busy || loadingAccess || loadingTargets || !validDocument || validRecipients.length === 0) && styles.disabled]}
            >
              <Text style={styles.confirmText}>
                {busy ? "COMPARTILHANDO..." : `COMPARTILHAR COM ${validRecipients.length} PERSONAGEM(NS)`}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", justifyContent: "center", alignItems: "center", padding: 14 },
  panel: { backgroundColor: "#090909", borderColor: "#352b2d", borderWidth: 1 },
  header: { padding: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#2d2527" },
  kicker: { color: "#8a6266", fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6 },
  heading: { color: "#efeaeb", fontSize: 17, fontWeight: "800", letterSpacing: 1.2 },
  close: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 22 },
  step: { color: "#bdacaf", fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginBottom: 11 },
  search: { borderWidth: 1, borderColor: "#30292b", backgroundColor: "#0f0c0d", color: "#ddd", padding: 11, marginBottom: 10, fontSize: 12 },
  documentList: { maxHeight: 190, marginBottom: 22 },
  choice: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#101010", borderWidth: 1, borderColor: "#282628", marginBottom: 7 },
  selected: { borderColor: "#94777c", backgroundColor: "#211b1d" },
  choiceName: { color: "#e5e0e0", fontSize: 11, letterSpacing: 0.5, fontWeight: "700" },
  choiceDetail: { color: "#877b7d", fontSize: 9, letterSpacing: 0.8, marginTop: 5 },
  empty: { color: "#78696c", fontSize: 10, letterSpacing: 1, textAlign: "center", paddingVertical: 18 },
  actions: { flexDirection: "row", gap: 8, marginBottom: 11 },
  aux: { padding: 9, backgroundColor: "#171416", borderWidth: 1, borderColor: "#353035" },
  auxText: { color: "#bdb1b3", fontSize: 9, fontWeight: "700", letterSpacing: 0.7 },
  targetList: { marginBottom: 13 },
  message: { color: "#cbb6ba", fontSize: 10, letterSpacing: 1, textAlign: "center", marginVertical: 13 },
  confirm: { padding: 15, backgroundColor: "#381f25", borderWidth: 1, borderColor: "#754c55", alignItems: "center" },
  confirmText: { color: "#eee1e2", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  disabled: { opacity: 0.35 },
});
