const { command, authenticate } = require('./api');

const REFRESH_OFFSET = 5 * 60 * 1000;

class Mill {
  constructor(username, password, debug = false) {
    this.debug = debug;
    this.username = username;
    this.password = password;
    this._authenticate();
    this.initialized = false;
  }

  async _authenticate() {
    const auth = await authenticate(this.username, this.password, this.debug);
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
        if (this.debug) {
          console.log('[DEBUG] Refreshing token');
        }
        await this._authenticate();
      }
      return await command(this.userId, this.token, commandName, payload, this.debug);
    } catch (e) {
      console.error("Couldn't perform command:" + e.message);
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
}

module.exports = Mill;
