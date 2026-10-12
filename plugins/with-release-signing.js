// Android: sign release APKs with Prata Raja's own key instead of the template's debug key.
// Prebuild's template signs `release` with debug.keystore. A phone only accepts an update to an installed app when the
// key is the same, so every APK of Prata Raja must use this one. It lives outside the repo (see docs/UPDATES.md):
//   ~/.prata-raja-secrets/prata-raja-release.jks + signing.properties (storeFile, storePassword, keyAlias, keyPassword)
// override the folder with PRATA_RAJA_SIGNING_DIR. Prebuild fails when the key is missing, so a debug-signed APK can't ship.
const { withAppBuildGradle } = require('expo/config-plugins');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MARKER = 'prata-raja-release-signing';

module.exports = function withReleaseSigning(config) {
  // On EAS Build the key is not on disk: EAS signs the release with the same key from its stored credentials.
  if (process.env.EAS_BUILD === 'true') return config;
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    const dir = process.env.PRATA_RAJA_SIGNING_DIR || path.join(os.homedir(), '.prata-raja-secrets');
    const props = path.join(dir, 'signing.properties');
    if (!fs.existsSync(props)) throw new Error(`Prata Raja release key not found: ${props} (restore it from ~/prata-raja/.secrets/, see docs/UPDATES.md)`);
    if (!/signingConfigs\s*\{[\s\S]*?\n    \}\n    buildTypes/.test(src)) throw new Error('with-release-signing: unexpected app/build.gradle layout');
    // 1. read the properties file; 2. a `release` signing config; 3. the release build type uses it.
    // A Groovy single-quoted string: only the backslash and the apostrophe need escaping. A replacement function keeps
    // `$` in a path from being read as a JavaScript replacement pattern.
    const groovy = props.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    src = src.replace(/\nandroid \{/, () => `\n// ${MARKER}\ndef appReleaseSigning = new Properties()\nnew File('${groovy}').withInputStream { appReleaseSigning.load(it) }\n\nandroid {`);
    src = src.replace(/(signingConfigs\s*\{\s*debug \{[\s\S]*?\n        \})\n    \}/, `$1
        release {
            storeFile file(appReleaseSigning['storeFile'])
            storePassword appReleaseSigning['storePassword']
            keyAlias appReleaseSigning['keyAlias']
            keyPassword appReleaseSigning['keyPassword']
        }
    }`);
    src = src.replace(/(release \{\s*\n\s*\/\/ Caution![\s\S]*?\n\s*\/\/ see [^\n]*\n\s*)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
    if (!src.includes('signingConfig signingConfigs.release') || !src.includes('keyPassword appReleaseSigning')) throw new Error('with-release-signing: could not patch app/build.gradle');
    cfg.modResults.contents = src;
    return cfg;
  });
};
