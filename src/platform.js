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
    const independentDevices = await Promise.all(
      homes.homeList.map((home) => this.mill.getIndependentDevices(home.homeId))
    );
    for (let i = 0; i < independentDevices.length; i++) {
      for (let j = 0; j < independentDevices[i].deviceInfo.length; j++) {
        const deviceId = independentDevices[i].deviceInfo[j].deviceId;
        if (ignoredDevices.indexOf(deviceId) < 0) {
          const device = await this.mill.getDevice(deviceId);
          heaters.push(new Heater(this, device.deviceId, device.mac, device.deviceId));
        }
      }
    }
    const homeRooms = await Promise.all(homes.homeList.map((home) => this.mill.getRooms(home.homeId)));
    for (let i = 0; i < homeRooms.length; i++) {
      const home = homeRooms[i];
      for (let j = 0; j < home.roomInfo.length; j++) {
        const roomInfo = home.roomInfo[j];
        const devicesByRoom = await this.mill.getDevicesByRoom(roomInfo.roomId);
        if (!devicesByRoom.deviceInfo) {
          continue;
        }
        for (let k = 0; k < devicesByRoom.deviceInfo.length; k++) {
          const deviceInfo = devicesByRoom.deviceInfo[k];
          if (ignoredDevices.indexOf(deviceInfo.deviceId) < 0) {
            heaters.push(
              new Heater(
                this,
                deviceInfo.deviceName,
                deviceInfo.mac,
                deviceInfo.deviceId,
                home.homeId,
                devicesByRoom.roomId
              )
            );
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
