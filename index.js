'use strict';

const platform = require('./src/platform');

module.exports = function(homebridge) {
  homebridge.registerPlatform('homebridge-millheat', 'millheat', platform);
};
