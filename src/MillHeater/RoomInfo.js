'use strict';

const MODES = {
  COMFORT: 1,
  SLEEP: 2,
  AWAY: 3,
};

const UPDATE_INTERVAL = 5 * 60 * 1000;

class RoomInfo {
  constructor(platform, homeId, roomId, logger) {
    this.logger = logger;
    this.lastUpdate = new Date().getTime();
    this.platform = platform;
    this.updating = false;
    this.data = null;
    this.homeId = homeId;
    this.roomId = roomId;
    this._doUpdate();
  }

  async _doUpdate() {
    this.logger.debug('updating room...');
    try {
      const home = await this.platform.mill.getRooms(this.homeId);
      this.data = home.roomInfo.find(roomInfo => roomInfo.roomId === this.roomId);
    } catch (e) {
      this.logger.error("couldn't update room info");
    }
  }

  async update() {
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
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  getTresholdTemperature() {
    let tresholdTemperature = 20;
    if (this.data) {
      switch (this.data.currentMode) {
        case MODES.COMFORT: {
          tresholdTemperature = this.data.comfortTemp;
          break;
        }
        case MODES.SLEEP: {
          tresholdTemperature = this.data.sleepTemp;
          break;
        }
        case MODES.AWAY: {
          tresholdTemperature = this.data.awayTemp;
          break;
        }
      }
      return tresholdTemperature;
    }
  }
}

module.exports = RoomInfo;
