
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";

type DocumentItem = {
  id: string;
  title: string;
  description?: string;
};

type DocumentCategory = {
  id: string;
  title: string;
  symbol: string;
  documents: DocumentItem[];
};

const categories: DocumentCategory[] = [
  {
    id: "diarios",
    title: "DIÁRIOS",
    symbol: "▤",
    documents: [
      { id: "diarioAndrew1", title: "Diário de Andrew — 01" },
      { id: "diarioAndrew2", title: "Diário de Andrew — 02" },
      { id: "diarioAndrew3", title: "Diário de Andrew — 03" },
      { id: "diarioAndrew4", title: "Diário de Andrew — 04" },
      { id: "diarioObsidiana", title: "Diário da Lucilla" },
    ],
  },
  {
    id: "admissoes",
    title: "FICHAS DE ADMISSÃO",
    symbol: "▣",
    documents: [
      { id: "admissao005", title: "Admissão #005" },
      { id: "admissao007", title: "Admissão #007" },
      { id: "admissao041", title: "Admissão #041" },
      { id: "admissao089", title: "Admissão #089" },
      { id: "admissao230", title: "Admissão #230" },
      { id: "admissaoHorn", title: "Admissão — Horn Silverskin" },
      { id: "admissaoReymond", title: "Admissão — Reymond Sunfury" },
    ],
  },
  {
    id: "mapas",
    title: "MAPAS E PLANTAS",
    symbol: "⌖",
    documents: [
    ],
  },
  {
    id: "interrogatorios",
    title: "INTERROGATÓRIOS",
    symbol: "▤",
    documents: [
      {
        id: "transcricaoInterrogatorio",
        title: "Transcrição — Reymond Sunfury",
      },
    ],
  },
  {
    id: "experimentos",
    title: "EXPERIMENTOS",
    symbol: "⌬",
    documents: [
      { id: "experimento01", title: "Experimento 01" },
      { id: "experimentoBanshee", title: "Experimento Banshee" },
      { id: "experimentoInchado", title: "Experimento Inchado" },
      { id: "experimentoMastodonte", title: "Experimento Mastodonte" },
    ],
  },
  {
    id: "correspondencias",
    title: "CARTAS E E-MAILS",
    symbol: "✉",
    documents: [
      { id: "cartaHarold", title: "Carta Dupla de Harold Valtesia" },
      { id: "emailRoyHana", title: "E-mail — Pressão da Câmara Roy / Hana" },
      { id: "emailRoyOliver", title: "E-mail — Liberação Roy / Oliver" },
    ],
  },
  {
    id: "relatorios",
    title: "RELATÓRIOS E REGISTROS",
    symbol: "▧",
    documents: [
      { id: "advertenciaKasper", title: "Advertência — Kasper" },
      { id: "memorandoMilitar", title: "Memorando Militar do Grande Leste" },
      { id: "orcamentoObsidiana", title: "Orçamento Industrial de Obsidiana" },
      { id: "transferenciaCompostos", title: "Transferência Interna — Compostos" },
    ],
  },
  {
    id: "fotografias",
    title: "FOTOGRAFIAS",
    symbol: "▣",
    documents: [
      { id: "ciborgueEnfaixado", title: "Ciborgue Enfaixado" },
      { id: "laboratorioCibernetica", title: "Laboratório de Augmentação Cibernética" },
      { id: "montagemCibernetica", title: "Montagem Cibernética — Laboratório Valtesia" },
      { id: "lochlanRefem", title: "Lochlan — Refém" },
      { id: "kiaraRefem", title: "Kiara — Refém" },
    ],
  },
  {
    id: "bilhetes",
    title: "Bilhetes e Anotações",
    symbol: "▧",
    documents: [
      { id: "lochlanKiara01", title: "Bilhetes Lochlan / Kiara — 01" },
      { id: "lochlanKiara02", title: "Bilhetes Lochlan / Kiara — 02" },
      { id: "kasperDrakeRoy", title: "Pedido de Drake" },
      {
        id: "arsenalAlice",
        title: "Arsenal da Ala Leste — Armário Alice",
      },
      { id: "objetivo", title: "Objetivo" },
      
    ],
  }
];

export default function DocumentsScreen() {
  const [selectedCategory, setSelectedCategory] =
  useState<string | null>(null);

  function openDocument(id: string) {
    router.push({
      pathname: "/menu/documents/viewer",
      params: { document: id },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>DOCUMENTOS</Text>
      <Text style={styles.subtitle}>
        ARQUIVO DE EVIDÊNCIAS COLETADAS
      </Text>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {categories.map((category) => {
          const expanded = selectedCategory === category.id;

          return (
            <View key={category.id} style={styles.category}>
              <Pressable
                style={styles.categoryHeader}
                onPress={() =>
                  setSelectedCategory(
                    expanded ? null : category.id,
                  )
                }
              >
                <Text style={styles.symbol}>
                  {category.symbol}
                </Text>

                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryTitle}>
                    {category.title}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {category.documents.length} DOCUMENTOS
                  </Text>
                </View>

                <Text style={styles.arrow}>
                  {expanded ? "−" : "+"}
                </Text>
              </Pressable>

              {expanded && (
                <View style={styles.documentList}>
                  {category.documents.map((item) => (
                    <Pressable
                      key={item.id}
                      style={styles.documentRow}
                      onPress={() => openDocument(item.id)}
                    >
                      <Text style={styles.documentIcon}>▤</Text>
                      <Text style={styles.documentTitle}>
                        {item.title}
                      </Text>
                      <Text style={styles.documentArrow}>›</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  list: {
    paddingBottom: 30,
  },
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
  symbol: {
    width: 38,
    color: "#aab2b6",
    fontSize: 25,
  },
  categoryInfo: {
    flex: 1,
  },
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
  arrow: {
    color: "#888",
    fontSize: 23,
    paddingHorizontal: 5,
  },
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
  documentIcon: {
    color: "#7e898e",
    fontSize: 15,
    marginRight: 12,
  },
  documentTitle: {
    flex: 1,
    color: "#c9c9c9",
    fontSize: 12,
    lineHeight: 18,
  },
  documentArrow: {
    color: "#777",
    fontSize: 23,
    paddingLeft: 8,
  },
});
