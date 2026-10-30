import React, { useEffect } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CardsIcon,
  SheetIcon,
  InventoryIcon,
  NotesIcon,
  EvidenceIcon,
} from "@/components/icons";
import { useAppTheme } from "@/theme/AppTheme";

type NavigationIcon = React.ComponentType<{ size?: number; color?: string }>;

type NavigationItem = {
  label: string;
  route: string;
  icon: NavigationIcon;
};

const navigationItems: NavigationItem[] = [
  { label: "DOCUMENTOS", route: "/menu/documents", icon: EvidenceIcon },
  { label: "CARDS", route: "/menu/cards", icon: CardsIcon },
  { label: "FICHA", route: "/menu/sheets", icon: SheetIcon },
  { label: "INVENTÁRIO", route: "/menu/inventory", icon: InventoryIcon },
  { label: "NOTAS", route: "/menu/notes", icon: NotesIcon },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const isReveal = pathname === "/characters/reveal";
  const isMenuScreen = pathname.startsWith("/menu/");
  const isSessionScreen = isReveal || isMenuScreen;

  useEffect(() => {
    if (!isSessionScreen) return;

    const handleBack = () => {
      if (isReveal) {
        router.replace("/");
        return true;
      }

      if (isMenuScreen) {
        AsyncStorage.getItem("selectedCharacter")
          .then((character) => {
            if (character) {
              router.replace({
                pathname: "/characters/reveal",
                params: { character },
              });
            } else {
              router.replace("/");
            }
          })
          .catch((error) => console.error("Erro ao recuperar personagem:", error));

        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBack,
    );

    return () => subscription.remove();
  }, [pathname, isReveal, isMenuScreen, isSessionScreen]);

  if (!isSessionScreen) return null;

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={styles.navigation}>
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.route ||
            pathname.startsWith(`${item.route}/`);
          const Icon = item.icon;

          return (
            <Pressable
              key={item.route}
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
              style={[
                styles.navButton,
                isActive && { backgroundColor: colors.surfaceRaised },
              ]}
              onPress={() => {
                if (!isActive) router.replace(item.route as any);
              }}
            >
              <View style={styles.navIcon}>
                <Icon
                  size={22}
                  color={isActive ? colors.text : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.navText,
                  { color: isActive ? colors.text : colors.textFaint },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    flexShrink: 0,
  },
  navigation: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  navButton: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  navIcon: {
    marginBottom: 4,
  },
  navText: {
    fontSize: 8,
    letterSpacing: 1,
    textAlign: "center",
  },
});
