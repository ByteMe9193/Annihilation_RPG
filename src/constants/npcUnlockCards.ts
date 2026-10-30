import type { ImageSourcePropType } from "react-native";

type AssetContext = {
  keys: () => string[];
  (filename: string): ImageSourcePropType;
};

declare const require: {
  context: (directory: string, recursive: boolean, matcher: RegExp) => AssetContext;
};

const cardFiles = require.context(
  "../../assets/npcs",
  false,
  /Card\.(png|jpg|jpeg|webp)$/i,
);

const cardSources = new Map<string, ImageSourcePropType>();

for (const filename of cardFiles.keys()) {
  const match = filename.match(/^\.\/([a-zA-Z0-9_-]+)Card\.(png|jpg|jpeg|webp)$/i);
  if (match) {
    cardSources.set(match[1].toLowerCase(), cardFiles(filename));
  }
}

export function getNpcUnlockCard(npcId: string): ImageSourcePropType | null {
  return cardSources.get(npcId.trim().toLowerCase()) ?? null;
}
