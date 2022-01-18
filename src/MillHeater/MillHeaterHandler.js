const RoomInfo = require('./RoomInfo');
const Device = require('./Device');

class MillHeaterHandler {
  constructor(platform, deviceId, homeId, roomId, logger) {
    this.logger = logger;
    this.Characteristic = platform.homebridge.hap.Characteristic;
    this.device = new Device(platform, deviceId, roomId, logger);
    this.roomInfo = roomId ? new RoomInfo(platform, homeId, roomId, logger) : null;

    this.targetTemp = 20;
  }

  getHeatingThresholdTemperature = async (callback) => {
    Promise.all([this.roomInfo ? this.roomInfo.update() : Promise.resolve(), this.device.update()]).then(() => {
      const thresholdTemperature =
        (this.device.isIndependent() ? this.device.getThresholdTemperature() : this.roomInfo.getTresholdTemperature()) /
        100;
      this.logger.debug(`getting HeatingThresholdTemperature ${thresholdTemperature}`);
      callback(null, thresholdTemperature);
    });
  };

  setHeatingThresholdTemperature = async (value, callback) => {
    this.logger.debug(`setting HeatingThresholdTemperature ${value}`);
    this.targetTemp = value;
    if (this.device.isIndependent()) {
      await this.device.setTemperature(value);
    }
    callback();
  };

  getActive = async (callback) => {
    this.device.update().finally(() => {
      const State = {
        INACTIVE: this.Characteristic.Active.INACTIVE,
        ACTIVE: this.Characteristic.Active.ACTIVE,
      };
      const currentState = this.device.getPower() ? State.ACTIVE : State.INACTIVE;
      this.logger.debug(`getting Active ${currentState}`);
      callback(null, currentState);
    });
  };

  setActive = async (value, callback) => {
    this.logger.debug(`setting Active ${value}`);
    if (this.device.getPower() && !value) {
      await this.device.setPower(false);
    } else if (!this.device.getPower() && value) {
      await this.device.setPower(true);
    }
    callback();
  };

  getCurrentHeaterCoolerState = async (callback) => {
    this.device.update().then(() => {
      const State = {
        INACTIVE: this.Characteristic.CurrentHeaterCoolerState.INACTIVE,
        IDLE: this.Characteristic.CurrentHeaterCoolerState.IDLE,
        HEATING: this.Characteristic.CurrentHeaterCoolerState.HEATING,
      };
      const currentState = this.device.isHeating() ? State.HEATING : State.IDLE;
      this.logger.debug(`getting CurrentHeaterCoolerState ${currentState}`);
      callback(null, currentState);
    });
  };

  getTargetHeaterCoolerState = async (callback) => {
    this.device.update().then(() => {
      const State = {
        AUTO: this.Characteristic.TargetHeaterCoolerState.AUTO,
        HEAT: this.Characteristic.TargetHeaterCoolerState.HEAT,
      };
      const currentState = this.device.isIndependent() ? State.HEAT : State.AUTO;
      this.logger.debug(`getting TargetHeaterCoolerState ${currentState}`);
      callback(null, currentState);
    });
  };

  setTargetHeaterCoolerState = async (value, callback) => {
    const State = {
      AUTO: this.Characteristic.TargetHeaterCoolerState.AUTO,
      HEAT: this.Characteristic.TargetHeaterCoolerState.HEAT,
    };
    this.logger.debug(`setting TargetHeaterCoolerState ${value}`);
    if (value === State.AUTO && this.device.isIndependent()) {
      await this.device.setIndependent(this.targetTemp, false);
    } else if (value === State.HEAT && !this.device.isHoliday) {
      await this.device.setIndependent(this.targetTemp, true);
    }

    callback();
  };

  getCurrentTemperature = async (callback) => {
    this.device.update().then(() => {
      const currentTemp = this.device.getTemperature() / 100;
      this.logger.debug(`getting CurrentTemperature ${currentTemp}`);
      callback(null, currentTemp);
    });
  };

  getValidCurrentHeaterCoolerState = async (callback) => {
    await this.device.update();
    let values = [this.Characteristic.TargetHeaterCoolerState.AUTO, this.Characteristic.TargetHeaterCoolerState.HEAT];

    if (this.device.isTibberControlled()) {
      values = [this.Characteristic.TargetHeaterCoolerState.AUTO];
    } else if (!this.device.roomId) {
      values = [this.Characteristic.TargetHeaterCoolerState.HEAT];
    }
    callback(null, values);
  };
}

module.exports = MillHeaterHandler;
