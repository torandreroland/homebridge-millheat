'use strict';

let Service, Characteristic, UUIDGen;

class MillHeater {
  constructor(platform, device, homeId, roomInfo) {
    Characteristic = platform.homebridge.hap.Characteristic;
    Service = platform.homebridge.hap.Service;
    UUIDGen = platform.homebridge.hap.uuid;

    this.deviceId = device.deviceId;
    this.lastUpdate = new Date().getTime();
    this.device = device;
    this.independent = !roomInfo;
    this.roomInfo = roomInfo;
    this.homeId = homeId;
    this.platform = platform;
    this.name = device.deviceName;
    this.uuid = UUIDGen.generate(device.deviceId.toString());
    this.log = platform.log;
    this.logger = this.getLogger();
    this.heaterCooler = new Service.HeaterCooler(this.name, this.uuid);

    this.targetTemp = 0;

    this.services = {};

    this.setHeaterCoolerService();
    this.setAccessoryInformationService();

    this.logger.info(`creating: { name: ${device.deviceName}, id: ${device.deviceId} }`);
  }

  getLogger() {
    const prefix = `MillHeater[${this.uuid}] `;
    const log = this.log;
    return {
      info: message => log.info(`${prefix}${message}`),
      error: message => log.error(`${prefix}${message}`),
      debug: message => log.debug(`${prefix}${message}`),
    };
  }

  identify(callback) {
    this.logger.info('identify');
    callback();
  }

  getServices() {
    const services = [];
    for (let id in this.services) {
      services.push(this.services[id]);
    }
    return services;
  }

  async updateRoomInfo() {
    this.logger.debug('updating room...');
    try {
      const home = await this.platform.mill.getRooms(this.homeId);
      this.roomInfo = home.roomInfo.find(roomInfo => roomInfo.roomId === this.roomInfo.roomId);
    } catch (e) {
      this.logger.error("couldn't update room info");
    }
  }

  async updateDevice() {
    this.logger.debug('updating device...');
    try {
      this.device = await this.platform.mill.getDevice(this.deviceId);
      this.lastUpdate = new Date().getTime();
    } catch (e) {
      this.logger.error("couldn't update device");
    }
  }

  async checkUpdate() {
    if (!this.updating) {
      this.updating = true;
      const timeDiff = new Date().getTime() - this.lastUpdate;
      if (timeDiff > 60 * 1000) {
        await this.updateDevice();
        await this.updateRoomInfo();
      } else {
        this.logger.debug('update throttling...');
      }
      this.updating = false;
    }
  }

  setAccessoryInformationService() {
    this.accessoryInformation = new Service.AccessoryInformation();
    this.accessoryInformation
      .setCharacteristic(Characteristic.Manufacturer, 'mill')
      .setCharacteristic(Characteristic.Model, 'Heater')
      .setCharacteristic(Characteristic.SerialNumber, this.device.mac);
    this.services['accessoryInformation'] = this.accessoryInformation;
  }

  setHeaterCoolerService() {
    this.heaterCooler = new Service.HeaterCooler(this.name, this.uuid);
    this.services['heaterCooler'] = this.heaterCooler;
    this.heaterCooler
      .getCharacteristic(Characteristic.CurrentTemperature)
      .on('get', this.getCurrentTemperature.bind(this));
    const CurrentHeaterCoolerState = Characteristic.CurrentHeaterCoolerState;
    this.heaterCooler
      .getCharacteristic(CurrentHeaterCoolerState)
      .setProps({
        validValues: [
          CurrentHeaterCoolerState.INACTIVE,
          CurrentHeaterCoolerState.IDLE,
          CurrentHeaterCoolerState.HEATING,
        ],
      })
      .on('get', this.getCurrentHeaterCoolerState.bind(this));
    const TargetHeaterCoolerState = Characteristic.TargetHeaterCoolerState;
    this.heaterCooler
      .getCharacteristic(TargetHeaterCoolerState)
      .setProps({
        validValues: this.independent
          ? [TargetHeaterCoolerState.HEAT]
          : [TargetHeaterCoolerState.AUTO, TargetHeaterCoolerState.HEAT],
      })
      .on('get', this.getTargetHeaterCoolerState.bind(this))
      .on('set', this.setTargetHeaterCoolerState.bind(this));
    this.heaterCooler
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getActive.bind(this))
      .on('set', this.setActive.bind(this));
    this.heaterCooler
      .getCharacteristic(Characteristic.HeatingThresholdTemperature)
      .on('get', this.getHeatingThresholdTemperature.bind(this))
      .on('set', this.setHeatingThresholdTemperature.bind(this));
  }

  getThresholdTemperature() {
    let tresholdTemperature = 0;
    if (this.independent || this.device.isHoliday == 1) {
      tresholdTemperature = this.device.holidayTemp;
    } else {
      switch (this.roomInfo.currentMode) {
        case 1: {
          tresholdTemperature = this.roomInfo.comfortTemp;
          break;
        }
        case 2: {
          tresholdTemperature = this.roomInfo.sleepTemp;
          break;
        }
        case 3: {
          tresholdTemperature = this.roomInfo.awayTemp;
          break;
        }
      }
    }
    return tresholdTemperature;
  }

  async getHeatingThresholdTemperature(callback) {
    await this.checkUpdate();
    const tresholdTemperature = this.getThresholdTemperature();
    this.logger.debug(`getting HeatingThresholdTemperature ${tresholdTemperature}`);
    callback(null, tresholdTemperature);
  }

  async setHeatingThresholdTemperature(value, callback) {
    this.logger.debug(`setting HeatingThresholdTemperature ${value}`);
    this.targetTemp = value;
    if (this.device.isHoliday || this.independent) {
      try {
        await this.platform.mill.setTemperature(this.device.deviceId, value);
      } catch (e) {
        this.logger.error("couldn't set temperature");
      }
      await this.updateDevice();
    }
    callback();
  }

  async getActive(callback) {
    await this.checkUpdate();
    const State = {
      INACTIVE: Characteristic.Active.INACTIVE,
      ACTIVE: Characteristic.Active.ACTIVE,
    };
    let currentState = State.INACTIVE;
    if (this.device.powerStatus) {
      currentState = State.ACTIVE;
    }
    this.logger.debug(`getting Active ${currentState}`);
    callback(null, currentState);
  }

  async setActive(value, callback) {
    this.logger.debug(`setting Active ${value}`);
    if (this.device.powerStatus && !value) {
      this.logger.debug(`power off`);
      try {
        await this.platform.mill.setPower(this.device, this.getThresholdTemperature(), false);
      } catch (e) {
        this.logger.error("couldn't turn off");
      }
      await this.updateDevice();
    } else if (!this.device.powerStatus && value) {
      this.logger.debug(`power on`);
      try {
        await this.platform.mill.setPower(this.device, this.getThresholdTemperature(), true);
      } catch (e) {
        this.logger.error("couldn't turn off");
      }
      await this.updateDevice();
    } else {
      this.logger.debug(`no action`);
    }
    callback();
  }

  async getCurrentHeaterCoolerState(callback) {
    await this.checkUpdate();
    const State = {
      INACTIVE: Characteristic.CurrentHeaterCoolerState.INACTIVE,
      IDLE: Characteristic.CurrentHeaterCoolerState.IDLE,
      HEATING: Characteristic.CurrentHeaterCoolerState.HEATING,
    };
    let currentState = State.IDLE;
    if (this.device.heatStatus) {
      currentState = State.HEATING;
    }
    this.logger.debug(`getting CurrentHeaterCoolerState ${currentState}`);
    callback(null, currentState);
  }

  async getTargetHeaterCoolerState(callback) {
    await this.checkUpdate();
    const State = {
      AUTO: Characteristic.TargetHeaterCoolerState.AUTO,
      HEAT: Characteristic.TargetHeaterCoolerState.HEAT,
    };
    let currentState = State.AUTO;
    if (this.independent || this.device.isHoliday === 1) {
      currentState = State.HEAT;
    }
    this.logger.debug(`getting TargetHeaterCoolerState ${currentState}`);
    callback(null, currentState);
  }

  async setTargetHeaterCoolerState(value, callback) {
    const State = {
      AUTO: Characteristic.TargetHeaterCoolerState.AUTO,
      HEAT: Characteristic.TargetHeaterCoolerState.HEAT,
    };
    this.logger.debug(`setting TargetHeaterCoolerState ${value}`);
    if (value === State.AUTO && this.device.isHoliday) {
      this.logger.debug(`setting room mode`);
      try {
        await this.platform.mill.setIndependentControl(this.device, this.targetTemp, false);
      } catch (e) {
        this.logger.error(`couldn't set room mode`);
      }
      await this.updateDevice();
    } else if (value === State.HEAT && !this.device.isHoliday) {
      this.logger.debug(`setting independent mode`);
      try {
        await this.platform.mill.setIndependentControl(this.device, this.targetTemp, true);
      } catch (e) {
        this.logger.error(`couldn't set independent mode`);
      }
      await this.updateDevice();
    }

    callback();
  }

  async getCurrentTemperature(callback) {
    await this.checkUpdate();
    this.logger.debug(`getting CurrentTemperature ${this.device.currentTemp}`);
    callback(null, this.device.currentTemp);
  }
}

module.exports = MillHeater;
