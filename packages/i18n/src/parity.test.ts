import { describe, it, expect } from 'vitest';
import { resources, NAMESPACES } from './index';
import { LOCALES, DEFAULT_LOCALE, isRTL, getDirection, resolveLocale } from './config';

/** Aplatit un objet imbriqué en un ensemble de chemins de clés « a.b.c ». */
function keyPaths(obj: Record<string, unknown>, prefix = ''): Set<string> {
  const paths = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const p of keyPaths(v as Record<string, unknown>, path)) paths.add(p);
    } else {
      paths.add(path);
    }
  }
  return paths;
}

describe('i18n — parité des clés entre langues', () => {
  const nonDefaultLocales = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

  for (const ns of NAMESPACES) {
    it(`namespace « ${ns} » : mêmes clés dans toutes les langues`, () => {
      const reference = keyPaths(resources[DEFAULT_LOCALE][ns]);
      for (const locale of nonDefaultLocales) {
        const other = keyPaths(resources[locale][ns]);
        const missing = [...reference].filter((k) => !other.has(k));
        const extra = [...other].filter((k) => !reference.has(k));
        expect(missing, `clés manquantes en ${locale}/${ns}`).toEqual([]);
        expect(extra, `clés en trop en ${locale}/${ns}`).toEqual([]);
      }
    });
  }
});

describe('i18n — helpers RTL', () => {
  it('l arabe est RTL, le reste LTR', () => {
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('fr')).toBe(false);
    expect(getDirection('ar')).toBe('rtl');
    expect(getDirection('en')).toBe('ltr');
  });

  it('resolveLocale gère Accept-Language et le fallback', () => {
    expect(resolveLocale('ar-TN')).toBe('ar');
    expect(resolveLocale('en-US,en;q=0.9')).toBe('en');
    expect(resolveLocale('de')).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(null)).toBe(DEFAULT_LOCALE);
  });
});
