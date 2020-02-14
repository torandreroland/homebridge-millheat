'use strict';

const Heater = require('./heater');
const Mill = require('./mill-api');

class MillPlatform {
  constructor(log, config, homebridge) {
    this.log = log;
    this.config = config;
    this.homebridge = homebridge;
    this.mill = new Mill(config.username, config.password, this.getApiLogger());

    this.homebridge.on('didFinishLaunching', () => {
      this.log.info('didFinishLaunching');
    });
  }

  getApiLogger() {
    const prefix = `MillHeater[API] `;
    const log = this.log;
    return {
      info: message => log.info(`${prefix}${message}`),
      error: message => log.error(`${prefix}${message}`),
      debug: message => log.debug(`${prefix}${message}`),
    };
  }

  async getAllHeaters() {
    const homes = await this.mill.getHomes();
    const ignoredDevices = this.config.ignoredDevices || [];
    const heaters = [];
    const independentDevices = await Promise.all(
      homes.homeList.map(home => this.mill.getIndependentDevices(home.homeId))
    );
    for (let i = 0; i < independentDevices.length; i++) {
      for (let j = 0; j < independentDevices[i].deviceInfo.length; j++) {
        const deviceId = independentDevices[i].deviceInfo[j].deviceId;
        if (ignoredDevices.indexOf(deviceId) < 0) {
          const device = await this.mill.getDevice(device.deviceId);
          heaters.push(new Heater(this, device));
        }
      }
    }
    const homeRooms = await Promise.all(homes.homeList.map(home => this.mill.getRooms(home.homeId)));
    for (let i = 0; i < homeRooms.length; i++) {
      for (let j = 0; j < homeRooms[i].roomInfo.length; j++) {
        const devicesByRoom = await this.mill.getDevicesByRoom(homeRooms[i].roomInfo[j].roomId);
        for (let k = 0; k < devicesByRoom.deviceInfo.length; k++) {
          if (ignoredDevices.indexOf(devicesByRoom.deviceInfo[k].deviceId) < 0) {
            const device = await this.mill.getDevice(devicesByRoom.deviceInfo[k].deviceId);
            heaters.push(new Heater(this, device, homeRooms[i].homeId, homeRooms[i].roomInfo[j]));
          }
        }
      }
    }

    this.log.info(
      'Found devices %s',
      heaters.map(item => item.deviceId)
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
