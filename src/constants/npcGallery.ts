import type { ImageSourcePropType } from "react-native";


const galleryFiles = require.context(
  "../../assets/npcs/gallery",
  false,
  /\.(png|jpe?g|webp)$/i,
);

export type NpcGalleryImage = {
  id: string;
  source: ImageSourcePropType;
  ratio: number;
};

const library = galleryFiles.keys().reduce<NpcGalleryImage[]>((images, key) => {
  const fileName = key.replace(/^\.\//, "");
  const id = fileName.replace(/\.(png|jpe?g|webp)$/i, "").toLowerCase();
  if (!/^[a-z0-9_-]+\d+$/.test(id) || images.some((item) => item.id === id)) {
    return images;
  }

  const imported = galleryFiles(key);
  const source = (imported?.default ?? imported) as ImageSourcePropType;
  const metadata = typeof source === "object" && source !== null && !Array.isArray(source)
    ? source
    : null;
  const ratio = metadata && "width" in metadata && "height" in metadata
    && typeof metadata.width === "number" && typeof metadata.height === "number"
    && metadata.width > 0 && metadata.height > 0
      ? metadata.width / metadata.height
      : 1;
  images.push({ id, source, ratio });
  return images;
}, []);


export function getNpcGalleryImages(npcId: string | null | undefined): NpcGalleryImage[] {
  if (!npcId) return [];
  const prefix = npcId.toLowerCase();
  return library
    .filter((image) => image.id.startsWith(prefix) && /^\d+$/.test(image.id.slice(prefix.length)))
    .sort((a, b) =>
      Number(a.id.slice(prefix.length)) - Number(b.id.slice(prefix.length)) ||
      a.id.localeCompare(b.id),
    );
}
