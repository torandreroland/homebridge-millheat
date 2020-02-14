const { command, authenticate } = require('./api');

const REFRESH_OFFSET = 5 * 60 * 1000;

class Mill {
  constructor(username, password, logger) {
    this.logger = logger || console;
    this.username = username;
    this.password = password;
    this._authenticate();
    this.initialized = false;
  }

  async _authenticate() {
    const auth = await authenticate(this.username, this.password, this.logger);
    this.token = auth.token;
    this.userId = auth.userId;
    this.tokenExpire = auth.tokenExpire;
    this.initialized = true;
  }

  async _command(commandName, payload) {
    while (!this.initialized) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    try {
      if (!this.token || new Date(this.tokenExpire).getTime() < new Date().getTime() - REFRESH_OFFSET) {
        this.logger.debug('Refreshing token');
        await this._authenticate();
      }
      return await command(this.userId, this.token, commandName, payload, this.logger);
    } catch (e) {
      this.logger.error("Couldn't perform command:" + e.message);
      throw e;
    }
  }

  async getHomes() {
    return await this._command('selectHomeList', {});
  }

  async getRooms(homeId) {
    return await this._command('selectRoombyHome', { homeId });
  }

  async getIndependentDevices(homeId) {
    return await this._command('getIndependentDevices', { homeId });
  }

  async getDevicesByRoom(roomId) {
    return await this._command('selectDevicebyRoom', { roomId });
  }

  async getDevice(deviceId) {
    return await this._command('selectDevice', { deviceId });
  }

  async setTemperature(deviceId, temperature) {
    return await this._command('changeDeviceInfo', {
      homeType: 0,
      deviceId,
      value: temperature,
      timeZoneNum: '+02:00',
      key: 'holidayTemp',
    });
  }

  async setIndependentControl(device, temp, enable) {
    return await this._command('deviceControl', {
      status: enable ? 1 : 0,
      deviceId: device.deviceId,
      operation: 1,
      holdTemp: temp,
      subDomain: device.subDomain,
      holdMins: 0,
      holdHours: 0,
    });
  }

  async setPower(device, temp, on) {
    return await this._command('deviceControl', {
      subDomain: device.subDomain,
      deviceId: device.deviceId,
      testStatus: 1,
      operation: 0,
      status: on ? 1 : 0,
      windStatus: device.fanStatus,
      holdTemp: temp,
      tempType: 0,
      powerLevel: 0,
    });
  }
}

module.exports = Mill;
