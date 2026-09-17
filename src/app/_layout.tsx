import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { View, StyleSheet } from "react-native";
import { PaperProvider } from "react-native-paper";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { BottomNavigation } from "@/components/BottomNavigation";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <PaperProvider>
      <View style={styles.container}>
        <View style={styles.stack}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: "#000000",
              },
            }}
          />
        </View>

        <BottomNavigation />
      </View>

      <AnimatedSplashOverlay />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },

  stack: {
    flex: 1,
  },
});