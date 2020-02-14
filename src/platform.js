'use strict';

const Heater = require('./heater.js');
const Mill = require('../lib/mill');

class MillPlatform {
  constructor(log, config, homebridge) {
    this.log = log;
    this.config = config;
    this.homebridge = homebridge;
    this.mill = new Mill(config.username, config.password);

    this.homebridge.on('didFinishLaunching', () => {
      this.log('didFinishLaunching');
    });
  }

  async getAllHeaters() {
    const homes = await this.mill.getHomes();
    const deviceIds = [];
    const independentDevices = await Promise.all(
      homes.homeList.map(home => this.mill.getIndependentDevices(home.homeId))
    );
    independentDevices.forEach(independentDevice => {
      independentDevice.deviceInfo.forEach(device => {
        deviceIds.push(device.deviceId);
      });
    });
    const rooms = await Promise.all(homes.homeList.map(home => this.mill.getRooms(home.homeId)));
    const roomIds = [];
    rooms.forEach(roomPerHome => {
      roomPerHome.roomInfo.forEach(roomInfo => {
        roomIds.push(roomInfo.roomId);
      });
    });

    const devicesByRoom = await Promise.all(roomIds.map(roomId => this.mill.getDevicesByRoom(roomId)));
    devicesByRoom.forEach(room => {
      room.deviceInfo.forEach(deviceInfo => {
        deviceIds.push(deviceInfo.deviceId);
      });
    });
    this.log('Found devices %s', deviceIds);
    const devices = await Promise.all(deviceIds.map(deviceId => this.mill.getDevice(deviceId)));
    return devices.map(device => new Heater(this, device));
  }

  async accessories(callback) {
    this.log('Getting accessories...');
    const heaters = await this.getAllHeaters();
    callback(heaters);
  }
}

module.exports = MillPlatform;
