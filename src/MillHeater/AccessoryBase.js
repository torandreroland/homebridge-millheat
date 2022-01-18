'use strict';

class AccessoryBase {
  constructor(platform, type, name, deviceId) {
    this.deviceId = deviceId;
    this.platform = platform;
    this.name = name;
    this.uuid = platform.homebridge.hap.uuid.generate(deviceId.toString());
    this.log = platform.log;
    this.logger = this.getLogger(type);
    this.services = {};
  }

  getLogger = (type) => {
    const prefix = `${type}[${this.uuid}] `;
    const log = this.log;
    return {
      info: (message) => log.info(`${prefix}${message}`),
      error: (message) => log.error(`${prefix}${message}`),
      debug: (message) => log.debug(`${prefix}${message}`),
    };
  };

  identify(callback) {
    this.logger.info('identify');
    callback();
  }

  addService(name, service) {
    this.services[name] = service;
  }

  getServices() {
    const services = [];
    this.services.forEach((id) => {
      services.push(this.services[id]);
    });
    return services;
  }
}

module.exports = AccessoryBase;
