// Wraps app.json. The names people see come from src/brand.ts (the words file), so a rename is one edit there:
// the name under the icon, the web name and description, and the microphone/speech permission prompts.
// PRATA_RAJA_WEB_BASE=/prata-raja is set only when exporting the web app for a site hosted under a
// sub-folder, so local dev and native builds keep the root path.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

/** src/brand.ts is pure data (`export const brandWords = {…};`), so it is evaluated as plain JavaScript. */
function readBrandWords(root = __dirname) {
  const text = readFileSync(join(root, 'src', 'brand.ts'), 'utf8');
  const head = /^export const brandWords = /m;
  if (!head.test(text)) throw new Error('src/brand.ts must be pure data starting with "export const brandWords ="');
  return new Function(text.replace(head, 'return '))();
}

/** The config with every user-facing name taken from the words file. Exported for the tests. */
function withBrand(config, words) {
  const name = words.appName;
  const plugins = (config.plugins ?? []).map((p) =>
    Array.isArray(p) && p[0] === 'expo-speech-recognition'
      ? [p[0], {
        ...p[1],
        microphonePermission: words.permissions.microphone,
        speechRecognitionPermission: words.permissions.speechRecognition,
      }]
      : p,
  );
  return {
    ...config,
    name,
    web: { ...config.web, name, shortName: words.shortName, description: words.description },
    plugins,
  };
}

module.exports = ({ config }) => ({
  ...withBrand(config, readBrandWords()),
  experiments: {
    ...config.experiments,
    ...(process.env.PRATA_RAJA_WEB_BASE ? { baseUrl: process.env.PRATA_RAJA_WEB_BASE } : {}),
  },
});
module.exports.withBrand = withBrand;
module.exports.readBrandWords = readBrandWords;
