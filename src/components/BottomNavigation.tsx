import React, { useEffect } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  BackHandler,
} from "react-native";

import { usePathname, router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CardsIcon,
  SheetIcon,
  InventoryIcon,
  NotesIcon,
  EvidenceIcon,
} from "@/components/icons";

type NavigationItem = {
  label: string;
  route: string;
  icon: React.ReactNode;
};

export function BottomNavigation() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const navigationItems: NavigationItem[] = [
    {
      label: "DOCUMENTOS",
      route: "/menu/documents",
      icon: <EvidenceIcon size={22} />,
    },
    {
      label: "CARDS",
      route: "/menu/cards",
      icon: <CardsIcon size={22} />,
    },
    {
      label: "FICHA",
      route: "/menu/sheets",
      icon: <SheetIcon size={22} />,
    },
    {
      label: "INVENTÁRIO",
      route: "/menu/inventory",
      icon: <InventoryIcon size={22} />,
    },
    {
      label: "NOTAS",
      route: "/menu/notes",
      icon: <NotesIcon size={22} />,
    },
  ];

  const isReveal = pathname === "/characters/reveal";

  const isMenuScreen = pathname.startsWith("/menu/");

  const isSessionScreen = isReveal || isMenuScreen;

  /*
   * CONTROLE GLOBAL DO BOTÃO/GESTO DE VOLTAR
   *
   * REVEAL → HOME
   *
   * Qualquer tela do MENU → REVEAL
   */
  useEffect(() => {
    if (!isSessionScreen) {
      return;
    }

    const handleBack = () => {
      if (isReveal) {
        router.replace("/");
        return true;
      }

      if (isMenuScreen) {
        AsyncStorage.getItem("selectedCharacter").then(
          (character) => {
            if (character) {
              router.replace({
                pathname: "/characters/reveal",
                params: {
                  character,
                },
              });
            } else {
              router.replace("/");
            }
          },
        );

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

  if (!isSessionScreen) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <View style={styles.navigation}>
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.route ||
            pathname.startsWith(`${item.route}/`);

          return (
            <Pressable
              key={item.route}
              style={[
                styles.navButton,
                isActive && styles.navButtonActive,
              ]}
              onPress={() => {
                if (!isActive) {
                  router.replace(item.route as any);
                }
              }}
            >
              <View
                style={[
                  styles.navIcon,
                  isActive && styles.navIconActive,
                ]}
              >
                {item.icon}
              </View>

              <Text
                style={[
                  styles.navText,
                  isActive && styles.navTextActive,
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
    backgroundColor: "#050505",
    borderTopWidth: 1,
    borderTopColor: "#222",
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

  navButtonActive: {
    backgroundColor: "#0b0b0b",
  },

  navIcon: {
    marginBottom: 4,
    opacity: 0.55,
  },

  navIconActive: {
    opacity: 1,
  },

  navText: {
    color: "#777",
    fontSize: 8,
    letterSpacing: 1,
    textAlign: "center",
  },

  navTextActive: {
    color: "#fff",
  },
});