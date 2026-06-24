import * as SecureStore from "expo-secure-store";
import type { Tag } from "../types";
import { dark } from "../theme/colors";

const TAGS_KEY = "bucks_tags";

const DEFAULT_TAGS: Tag[] = [
  { id: "default-salud", label: "Salud", color: dark.tagColors[0] },
  { id: "default-comida", label: "Comida", color: dark.tagColors[1] },
  { id: "default-viaje", label: "Viaje", color: dark.tagColors[4] },
  { id: "default-transporte", label: "Transporte", color: dark.tagColors[2] },
  { id: "default-ocio", label: "Ocio", color: dark.tagColors[5] },
  { id: "default-educacion", label: "Educación", color: dark.tagColors[3] },
];

function normalizeTags(tags: Tag[]): Tag[] {
  const byLabel = new Map<string, Tag>();
  [...DEFAULT_TAGS, ...tags].forEach((tag) => {
    const label = tag.label.trim();
    if (label) byLabel.set(label.toLowerCase(), { ...tag, label });
  });
  return Array.from(byLabel.values());
}

export async function loadTags(): Promise<Tag[]> {
  try {
    const raw = await SecureStore.getItemAsync(TAGS_KEY);
    const tags = normalizeTags(raw ? JSON.parse(raw) : []);
    await saveTags(tags);
    return tags;
  } catch {
    return normalizeTags([]);
  }
}

export async function saveTags(tags: Tag[]): Promise<void> {
  await SecureStore.setItemAsync(TAGS_KEY, JSON.stringify(tags));
}

export function abbreviateTag(label: string): string {
  if (label.length <= 6) return label;
  return label.slice(0, 5) + ".";
}

export function tagTextColor(color: string): string {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return dark.tagTextLight;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150
    ? dark.tagTextDark
    : dark.tagTextLight;
}
