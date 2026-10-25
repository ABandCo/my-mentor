// Android release tweaks for sideloaded installs:
// 1. Build only arm64-v8a (all modern phones) → much smaller APK. Set MM_ALL_ABIS=1 to keep every CPU type
//    (used only for the PC emulator test build).
// 2. Sign with both v1 (JAR) and v2 schemes. Some OEM installers' security scanners
//    (e.g. ColorOS/OxygenOS) reject v2-only APKs with "problem parsing the package".
const { withAppBuildGradle, withGradleProperties } = require('expo/config-plugins');

const MARKER = '// my-mentor: release tweaks';
const ALL_ABIS = process.env.MM_ALL_ABIS === '1';

module.exports = function withAndroidRelease(config) {
  if (!ALL_ABIS) {
    config = withGradleProperties(config, (c) => {
      c.modResults = c.modResults.filter((p) => !(p.type === 'property' && p.key === 'reactNativeArchitectures'));
      c.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
      return c;
    });
  }

  config = withAppBuildGradle(config, (c) => {
    if (c.modResults.contents.includes(MARKER)) return c;
    c.modResults.contents += `
${MARKER}
android {
${ALL_ABIS ? '' : '    defaultConfig {\n        ndk { abiFilters "arm64-v8a" }\n    }\n'}    signingConfigs.configureEach {
        enableV1Signing = true
        enableV2Signing = true
    }
}
// Release signing from GitHub builds: MM_KEYSTORE points at the keystore file (see docs/GITHUB_BUILD.md). Without it the
// default (debug) signing is kept, which is what local test builds use.
if (System.getenv('MM_KEYSTORE')) {
    android {
        signingConfigs {
            mymentor {
                storeFile file(System.getenv('MM_KEYSTORE'))
                storePassword System.getenv('MM_KEYSTORE_PASSWORD')
                keyAlias System.getenv('MM_KEY_ALIAS') ?: 'mymentor'
                keyPassword System.getenv('MM_KEY_PASSWORD') ?: System.getenv('MM_KEYSTORE_PASSWORD')
                enableV1Signing = true
                enableV2Signing = true
            }
        }
        buildTypes {
            release { signingConfig signingConfigs.mymentor }
        }
    }
}
`;
    return c;
  });

  return config;
};
