const platform = require('./src/platform');

module.exports = (homebridge) => {
  homebridge.registerPlatform('homebridge-millheat', 'millheat', platform);
};
