import { View, Text, StyleSheet } from "react-native";

export default function SheetsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Fichas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
});