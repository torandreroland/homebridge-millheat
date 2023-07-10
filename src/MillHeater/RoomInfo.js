'use strict';

const MODES = {
  COMFORT: 'comfort',
  SLEEP: 'sleep',
  AWAY: 'away',
  WEEKLY_PROGRAM: 'weekly_program',
};

const UPDATE_INTERVAL = 5 * 60 * 1000;

class RoomInfo {
  constructor(platform, homeId, roomId, logger) {
    this.logger = logger;
    this.lastUpdate = 0;
    this.platform = platform;
    this.updating = false;
    this.data = null;
    this.homeId = homeId;
    this.roomId = roomId;
    this._doUpdate();
  }

  async _doUpdate() {
    this.logger.debug('updating room info...');
    try {
      const home = await this.platform.mill.getRooms(this.homeId);
      this.data = home.rooms.find(roomInfo => roomInfo.id === this.roomId);
      this.lastUpdate = new Date().getTime();
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
      switch (this.data.mode) {
        case MODES.COMFORT: {
          tresholdTemperature = this.data.roomComfortTemperature;
          break;
        }
        case MODES.SLEEP: {
          tresholdTemperature = this.data.roomSleepTemperature;
          break;
        }
        case MODES.AWAY: {
          tresholdTemperature = this.data.roomAwayTemperature;
          break;
        }
        case MODES.WEEKLY_PROGRAM: {
          switch (this.data.activeModeFromWeeklyProgram) {
            case MODES.COMFORT: {
              tresholdTemperature = this.data.roomComfortTemperature;
              break;
            }
            case MODES.SLEEP: {
              tresholdTemperature = this.data.roomSleepTemperature;
              break;
            }
            case MODES.AWAY: {
              tresholdTemperature = this.data.roomAwayTemperature;
              break;
            }
          }
          break;
        }
      }
      return tresholdTemperature;
    }
  }
}

module.exports = RoomInfo;
