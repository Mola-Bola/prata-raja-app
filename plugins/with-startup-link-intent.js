// Android: keep links that arrive while Prata Raja is still starting.
// Expo's ReactActivityDelegateWrapper.onNewIntent returns early until the app has loaded, and ReactActivity then
// calls Activity.onNewIntent, which does not store the intent, so the link is lost (an invite tapped a moment after
// launch opened Welcome). While React isn't up yet, make the new intent the activity's intent, so
// Linking.getInitialURL() (and src/features/links/useStartupLink.ts) sees it once JS starts.
const { withMainActivity } = require('expo/config-plugins');

const MARKER = 'prata-raja-startup-link';

module.exports = function withStartupLinkIntent(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    if (cfg.modResults.language !== 'kt') throw new Error('with-startup-link-intent expects a Kotlin MainActivity');
    if (!src.includes('import android.content.Intent')) src = src.replace('import android.os.Bundle', 'import android.content.Intent\nimport android.os.Bundle');
    const method = `
  // ${MARKER}: a link that arrives before React is running would otherwise be dropped (see plugins/with-startup-link-intent.js).
  override fun onNewIntent(intent: Intent) {
    val starting = try {
      reactActivityDelegate.currentReactContext == null
    } catch (e: Exception) {
      true
    }
    if (starting) setIntent(intent)
    super.onNewIntent(intent)
  }
`;
    const end = src.lastIndexOf('}');
    cfg.modResults.contents = `${src.slice(0, end)}${method}}\n`;
    return cfg;
  });
};
