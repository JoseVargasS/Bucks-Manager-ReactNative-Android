import * as SecureStore from "expo-secure-store";
import type { LanguageMode, Tag } from "../types";
import { dark } from "../theme/colors";

const TAGS_KEY = "bucks_tags";

const DEFAULT_TAGS = [
  { id: "default-salud", es: "Salud", en: "Health", color: dark.tagColors[0] },
  { id: "default-comida", es: "Comida", en: "Food", color: dark.tagColors[1] },
  { id: "default-viaje", es: "Viaje", en: "Travel", color: dark.tagColors[4] },
  { id: "default-transporte", es: "Transporte", en: "Transport", color: dark.tagColors[2] },
  { id: "default-ocio", es: "Ocio", en: "Leisure", color: dark.tagColors[5] },
  { id: "default-educacion", es: "Educación", en: "Education", color: dark.tagColors[3] },
];

const DEFAULT_TAG_IDS = new Set(DEFAULT_TAGS.map((tag) => tag.id));

function getDefaultTags(language: LanguageMode): Tag[] {
  return DEFAULT_TAGS.map((tag) => ({
    id: tag.id,
    label: tag[language],
    color: tag.color,
  }));
}

function normalizeTags(tags: Tag[], language: LanguageMode): Tag[] {
  const byLabel = new Map<string, Tag>();
  const otherDefaultLabels = new Set(
    DEFAULT_TAGS.map((tag) => tag[language === "en" ? "es" : "en"].toLowerCase()),
  );
  getDefaultTags(language).forEach((tag) => byLabel.set(tag.label.toLowerCase(), tag));
  tags.forEach((tag) => {
    const label = tag.label.trim();
    if (!label || DEFAULT_TAG_IDS.has(tag.id) || otherDefaultLabels.has(label.toLowerCase())) return;
    byLabel.set(label.toLowerCase(), { ...tag, label });
  });
  return Array.from(byLabel.values());
}

export async function loadTags(language: LanguageMode = "es"): Promise<Tag[]> {
  try {
    const raw = await SecureStore.getItemAsync(TAGS_KEY);
    const tags = normalizeTags(raw ? JSON.parse(raw) : [], language);
    await saveTags(tags);
    return tags;
  } catch {
    return normalizeTags([], language);
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
