import { Image, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Image source={require("@/assets/title.png")} style={styles.logo} />
      <Link href="/characters" style={styles.button}>
        <Text style={styles.buttonText}>INICIAR SISTEMA</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 6,
    marginBottom: 40,
  },

  button: {
    borderWidth: 1,
    borderColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 30,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    letterSpacing: 2,
  },
  logo: {
    width: 300,
    height: 100,
    resizeMode: "contain",
    marginBottom: 40,
  },
});
