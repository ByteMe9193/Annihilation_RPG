import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase/config";

type InfoKey = "nome" | "arquetipo" | "status" | "nivelAcesso" | "relacao";
type Target = { id: string; nome: string; raca: string };
type NpcAccess = { descoberto?: boolean; informacoes?: Partial<Record<InfoKey, boolean>> };
type Props = {
  visible: boolean;
  senderId: string | null;
  npcId: string | null;
  npcName: string;
  onClose: () => void;
};

const fields: { key: InfoKey; label: string }[] = [
  { key: "nome", label: "NOME REAL" },
  { key: "arquetipo", label: "ARQUÉTIPO" },
  { key: "status", label: "STATUS" },
  { key: "nivelAcesso", label: "NÍVEL DE ACESSO" },
  { key: "relacao", label: "RELAÇÃO" },
];

export default function NpcInfoShareModal({ visible, senderId, npcId, npcName, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const [senderAccess, setSenderAccess] = useState<NpcAccess>({});
  const [targets, setTargets] = useState<Target[]>([]);
  const [selectedFields, setSelectedFields] = useState<InfoKey[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingTargets, setLoadingTargets] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setSelectedFields([]);
    setSelectedTargets([]);
    setFeedback("");
    setSenderAccess({});
    if (!visible || !senderId || !npcId) return;
    setLoadingAccess(true);
    return onSnapshot(
      doc(db, "characters", senderId, "npcAccess", npcId),
      (snapshot) => {
        setSenderAccess(snapshot.exists() ? snapshot.data() as NpcAccess : {});
        setLoadingAccess(false);
      },
      () => {
        setLoadingAccess(false);
        setFeedback("NÃO FOI POSSÍVEL CONSULTAR SUAS INFORMAÇÕES.");
      },
    );
  }, [visible, senderId, npcId]);

  useEffect(() => {
    setTargets([]);
    if (!visible || !senderId) return;
    setLoadingTargets(true);
    return onSnapshot(
      collection(db, "characters"),
      (snapshot) => {
        setTargets(snapshot.docs
          .filter((entry) => entry.id !== senderId && entry.data().ativo === true)
          .map((entry) => ({
            id: entry.id,
            nome: String(entry.data().nome || entry.id),
            raca: String(entry.data().raca || "RAÇA NÃO INFORMADA"),
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
        setLoadingTargets(false);
      },
      () => {
        setLoadingTargets(false);
        setFeedback("NÃO FOI POSSÍVEL CONSULTAR OS DESTINATÁRIOS.");
      },
    );
  }, [visible, senderId]);

  const knownFields = useMemo(
    () => fields.filter((field) => senderAccess.informacoes?.[field.key] === true),
    [senderAccess],
  );
  const validFields = selectedFields.filter((key) => knownFields.some((field) => field.key === key));
  const validTargets = targets.filter((target) => selectedTargets.includes(target.id));
  const canShare = senderAccess.descoberto === true && validTargets.length > 0 &&
    !busy && !loadingTargets && !loadingAccess;

  const toggleField = (key: InfoKey) => {
    setSelectedFields((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
    setFeedback("");
  };

  const toggleTarget = (id: string) => {
    setSelectedTargets((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setFeedback("");
  };

  const share = async () => {
    if (!canShare || !senderId || !npcId) return;
    setBusy(true);
    setFeedback("");
    try {
      const sharedCount = await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, "characters", senderId);
        const senderAccessRef = doc(db, "characters", senderId, "npcAccess", npcId);
        const senderDoc = await transaction.get(senderRef);
        const sourceDoc = await transaction.get(senderAccessRef);
        const source = sourceDoc.data() as NpcAccess | undefined;
        if (senderDoc.data()?.ativo !== true || source?.descoberto !== true ||
          validFields.some((key) => source.informacoes?.[key] !== true)) {
          throw new Error("ACESSO_REVOGADO");
        }

        const destinations = await Promise.all(validTargets.map(async (target) => {
          const playerRef = doc(db, "characters", target.id);
          const accessRef = doc(db, "characters", target.id, "npcAccess", npcId);
          return {
            target,
            accessRef,
            player: await transaction.get(playerRef),
            access: await transaction.get(accessRef),
          };
        }));

        let count = 0;
        for (const destination of destinations) {
          if (destination.player.data()?.ativo !== true) continue;
          const current = destination.access.data() as NpcAccess | undefined;
          const newlyKnown = validFields.filter((key) => current?.informacoes?.[key] !== true);
          if (current?.descoberto === true && newlyKnown.length === 0) continue;
          const information = Object.fromEntries(newlyKnown.map((key) => [key, true]));
          transaction.set(destination.accessRef, {
            descoberto: true,
            ...(newlyKnown.length ? { informacoes: information } : {}),
            compartilhadoPor: senderId,
            alteradoEm: serverTimestamp(),
          }, { merge: true });
          count += 1;
        }
        return count;
      });
      setFeedback(sharedCount
        ? `INFORMAÇÕES COMPARTILHADAS COM ${sharedCount} PERSONAGEM(NS).`
        : "TODOS OS DESTINATÁRIOS JÁ POSSUEM ESSAS INFORMAÇÕES.");
      setSelectedTargets([]);
    } catch (error) {
      console.error("ERRO AO COMPARTILHAR INFORMAÇÕES DO NPC:", error);
      setFeedback(error instanceof Error && error.message === "ACESSO_REVOGADO"
        ? "SEU ACESSO ÀS INFORMAÇÕES FOI REVOGADO."
        : "FALHA AO COMPARTILHAR. CONFIRA AS REGRAS DO FIRESTORE.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
      <View style={styles.backdrop}>
        <View style={[styles.panel, { width: Math.min(width - 28, 620), maxHeight: height * 0.87 }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>VALTESIA RESEARCH // REGISTRO COMPARTILHADO</Text>
              <Text style={styles.heading}>COMPARTILHAR INFORMAÇÕES</Text>
              <Text style={styles.subheading}>{npcName.toUpperCase()}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} disabled={busy} style={styles.close}>
              <Ionicons name="close" size={23} color="#aaa" />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.step}>01 / INFORMAÇÕES A COMPARTILHAR</Text>
            <Text style={styles.helper}>O registro do NPC será compartilhado. Marque também os dados que deseja revelar.</Text>
            {loadingAccess ? <ActivityIndicator color="#957a7a" /> : null}
            {knownFields.map((field) => {
              const selected = selectedFields.includes(field.key);
              return (
                <Pressable key={field.key} onPress={() => toggleField(field.key)} style={[styles.choice, selected && styles.selected]} disabled={busy}>
                  <Text style={styles.choiceName}>{field.label}</Text>
                  <Ionicons name={selected ? "checkbox" : "square-outline"} size={19} color={selected ? "#c5acac" : "#777"} />
                </Pressable>
              );
            })}
            {!loadingAccess && knownFields.length === 0 ? <Text style={styles.empty}>NENHUM DADO ADICIONAL DESCOBERTO</Text> : null}
            <View style={styles.actions}>
              <Pressable style={styles.aux} onPress={() => setSelectedFields(knownFields.map((field) => field.key))} disabled={busy}><Text style={styles.auxText}>TODAS AS INFORMAÇÕES</Text></Pressable>
              <Pressable style={styles.aux} onPress={() => setSelectedFields([])} disabled={busy}><Text style={styles.auxText}>LIMPAR</Text></Pressable>
            </View>
            <Text style={styles.step}>02 / PERSONAGENS DESTINO</Text>
            <View style={styles.actions}>
              <Pressable style={styles.aux} onPress={() => setSelectedTargets(targets.map((target) => target.id))} disabled={busy}><Text style={styles.auxText}>SELECIONAR TODOS</Text></Pressable>
              <Pressable style={styles.aux} onPress={() => setSelectedTargets([])} disabled={busy}><Text style={styles.auxText}>LIMPAR</Text></Pressable>
            </View>
            {loadingTargets ? <ActivityIndicator color="#957a7a" /> : null}
            {targets.map((target) => {
              const selected = selectedTargets.includes(target.id);
              return (
                <Pressable key={target.id} onPress={() => toggleTarget(target.id)} style={[styles.choice, selected && styles.selected]} disabled={busy}>
                  <View style={{ flex: 1 }}><Text style={styles.choiceName}>{target.nome.toUpperCase()}</Text><Text style={styles.detail}>{target.raca.toUpperCase()}</Text></View>
                  <Ionicons name={selected ? "checkbox" : "square-outline"} size={19} color={selected ? "#c5acac" : "#777"} />
                </Pressable>
              );
            })}
            {!loadingTargets && targets.length === 0 ? <Text style={styles.empty}>NENHUM OUTRO PERSONAGEM ATIVO</Text> : null}
            {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
            <Pressable accessibilityRole="button" onPress={() => void share()} disabled={!canShare} style={[styles.confirm, !canShare && styles.disabled]}>
              <Text style={styles.confirmText}>{busy ? "COMPARTILHANDO..." : `COMPARTILHAR COM ${validTargets.length} PERSONAGEM(NS)`}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.88)", alignItems: "center", justifyContent: "center", padding: 14 },
  panel: { backgroundColor: "#090909", borderWidth: 1, borderColor: "#352b2d" },
  header: { padding: 16, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#2d2527" },
  kicker: { color: "#8a6266", fontSize: 8, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6 },
  heading: { color: "#efeaeb", fontSize: 16, fontWeight: "800", letterSpacing: 1.2 },
  subheading: { color: "#927d80", fontSize: 10, marginTop: 7, letterSpacing: 1.1 },
  close: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 22 },
  step: { color: "#bdacaf", fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginBottom: 12 },
  helper: { color: "#8b797b", fontSize: 11, lineHeight: 17, marginBottom: 13 },
  choice: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#101010", borderWidth: 1, borderColor: "#282628", marginBottom: 7 },
  selected: { borderColor: "#94777c", backgroundColor: "#211b1d" },
  choiceName: { color: "#e5e0e0", fontSize: 11, letterSpacing: 0.6, fontWeight: "700" },
  detail: { color: "#877b7d", fontSize: 9, letterSpacing: 0.8, marginTop: 5 },
  empty: { color: "#78696c", fontSize: 10, letterSpacing: 1, textAlign: "center", paddingVertical: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 21 },
  aux: { padding: 9, backgroundColor: "#171416", borderWidth: 1, borderColor: "#353035" },
  auxText: { color: "#bdb1b3", fontSize: 9, fontWeight: "700", letterSpacing: 0.7 },
  feedback: { color: "#cbb6ba", fontSize: 10, letterSpacing: 1, textAlign: "center", marginVertical: 13 },
  confirm: { padding: 15, marginTop: 9, backgroundColor: "#381f25", borderWidth: 1, borderColor: "#754c55", alignItems: "center" },
  confirmText: { color: "#eee1e2", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  disabled: { opacity: 0.35 },
});
