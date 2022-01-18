'use strict';

class AccessoryInformationService {
  constructor(platform, serialNumber) {
    const Characteristic = platform.homebridge.hap.Characteristic;
    const Service = platform.homebridge.hap.Service;

    this.service = new Service.AccessoryInformation();
    this.service
      .setCharacteristic(Characteristic.Manufacturer, 'mill')
      .setCharacteristic(Characteristic.Model, 'Heater')
      .setCharacteristic(Characteristic.SerialNumber, serialNumber);
  }

  getService = () => this.service;
}

module.exports = AccessoryInformationService;
