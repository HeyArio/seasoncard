import raw from "@/data/seasons.json";
import { SEASON_IDS, type SeasonIdT } from "./schemas";

export interface Swatch { hex: string; name: string }
export interface AvoidSwatch extends Swatch { why: string }
export interface CapsuleItem { item: string; colorName: string; hex: string; search: string }
export interface Season {
  id: SeasonIdT;
  name: string;
  family: "spring" | "summer" | "autumn" | "winter";
  tagline: string;
  description: string;
  traits: { undertone: string; depth: string; contrast: string; chroma: string };
  cardSwatches: string[];
  palette: Swatch[];
  neutrals: Swatch[];
  avoid: AvoidSwatch[];
  lips: Swatch[];
  blush: Swatch[];
  eyes: Swatch[];
  hair: Swatch[];
  metals: { best: string; good: string; skip: string };
  celebrities: string[];
  neighbors: string[];
  stylingTips: string[];
  capsule: CapsuleItem[];
}

const library = raw as unknown as Partial<Record<string, Season>>;

export const isSeasonId = (s: string): s is SeasonIdT => (SEASON_IDS as readonly string[]).includes(s);

export function seasonName(id: string): string {
  return id.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

export function familyOf(id: string): Season["family"] {
  const f = id.split("-")[1];
  return (["spring", "summer", "autumn", "winter"].includes(f) ? f : "autumn") as Season["family"];
}

/** Neutral per-family swatches used only if the season library is missing an entry. */
const FAMILY_FALLBACK: Record<Season["family"], string[]> = {
  spring: ["#E8A87C", "#F2C57C", "#8FB573", "#6FA8A1"],
  summer: ["#B8A1C9", "#9BB0C9", "#C7A3AE", "#8FA9A3"],
  autumn: ["#B5705A", "#8A8F5E", "#C9A27E", "#5F7F82"],
  winter: ["#2F3E75", "#A0224B", "#1F6F6B", "#5B2D6E"],
};

/**
 * Look up a season. Always returns something renderable: when the library has no entry,
 * `complete` is false and only the name/family/card swatches are meaningful.
 */
export function getSeason(id: string): { season: Season; complete: boolean } {
  const s = library[id];
  if (s && Array.isArray(s.palette) && s.palette.length > 0) {
    return { season: { ...s, cardSwatches: (s.cardSwatches?.length ? s.cardSwatches : s.palette.slice(0, 4).map((p) => p.hex)).slice(0, 4) }, complete: true };
  }
  const family = familyOf(id);
  return {
    complete: false,
    season: {
      id: (isSeasonId(id) ? id : "soft-autumn") as SeasonIdT,
      name: seasonName(id),
      family,
      tagline: "",
      description: "",
      traits: { undertone: "", depth: "", contrast: "", chroma: "" },
      cardSwatches: FAMILY_FALLBACK[family],
      palette: [], neutrals: [], avoid: [], lips: [], blush: [], eyes: [], hair: [],
      metals: { best: "", good: "", skip: "" },
      celebrities: [], neighbors: [], stylingTips: [], capsule: [],
    },
  };
}

/** Readable text colour (ink or white) for a given background hex. */
export function textOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.4 ? "#211C18" : "#FFFFFF";
}
