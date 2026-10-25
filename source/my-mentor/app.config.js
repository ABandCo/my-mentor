// Reads app.json and lets the build profile choose the Android target level.
// Sideload builds (preview) keep 34. The Google Play build ("play" profile) sets MM_TARGET_SDK=36, which Google
// requires for new apps and updates from 31 Aug 2026.
module.exports = ({ config }) => {
  const target = Number(process.env.MM_TARGET_SDK || 34);
  return {
    ...config,
    plugins: (config.plugins || []).map((p) =>
      Array.isArray(p) && p[0] === 'expo-build-properties' ? ['expo-build-properties', { ...p[1], android: { ...(p[1] && p[1].android), targetSdkVersion: target } }] : p,
    ),
  };
};
