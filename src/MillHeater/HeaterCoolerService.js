'use strict';

const UPDATE_INTERVAL = 5 * 60 * 1000;

class HeaterCoolerService {
  constructor(platform, name, uuid, handler) {
    const Characteristic = platform.homebridge.hap.Characteristic;
    this.Characteristic = Characteristic;
    const Service = platform.homebridge.hap.Service;
    this.handler = handler;
    this.service = new Service.HeaterCooler(name, uuid);
    this.service
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.handler.getCurrentTemperature.bind(handler));
    const CurrentHeaterCoolerState = Characteristic.CurrentHeaterCoolerState;
    this.service
      .getCharacteristic(CurrentHeaterCoolerState)
      .setProps({
        validValues: [
          CurrentHeaterCoolerState.INACTIVE,
          CurrentHeaterCoolerState.IDLE,
          CurrentHeaterCoolerState.HEATING,
        ],
      })
      .on('get', this.handler.getCurrentHeaterCoolerState.bind(handler));
    const TargetHeaterCoolerState = Characteristic.TargetHeaterCoolerState;
    this.service
      .getCharacteristic(TargetHeaterCoolerState)
      .on('get', this.handler.getTargetHeaterCoolerState.bind(handler))
      .on('set', this.handler.setTargetHeaterCoolerState.bind(handler));
    this.handler.getValidCurrentHeaterCoolerState((error, validValues) => {
      this.service.getCharacteristic(TargetHeaterCoolerState).setProps({ validValues });
    });
    this.service
      .getCharacteristic(Characteristic.Active)
      .on('get', this.handler.getActive.bind(handler))
      .on('set', this.handler.setActive.bind(handler));
    this.service
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .on('get', this.handler.getHeatingThresholdTemperature.bind(handler))
      .on('set', this.handler.setHeatingThresholdTemperature.bind(handler))
      .setProps({
        minStep: platform.config.minStep || 1,
        minValue: platform.config.minTemp || 5,
        maxValue: platform.config.minTemp || 35,
      });
    this.updateInterval = setInterval(this.periodicUpdate.bind(this), UPDATE_INTERVAL);
  }

  getService() {
    return this.service;
  }

  periodicUpdate() {
    this.handler.getHeatingThresholdTemperature((error, value) => {
      this.service.updateCharacteristic(this.Characteristic.HeatingThresholdTemperature, value);
    });
    this.handler.getCurrentHeaterCoolerState((error, value) => {
      this.service.updateCharacteristic(this.Characteristic.CurrentHeaterCoolerState, value);
    });
    this.handler.getActive((error, value) => {
      this.service.updateCharacteristic(this.Characteristic.Active, value);
    });
    this.handler.getCurrentTemperature((error, value) => {
      this.service.updateCharacteristic(this.Characteristic.CurrentTemperature, value);
    });
  }
}

module.exports = HeaterCoolerService;
