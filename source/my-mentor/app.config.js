// Reads app.json and lets the build profile choose the Android target level.
// Sideload builds (preview) keep 34. The Google Play build ("play" profile) sets MM_TARGET_SDK=36, which Google
// requires for new apps and updates from 31 Aug 2026.
const fs = require('fs');
// Push notifications from the server need Firebase's google-services.json (see docs/BUILD_AND_PUSH_STEPS.md).
// On EAS, store it as the file secret GOOGLE_SERVICES_JSON; locally, drop it next to this file. Without it the app still builds
// and falls back to notifications scheduled on the phone.
const googleServices = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync('./google-services.json') ? './google-services.json' : undefined);

module.exports = ({ config }) => {
  const target = Number(process.env.MM_TARGET_SDK || 34);
  return {
    ...config,
    android: { ...config.android, ...(googleServices ? { googleServicesFile: googleServices } : {}) },
    plugins: (config.plugins || []).map((p) =>
      Array.isArray(p) && p[0] === 'expo-build-properties' ? ['expo-build-properties', { ...p[1], android: { ...(p[1] && p[1].android), targetSdkVersion: target } }] : p,
    ),
  };
};
