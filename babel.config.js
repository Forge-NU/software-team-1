module.exports = function (api) {
  api.cache(true);
  return {
    // jsxImportSource lets every core component accept a `className` prop (NativeWind)
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
