export type LanguageCode = 'en' | 'ar';
export const STRINGS: Record<LanguageCode, Record<string, string>>;
export function t(lang: LanguageCode, key: string): string;
