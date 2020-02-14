'use strict';

let Service, Characteristic, UUIDGen;

class MillHeater {
  constructor(platform, data) {
    Characteristic = platform.homebridge.hap.Characteristic;
    Service = platform.homebridge.hap.Service;
    UUIDGen = platform.homebridge.hap.uuid;

    this.platform = platform;
    this.log = platform.log;
    this.data = data;
    this.name = data.deviceName;
    this.uuid = UUIDGen.generate(data.deviceId.toString());
    this.heaterCooler = new Service.HeaterCooler(this.name, this.uuid);

    this.services = {};

    this.setHeaterCoolerService();
    this.setAccessoryInformation();

    this.log('Creating new MillHeater %s (%s)...', this.name, this.uuid);
  }

  async update() {
    this.log('Updating MillHeater %s (%s)...', this.name, this.uuid);
    this.data = await this.platform.mill.getDevice(this.data.deviceId);
  }

  setAccessoryInformation() {
    this.accessoryInformation = new Service.AccessoryInformation();
    this.accessoryInformation.setCharacteristic(Characteristic.Manufacturer, 'mill');
    this.accessoryInformation.setCharacteristic(Characteristic.SerialNumber, this.data.mac);
    this.services['deviceInfo'] = this.accessoryInformation;
  }

  setHeaterCoolerService() {
    this.heaterCooler = new Service.HeaterCooler(this.name, this.uuid);
    this.services['heaterCooler'] = this.heaterCooler;
    this.heaterCooler
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', callback => callback(null, this.getCurrentTemperature()));
    this.heaterCooler
      .getCharacteristic(Characteristic.CurrentHeaterCoolerState)
      .on('get', callback => callback(null, this.getCurrentHeaterCoolerState()));
    this.heaterCooler
      .getCharacteristic(Characteristic.TargetHeaterCoolerState)
      .on('get', callback => callback(null, this.getTargetHeaterCoolerState()));
    this.heaterCooler.getCharacteristic(Characteristic.TargetHeaterCoolerState).on('set', (value, callback) => {
      this.log('Setting TargetHeaterCoolerState %s for %s (%s)...', value, this.name, this.uuid);
      callback();
    });
    this.heaterCooler.getCharacteristic(Characteristic.Active).on('get', callback => callback(null, this.getActive()));
    this.heaterCooler.getCharacteristic(Characteristic.Active).on('set', (value, callback) => {
      this.log('Setting Active %s for %s (%s)...', value, this.name, this.uuid);
      callback();
    });
  }

  getActive() {
    const values = {
      INACTIVE: 0,
      ACTIVE: 1,
    };
    if (this.data.powerStatus) {
      return values.ACTIVE;
    }
    return values.INACTIVE;
  }

  getCurrentHeaterCoolerState() {
    const values = {
      INACTIVE: 0,
      IDLE: 1,
      HEATING: 2,
      COOLING: 2,
    };
    if (this.data.heatStatus) {
      return values.HEATING;
    }
    if (this.data.coolingStatus) {
      return values.COOLING;
    }
    return values.IDLE;
  }

  getTargetHeaterCoolerState() {
    const values = {
      AUTO: 0,
      HEAT: 1,
      COOL: 2,
    };
    return values.AUTO;
  }

  getCurrentTemperature() {
    return this.data.currentTemp;
  }

  identify(callback) {
    this.log('Identify called for MillHeater %s (%s)', this.name, this.uuid);
    callback();
  }

  getServices() {
    const services = [];
    for (let id in this.services) {
      services.push(this.services[id]);
    }
    return services;
  }
}

module.exports = MillHeater;
