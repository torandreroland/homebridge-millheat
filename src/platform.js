'use strict';

const Heater = require('./MillHeater');
const Mill = require('millheat-api');

class MillPlatform {
  constructor(log, config, homebridge) {
    this.log = log;
    this.config = config;
    this.homebridge = homebridge;
    this.mill = new Mill(config.username, config.password, { logger: this.getApiLogger() });

    this.homebridge.on('didFinishLaunching', () => {
      this.log.info('didFinishLaunching');
    });
  }

  getApiLogger() {
    const prefix = `MillHeater[API] `;
    const log = this.log;
    return {
      info: (message) => log.info(`${prefix}${message}`),
      error: (message) => log.error(`${prefix}${message}`),
      debug: (message) => log.debug(`${prefix}${message}`),
    };
  }

  async getAllHeaters() {
    const homes = await this.mill.getHomes();
    const ignoredDevices = this.config.ignoredDevices || [];
    const heaters = [];
    const homeDevicesByTypes = await Promise.all(homes.ownHouses.map((home) => this.mill.getHouseDevicesByType(home.id)));
    for (let i = 0; i < homeDevicesByTypes.length; i++) {
      const homeDevicesByType = homeDevicesByTypes[i];
      for (let j = 0; j < homeDevicesByType.length; j++) {
        const type = homeDevicesByType[j];
        if (['Sockets', 'Heater'].includes(type.deviceType)) {
          for (let k = 0; k < type.devices.length; k++) {
            const deviceInfo = type.devices[k];
            if (ignoredDevices.indexOf(deviceInfo.deviceId) < 0) {
              heaters.push(
                new Heater(
                  this,
                  deviceInfo.customName,
                  deviceInfo.macAddress,
                  deviceInfo.deviceId,
                  deviceInfo.houseId,
                  deviceInfo.roomId
                )
              );
            }
          }
        }
      }
    }

    this.log.info(
      'Found devices %s',
      heaters.map((item) => item.deviceId)
    );

    return heaters;
  }

  async accessories(callback) {
    this.log.info('Getting accessories...');
    const heaters = await this.getAllHeaters();
    callback(heaters);
  }
}

module.exports = MillPlatform;
