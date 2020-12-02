'use strict';

const UPDATE_INTERVAL = 60 * 1000;

class Device {
  constructor(platform, deviceId, roomId, logger) {
    this.lastUpdate = 0;
    this.platform = platform;
    this.updating = false;
    this.data = null;
    this.deviceId = deviceId;
    this.roomId = roomId;
    this.logger = logger;
    this._doUpdate();
  }

  async _doUpdate() {
    this.logger.debug('updating device...');
    try {
      this.data = await this.platform.mill.getDevice(this.deviceId);
      this.lastUpdate = new Date().getTime();
    } catch (e) {
      this.logger.error("couldn't update device");
    }
  }

  async update() {
    if (!this.updating) {
      this.updating = true;
      const timeDiff = new Date().getTime() - this.lastUpdate;
      if (timeDiff > UPDATE_INTERVAL) {
        await this._doUpdate();
      } else {
        this.logger.debug('update throttling...');
      }
      this.updating = false;
    } else {
      while (this.updating) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  isIndependent() {
    return !this.roomId || this.data.isHoliday === 1;
  }

  async setIndependent(targetTemp, onOff) {
    try {
      await this.platform.mill.setIndependentControl(this.deviceId, targetTemp, onOff);
      await this._doUpdate();
      this.logger.debug(onOff ? 'independent mode set' : 'room mode set');
    } catch (e) {
      this.logger.error(onOff ? "couldn't set independent mode" : "couldn't set room mode");
    }
  }

  getTresholdTemperature() {
    return this.data.holidayTemp;
  }

  async setTemperature(value) {
    try {
      await this.platform.mill.setTemperature(this.deviceId, value);
      await this._doUpdate();
      this.logger.debug(`temperature set to ${value}`);
    } catch (e) {
      this.logger.error("couldn't set temperature");
    }
  }

  getPower() {
    if (this.data.tibberControl) {
      return !!this.data.heatStatus;
    }
    return !!this.data.powerStatus;
  }

  getTemperature() {
    return this.data.currentTemp;
  }

  isHeating() {
    return !!this.data.heatStatus;
  }

  async setPower(onOff) {
    try {
      await this.platform.mill.setPower(this.deviceId, onOff);
      await this._doUpdate();
      this.logger.debug(`power set to ${onOff}`);
    } catch (e) {
      this.logger.error(`couldn't set power to ${onOff}`);
    }
  }
}

module.exports = Device;
