/**********************************
* node_helper for EXT-Screen v1.3 *
* BuGsounet ©03/22                *
**********************************/

const NodeHelper = require('node_helper')
const LibScreen = require("./components/screenLib.js")
const LibCron = require("./components/cronJob.js")
var log = (...args) => { /* do nothing */ }

module.exports = NodeHelper.create({
  start: function() {
    this.lib = {}
  },

  socketNotificationReceived: function (notification, payload) {
    switch(notification) {
      case "INIT":
        this.config = payload
        this.initialize()
        break
      case "WAKEUP":
        this.screen.wakeup()
        break
      case "FORCE_END":
        this.screen.forceEnd()
        break
      case "LOCK":
        this.screen.lock()
        break
      case "UNLOCK":
        this.screen.unlock()
        break
        /*
      case "FORCELOCK":
        this.forceLocked = true
        this.screen.lock()
        break
      case "FORCEUNLOCK":
        this.forceLocked = false
        this.screen.unlock()
        break
      case "GH_FORCE_END":
        if (this.forceLocked) return log("[GH_FORCE_END] Sorry, it's Force-Locked!")
        this.screen.GHforceEndAndLock()
        this.forceLocked = true
        break
      case "GH_FORCE_WAKEUP":
        this.forceLocked = false
        this.screen.GHforceWakeUp()
        break
        */
    }
  },

  initialize: function () {
    if (this.config.debug) log = (...args) => { console.log("[SCREEN]", ...args) }
    console.log("[SCREEN] EXT-Screen Version:", require('./package.json').version, "rev:", require('./package.json').rev)
    var callbacks= {
      /** LibCron **/
      "ON": (noti) => {
        
      },
      "OFF": (noti) => {
        
      },
      "cronState": (param) => {
        this.screen.cronState(param)
      },
      /** LibScreen **/
      "sendSocketNotification": (noti, params) => {
        this.sendSocketNotification(noti, params)
        //log("Callback Notification:", noti,params)
      },
      "detector": (noti, param) => {
        log("Callback Detector:", noti)
        this.sendSocketNotification(noti)
      },
      "governor": (noti, param) => {
        log("Callback Governor:", noti)
        this.sendSocketNotification(noti)
      },
    }

    this.screen = new LibScreen(this.config, callbacks)
    this.cron = new LibCron(this.config, callbacks)

    this.screen.activate()
    this.cron.start()
    this.sendSocketNotification("INITIALIZED")
  }
});
