import { View, Text, StyleSheet } from "react-native";

export default function EvidencesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Evidências</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 110,
  },
  text: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
});