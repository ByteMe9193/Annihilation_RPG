import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NpcGalleryImage } from "@/constants/npcGallery";

type Props = {
  visible: boolean;
  npcName: string;
  images: NpcGalleryImage[];
  onClose: () => void;
  
  initialImageId?: string | null;
};

export default function NpcGalleryModal({
  visible,
  npcName,
  images,
  onClose,
  initialImageId = null,
}: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [measuredRatios, setMeasuredRatios] = useState<Record<string, number>>({});
  const panelWidth = Math.min(Math.max(width - 24, 0), 640);
  const tileWidth = Math.max(80, (panelWidth - 32 - 10) / 2);
  const maxTileHeight = Math.min(310, Math.max(210, height * 0.38));
  const tileHeight = (image: NpcGalleryImage) =>
    Math.min(maxTileHeight, Math.max(90, tileWidth / Math.max(measuredRatios[image.id] ?? image.ratio, 0.01)));

  useEffect(() => {
    if (visible) setFocusedId(initialImageId);
    else setFocusedId(null);
  }, [visible, initialImageId]);

  const rememberRatio = (id: string, width: number, height: number) => {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
    const ratio = width / height;
    setMeasuredRatios((current) => current[id] === ratio ? current : { ...current, [id]: ratio });
  };

  const columns = useMemo(() => {
    const result: NpcGalleryImage[][] = [[], []];
    const heights = [0, 0];
    images.forEach((image) => {
      const column = heights[0] <= heights[1] ? 0 : 1;
      result[column].push(image);
      heights[column] += tileHeight(image) + 10;
    });
    return result;
  }, [images, tileWidth, measuredRatios, maxTileHeight]);

  const focusedImage = images.find((image) => image.id === focusedId) ?? null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => (focusedImage && !initialImageId ? setFocusedId(null) : onClose())}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.panel,
            {
              width: panelWidth,
              height: Math.min(height * 0.88, height - Math.max(insets.top, 12) - 18),
              paddingBottom: Math.max(insets.bottom, 10),
            },
          ]}
        >
          <View style={styles.header}>
            {focusedImage && !initialImageId ? (
              <Pressable onPress={() => setFocusedId(null)} style={styles.iconButton} accessibilityLabel="Voltar à galeria">
                <Ionicons name="arrow-back" size={20} color="#aaa" />
              </Pressable>
            ) : null}
            <View style={styles.heading}>
              <Text style={styles.kicker}>VALTESIA RESEARCH // REGISTRO VISUAL</Text>
              <Text style={styles.title}>{focusedImage ? "VISUALIZADOR" : "GALERIA"}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {npcName.toUpperCase()} · {focusedImage ? focusedImage.id.toUpperCase() : `${images.length} IMAGEM(NS)`}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Fechar galeria">
              <Ionicons name="close" size={24} color="#aaa" />
            </Pressable>
          </View>

          {focusedImage ? (
            <View style={styles.lightbox}>
              <Image source={focusedImage.source} resizeMode="contain" style={styles.expandedImage} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.galleryContent}
            >
              {images.length === 0 ? (
                <Text style={styles.empty}>NENHUMA IMAGEM LIBERADA</Text>
              ) : (
                <View style={[styles.masonryRow, images.length === 1 && { justifyContent: "center" }]}>
                  {columns.map((column, index) => (
                    <View key={index} style={[styles.masonryColumn, images.length === 1 && { flex: 0, width: tileWidth }]}>
                      {column.map((image) => (
                        <Pressable
                          key={image.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Ampliar imagem ${image.id}`}
                          onPress={() => setFocusedId(image.id)}
                          style={styles.tile}
                        >
                          <Image
                            source={image.source}
                            resizeMode="cover"
                            onLoad={({ nativeEvent }) => {
                              const imageSize = nativeEvent?.source;
                              if (imageSize) rememberRatio(image.id, imageSize.width, imageSize.height);
                            }}
                            style={{ width: "100%", height: tileHeight(image) }}
                          />
                        </Pressable>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  panel: {
    backgroundColor: "#080808",
    borderWidth: 1,
    borderColor: "#383030",
  },
  header: {
    minHeight: 80,
    paddingVertical: 15,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#2a2222",
  },
  heading: { flex: 1, paddingHorizontal: 5 },
  kicker: { color: "#875454", fontSize: 8, letterSpacing: 1.3, marginBottom: 5 },
  title: { color: "#e9e1e1", fontSize: 17, fontWeight: "600", letterSpacing: 2.1 },
  subtitle: { color: "#867575", fontSize: 9, letterSpacing: 1.1, marginTop: 6 },
  iconButton: { width: 37, height: 39, alignItems: "center", justifyContent: "center" },
  galleryContent: { paddingHorizontal: 15, paddingVertical: 16, paddingBottom: 32, flexGrow: 1 },
  masonryRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  masonryColumn: { flex: 1, gap: 10 },
  tile: { overflow: "hidden", backgroundColor: "#151111", borderWidth: 1, borderColor: "#322727" },
  empty: { color: "#746565", fontSize: 10, textAlign: "center", letterSpacing: 1.2, paddingVertical: 40 },
  lightbox: { flex: 1, padding: 12, alignItems: "center", justifyContent: "center" },
  expandedImage: { width: "100%", height: "100%" },
});
