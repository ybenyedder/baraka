// Lint du mobile (Expo SDK 52, React Native). Flat config ESLint 9.
// eslint-config-expo/flat connaît les globals React Native et les plugins RN/react-hooks.
const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['dist/*', '.expo/*'],
  },
];
