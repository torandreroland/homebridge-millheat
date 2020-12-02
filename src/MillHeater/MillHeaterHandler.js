'use strict';

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

  async getHeatingThresholdTemperature(callback) {
    await Promise.all([this.roomInfo ? this.roomInfo.update() : Promise.resolve(), this.device.update()]);
    let tresholdTemperature = 0;
    if (this.device.isIndependent()) {
      tresholdTemperature = this.device.getTresholdTemperature();
    } else {
      tresholdTemperature = this.roomInfo.getTresholdTemperature();
    }
    this.logger.debug(`getting HeatingThresholdTemperature ${tresholdTemperature}`);
    callback(null, tresholdTemperature);
  }

  async setHeatingThresholdTemperature(value, callback) {
    this.logger.debug(`setting HeatingThresholdTemperature ${value}`);
    this.targetTemp = value;
    if (this.device.isIndependent()) {
      await this.device.setTemperature(value);
    }
    callback();
  }

  async getActive(callback) {
    await this.device.update();
    const State = {
      INACTIVE: this.Characteristic.Active.INACTIVE,
      ACTIVE: this.Characteristic.Active.ACTIVE,
    };
    let currentState = State.INACTIVE;
    if (this.device.getPower()) {
      currentState = State.ACTIVE;
    }
    this.logger.debug(`getting Active ${currentState}`);
    callback(null, currentState);
  }

  async setActive(value, callback) {
    this.logger.debug(`setting Active ${value}`);
    if (this.device.getPower() && !value) {
      await this.device.setPower(false);
    } else if (!this.device.getPower() && value) {
      await this.device.setPower(true);
    }
    callback();
  }

  async getCurrentHeaterCoolerState(callback) {
    await this.device.update();
    const State = {
      INACTIVE: this.Characteristic.CurrentHeaterCoolerState.INACTIVE,
      IDLE: this.Characteristic.CurrentHeaterCoolerState.IDLE,
      HEATING: this.Characteristic.CurrentHeaterCoolerState.HEATING,
    };
    let currentState = State.IDLE;
    if (this.device.isHeating()) {
      currentState = State.HEATING;
    }
    this.logger.debug(`getting CurrentHeaterCoolerState ${currentState}`);
    callback(null, currentState);
  }

  async getTargetHeaterCoolerState(callback) {
    await this.device.update();
    const State = {
      AUTO: this.Characteristic.TargetHeaterCoolerState.AUTO,
      HEAT: this.Characteristic.TargetHeaterCoolerState.HEAT,
    };
    let currentState = State.AUTO;
    if (this.device.isIndependent()) {
      currentState = State.HEAT;
    }
    this.logger.debug(`getting TargetHeaterCoolerState ${currentState}`);
    callback(null, currentState);
  }

  async setTargetHeaterCoolerState(value, callback) {
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
  }

  async getCurrentTemperature(callback) {
    await this.device.update();
    const currentTemp = this.device.getTemperature();
    this.logger.debug(`getting CurrentTemperature ${currentTemp}`);
    callback(null, currentTemp);
  }

  async getValidCurrentHeaterCoolerState(callback) {
    await this.device.update();
    let values = [this.Characteristic.TargetHeaterCoolerState.AUTO, this.Characteristic.TargetHeaterCoolerState.HEAT];
    if (this.device.isTibberControlled()) {
      values = [this.Characteristic.TargetHeaterCoolerState.AUTO];
    } else if (this.device.isIndependent()) {
      values = [this.Characteristic.TargetHeaterCoolerState.HEAT];
    }
    callback(null, values);
  }
}

module.exports = MillHeaterHandler;
