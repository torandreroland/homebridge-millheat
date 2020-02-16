'use strict';

const AccessoryBase = require('./AccessoryBase');
const AccessoryInformationService = require('./AccessoryInformationService');
const HeaterCoolerService = require('./HeaterCoolerService');
const MillHeaterHandler = require('./MillHeaterHandler');

class MillHeater extends AccessoryBase {
  constructor(platform, name, mac, deviceId, homeId, roomId) {
    super(platform, 'MillHeater', name, deviceId);

    this.handler = new MillHeaterHandler(platform, deviceId, homeId, roomId, this.logger);
    this.accessoryInformationService = new AccessoryInformationService(platform, mac);
    this.heaterCoolerService = new HeaterCoolerService(platform, this.name, this.uuid, this.handler, !roomId);
    this.addService('accessoryInformation', this.accessoryInformationService.getService());
    this.addService('heaterCooler', this.heaterCoolerService.getService());

    this.logger.info(`creating: { name: ${this.name}, id: ${deviceId} }`);
  }
}

module.exports = MillHeater;
