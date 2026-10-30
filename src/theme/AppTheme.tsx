import React, { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppThemeMode = "dark" | "light";

export type AppThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentBackground: string;
  accentText: string;
  placeholder: string;
  inverseText: string;
  overlay: string;
};

export const darkColors: AppThemeColors = {
  background: "#050505",
  surface: "#0b0b0b",
  surfaceAlt: "#0e0e0e",
  surfaceRaised: "#161313",
  text: "#f0f0f0",
  textMuted: "#a0a0a0",
  textFaint: "#777777",
  border: "#303030",
  borderStrong: "#666666",
  accent: "#ae5459",
  accentBackground: "#251214",
  accentText: "#eacacc",
  placeholder: "#686868",
  inverseText: "#101010",
  overlay: "rgba(0,0,0,0.87)",
};

export const lightColors: AppThemeColors = {
  background: "#f3f0ec",
  surface: "#ffffff",
  surfaceAlt: "#f8f5f1",
  surfaceRaised: "#eee6e1",
  text: "#242120",
  textMuted: "#555050",
  textFaint: "#706b69",
  border: "#d7ceca",
  borderStrong: "#9c8b86",
  accent: "#842c37",
  accentBackground: "#f4e5e5",
  accentText: "#782530",
  placeholder: "#8d8785",
  inverseText: "#ffffff",
  overlay: "rgba(27,19,19,0.45)",
};

const STORAGE_KEY = "aniquilacao:color-theme";

type AppThemeState = {
  mode: AppThemeMode;
  colors: AppThemeColors;
  ready: boolean;
  setTheme: (mode: AppThemeMode) => void;
  toggleTheme: () => void;
};

const listeners = new Set<() => void>();
let loadingStarted = false;
let changedDuringLoad = false;

function setTheme(mode: AppThemeMode) {
  changedDuringLoad = true;
  updateStore(mode, true);

  void AsyncStorage.setItem(STORAGE_KEY, mode).catch((error) => {
    console.error("Erro ao salvar tema:", error);
  });
}

function toggleTheme() {
  setTheme(currentState.mode === "dark" ? "light" : "dark");
}

let currentState: AppThemeState = {
  mode: "dark",
  colors: darkColors,
  ready: false,
  setTheme,
  toggleTheme,
};

function updateStore(mode: AppThemeMode, ready: boolean) {
  if (currentState.mode === mode && currentState.ready === ready) return;

  currentState = {
    ...currentState,
    mode,
    colors: mode === "dark" ? darkColors : lightColors,
    ready,
  };

  listeners.forEach((listener) => listener());
}

async function loadTheme() {
  if (loadingStarted) return;
  loadingStarted = true;

  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (!changedDuringLoad && (saved === "dark" || saved === "light")) {
      updateStore(saved, false);
    }
  } catch (error) {
    console.error("Erro ao carregar tema:", error);
  } finally {
    updateStore(currentState.mode, true);
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  void loadTheme();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AppThemeState {
  return currentState;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void loadTheme();
  }, []);

  return <>{children}</>;
}

export function useAppTheme(): AppThemeState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
