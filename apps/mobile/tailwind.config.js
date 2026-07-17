/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Palette de marque Baraka (alignée sur apps/web — « look TGTG »).
      colors: {
        pine: '#005248',
        'pine-soft': '#0a6b5c',
        cream: '#fff7e9',
        'cream-deep': '#faf1e2',
        yellow: '#ffc42d',
        ink: '#1a1a1a',
        // Alias conservés le temps de la migration des anciens écrans.
        brand: '#005248',
        'brand-ink': '#005248',
        sand: '#fff7e9',
      },
      // En RN chaque graisse est une famille distincte (pas de synthèse de gras).
      fontFamily: {
        display: ['Baloo2_700Bold'],
        'display-sb': ['Baloo2_600SemiBold'],
        'display-xb': ['Baloo2_800ExtraBold'],
        sans: ['Nunito_400Regular'],
        'sans-sb': ['Nunito_600SemiBold'],
        'sans-bold': ['Nunito_700Bold'],
        'sans-xb': ['Nunito_800ExtraBold'],
      },
    },
  },
  plugins: [],
};
