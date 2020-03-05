'use strict';

class HeaterCoolerService {
  constructor(platform, name, uuid, handler, independent = false) {
    const Characteristic = platform.homebridge.hap.Characteristic;
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
      .setProps({
        validValues: independent
          ? [TargetHeaterCoolerState.HEAT]
          : [TargetHeaterCoolerState.AUTO, TargetHeaterCoolerState.HEAT],
      })
      .on('get', this.handler.getTargetHeaterCoolerState.bind(handler))
      .on('set', this.handler.setTargetHeaterCoolerState.bind(handler));
    this.service
      .getCharacteristic(Characteristic.Active)
      .on('get', this.handler.getActive.bind(handler))
      .on('set', this.handler.setActive.bind(handler));
    this.service
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .on('get', this.handler.getHeatingThresholdTemperature.bind(handler))
      .on('set', this.handler.setHeatingThresholdTemperature.bind(handler))
      .setProps({
        minStep: 1
      });
  }

  getService() {
    return this.service;
  }
}

module.exports = HeaterCoolerService;
