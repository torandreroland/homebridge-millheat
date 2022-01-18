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

  _doUpdate = async () => {
    this.logger.debug('updating device...');
    try {
      this.data = await this.platform.mill.getDevice(this.deviceId);
      this.lastUpdate = new Date().getTime();
    } catch (e) {
      this.logger.error("couldn't update device");
    }
  };

  update = async () => {
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
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  };

  isIndependent = () => !this.roomId || this.data.isHoliday === 1;

  setIndependent = async (targetTemp, onOff) => {
    try {
      this.platform.mill
        .setIndependentControl(this.deviceId, targetTemp, onOff)
        .then(this._doUpdate())
        .then(() => {
          this.logger.debug(onOff ? 'independent mode set' : 'room mode set');
        });
    } catch (e) {
      this.logger.error(onOff ? "couldn't set independent mode" : "couldn't set room mode");
    }
  };

  getThresholdTemperature = () => this.data.holidayTemp;

  setTemperature = async (value) => {
    try {
      await this.platform.mill.setTemperature(this.deviceId, value);
      await this._doUpdate();
      this.logger.debug(`temperature set to ${value}`);
    } catch (e) {
      this.logger.error("couldn't set temperature");
    }
  };

  isTibberControlled = () => !!this.data.tibberControl;

  getPower = () => (this.data.tibberControl ? !!this.data.heatStatus : !!this.data.powerStatus);

  getTemperature = () => this.data.currentTemp;

  isHeating = () => !!this.data.heatStatus;

  setPower = async (onOff) => {
    try {
      this.platform.mill.setPower(this.deviceId, onOff).then(() => {
        this._doUpdate();
        this.logger.debug(`power set to ${onOff}`);
      });
    } catch (e) {
      this.logger.error(`couldn't set power to ${onOff}`);
    }
  };
}

module.exports = Device;
