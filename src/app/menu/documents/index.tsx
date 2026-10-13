import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function DocumentsScreen() {
  function abrirTranscricao() {
    router.push({
      pathname: "/menu/documents/viewer",
      params: {
        document: "Interrogatorio_Transcricao",
      },
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DOCUMENTOS</Text>

      <Pressable
        style={styles.documentButton}
        onPress={abrirTranscricao}
      >
        <Text style={styles.documentCategory}>DOCUMENTO</Text>

        <Text style={styles.documentTitle}>
          TRANSCRIÇÃO
        </Text>

        <Text style={styles.documentHint}>
          INTERROGATÓRIO
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  title: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 30,
  },

  documentButton: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    padding: 20,
    borderRadius: 4,
  },

  documentCategory: {
    color: "#777",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },

  documentTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 1,
  },

  documentHint: {
    color: "#888",
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 1,
  },
});