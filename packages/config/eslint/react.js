import base from './base.js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Config ESLint pour les apps React (web) et React Native (mobile).
 * Ajoute les globals navigateur, les règles des Hooks React (parité avec le mobile
 * qui les a via eslint-config-expo), et la règle RTL « pas de left/right littéral »
 * (appliquée aussi via Tailwind/NativeWind — voir packages/config/eslint/README-rtl.md).
 *
 * NB : on n'ajoute PAS eslint-plugin-react complet — `react/no-unescaped-entities`
 * noierait une app française sous les apostrophes (« l'invendu », « d'un »…).
 */
export default [
  ...base,
  {
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Décourage les propriétés de style directionnelles physiques au profit des logiques (RTL).
      'no-restricted-syntax': [
        'warn',
        {
          selector:
            "JSXAttribute[name.name='style'] Property[key.name=/^(left|right|marginLeft|marginRight|paddingLeft|paddingRight)$/]",
          message:
            'Utilise des propriétés logiques (start/end) pour la compatibilité RTL au lieu de left/right.',
        },
      ],
    },
  },
];
