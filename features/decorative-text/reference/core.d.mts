export type ReviewStatus = 'draft' | 'reviewed';
export interface Style {
  id: string; label: string; family: string; tags: string[];
  map: Record<string, string>; digitMode: 'convert' | 'preserve';
  casePreserving: boolean; approximate: boolean; note: string;
  cautions: string[]; reviewStatus: ReviewStatus;
}
export interface Category { id: string; label: string; tags: string[]; }
interface DecorationBase {
  id: string; label: string; categoryId: string; tags: string[];
  cautions: string[]; reviewStatus: ReviewStatus;
}
export type Decoration = DecorationBase & (
  { kind: 'snippet'; text: string } |
  { kind: 'wrap'; prefix: string; suffix: string } |
  { kind: 'template'; template: string }
);
export const LIMITS: Readonly<{ inputGraphemes: number; inputUtf16: number; outputGraphemes: number }>;
export function splitGraphemes(text: string): string[];
export function measureText(text: string): { graphemes: number | null; codePoints: number; utf16: number };
export function inspectText(text: string): { hasBidiControls: boolean; hasInvisibleControls: boolean; hasOtherControls: boolean };
export function convertText(text: string, style?: Style | null): string;
export function decorateText(text: string, decoration?: Decoration | null): string;
export function composeText(text: string, options?: { style?: Style | null; decoration?: Decoration | null }): string;
export function replaceSelection(text: string, insertion: string, start?: number, end?: number): {
  text: string; selectionStart: number; selectionEnd: number; replacedStart: number; replacedEnd: number;
};
export function normalizeSearch(value: string): string;
export function filterDecorations(decorations: Decoration[], options?: {
  query?: string; categoryId?: string | null; kind?: Decoration['kind'] | null; favoriteIds?: string[] | null;
}): Decoration[];
export function createCatalog(data: { styles: Style[]; decorations: Decoration[]; categories: Category[] }): {
  getStyle(id: string | null): Style | null;
  getDecoration(id: string | null): Decoration | null;
  compose(source: string, options?: { styleId?: string | null; decorationId?: string | null }): string;
};
export interface Preferences { version: 1; favorites: string[]; settings: { density: 'comfortable' | 'compact' }; }
export function parsePreferences(raw: string | null, validFavoriteIds: string[]): {
  status: 'empty' | 'ok' | 'invalid' | 'future-version'; value: Preferences;
};
