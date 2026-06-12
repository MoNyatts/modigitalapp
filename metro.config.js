const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // Keep Metro's watcher away from native build output, which churns
    // heavily during Gradle/CMake builds and can crash the dev server.
    blockList: /(.*[/\\]android[/\\]\.cxx[/\\].*|.*[/\\]android[/\\]build[/\\].*|.*[/\\]ios[/\\]build[/\\].*)/,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
