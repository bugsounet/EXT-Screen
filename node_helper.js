/*****************************
* node_helper for EXT-Screen *
* BuGsounet                  *
*****************************/

const NodeHelper = require("node_helper");
const LibScreen = require("./components/screenLib.js");
const LibCron = require("./components/cronJob.js");

var log = (...args) => { /* do nothing */ };

module.exports = NodeHelper.create({
  start () {
    this.lib = {};
  },

  socketNotificationReceived (notification, payload) {
    switch(notification) {
      case "INIT":
        this.config = payload;
        this.initialize();
        break;
      case "WAKEUP":
        this.screen.wakeup();
        break;
      case "FORCE_END":
        this.screen.forceEnd();
        break;
      case "LOCK":
        this.screen.lock();
        break;
      case "UNLOCK":
        this.screen.unlock();
        break;
      case "LOCK_FORCE_END":
        this.screen.forceLockOFF();
        break;
      case "LOCK_FORCE_WAKEUP":
        this.screen.forceLockON();
        break;
    }
  },

  initialize () {
    if (this.config.debug) log = (...args) => { console.log("[SCREEN]", ...args); };
    console.log("[SCREEN] EXT-Screen Version:", require("./package.json").version, "rev:", require("./package.json").rev);
    var callbacks= {
      /** LibCron **/
      cronState: (param) => {
        this.screen.cronState(param);
      },
      /** LibScreen **/
      sendSocketNotification: (noti, params) => {
        this.sendSocketNotification(noti, params);
        //log("Callback Notification:", noti,params)
      },
      detector: (noti, param) => {
        log("Callback Detector:", noti);
        this.sendSocketNotification(noti);
      },
      governor: (noti, param) => {
        log("Callback Governor:", noti);
        this.sendSocketNotification(noti);
      }
    };

    this.screen = new LibScreen(this.config, callbacks);
    this.cron = new LibCron(this.config, callbacks);

    this.screen.activate();
    this.cron.start();
    this.sendSocketNotification("INITIALIZED");
  }
});
