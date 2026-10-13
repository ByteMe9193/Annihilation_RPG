import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import InterrogatorioTranscricao from "./files/Interrogatorio_Transcricao";

export default function DocumentViewer() {
  const { document } = useLocalSearchParams<{
    document?: string;
  }>();

  const [scale, setScale] = useState(1);

  function aumentarZoom() {
    setScale((current) => Math.min(current + 0.1, 2));
  }

  function diminuirZoom() {
    setScale((current) => Math.max(current - 0.1, 0.5));
  }

  function voltar() {
    router.back();
  }

  function renderDocument() {
    switch (document) {
      case "Interrogatorio_Transcricao":
        return <InterrogatorioTranscricao />;

      default:
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>
              DOCUMENTO NÃO ENCONTRADO
            </Text>

            <Text style={styles.errorText}>
              O documento "{document}" não está disponível.
            </Text>
          </View>
        );
    }
  }

  return (
    <View style={styles.container}>
      {/* BARRA SUPERIOR */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={voltar}
        >
          <Text style={styles.backText}>‹ VOLTAR</Text>
        </Pressable>

        <Text style={styles.headerTitle}>
          DOCUMENTO
        </Text>

        <View style={styles.zoomControls}>
          <Pressable
            style={styles.zoomButton}
            onPress={diminuirZoom}
          >
            <Text style={styles.zoomText}>−</Text>
          </Pressable>

          <Text style={styles.zoomValue}>
            {Math.round(scale * 100)}%
          </Text>

          <Pressable
            style={styles.zoomButton}
            onPress={aumentarZoom}
          >
            <Text style={styles.zoomText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* DOCUMENTO */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        <View
          style={[
            styles.documentWrapper,
            {
              transform: [{ scale }],
            },
          ]}
        >
          {renderDocument()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },

  header: {
    height: 64,
    backgroundColor: "#0a0a0a",
    borderBottomWidth: 1,
    borderBottomColor: "#292929",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },

  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },

  backText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },

  headerTitle: {
    color: "#888",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },

  zoomControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  zoomButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },

  zoomText: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 22,
  },

  zoomValue: {
    color: "#aaa",
    fontSize: 11,
    minWidth: 42,
    textAlign: "center",
  },

  scroll: {
    flex: 1,
  },

  content: {
    alignItems: "center",
    padding: 20,
    paddingBottom: 100,
  },

  documentWrapper: {
    width: "100%",
    alignItems: "center",
  },

  errorContainer: {
    width: "100%",
    padding: 40,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
  },

  errorTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  errorText: {
    color: "#888",
    fontSize: 14,
  },
});