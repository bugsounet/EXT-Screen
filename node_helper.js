/*****************************
* node_helper for EXT-Screen *
* BuGsounet                  *
*****************************/

const NodeHelper = require("node_helper");
var log = (...args) => { /* do nothing */ };

module.exports = NodeHelper.create({
  socketNotificationReceived (notification, payload) {
    switch(notification) {
      case "INIT":
        this.config = payload;
        this.initialize();
        break;
    }
  },

  initialize () {
    if (this.config.debug) log = (...args) => { console.log("[SCREEN]", ...args); };
    console.log("[SCREEN] EXT-Screen Version:", require("./package.json").version, "rev:", require("./package.json").rev);
    this.sendSocketNotification("INITIALIZED");
  }
});
