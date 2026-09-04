import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { PaperProvider } from 'react-native-paper';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <PaperProvider>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  )
}