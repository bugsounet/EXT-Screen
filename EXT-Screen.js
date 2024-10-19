/**************
*  EXT-Screen *
*  Bugsounet  *
**************/

var logScreen = (...args) => { /* do nothing */ };

Module.register("EXT-Screen", {
  requiresVersion: "2.28.0",
  defaults: {
    debug: false,
    detectorSleeping: false
  },

  start () {
    this.ignoreSender= [
      "MMM-GoogleAssistant",
      "MMM-Pir",
      "EXT-Screen",
      "EXT-Motion",
      "EXT-Keyboard",
      "EXT-StreamDeck"
    ];

    if (this.config.debug) logScreen = (...args) => { console.log("[SCREEN]", ...args); };
    this.ready = false;
    this.isForceLocked = false;
  },

  socketNotificationReceived (notification, payload) {
    switch(notification) {
      case "INITIALIZED":
        this.sendNotification("EXT_HELLO", this.name);
        this.ready = true;
        break;
      /*
      case "SCREEN_POWER":
        if (payload) {
          this.sendNotification("EXT_ALERT", {
            message: this.translate("ScreenPowerOn"),
            type: "information",
            sound: this.config.sound ? "modules/EXT-Screen/sounds/open.mp3" : null
          });
        } else {
          this.sendNotification("EXT_ALERT", {
            message: this.translate("ScreenPowerOff"),
            type: "information",
            sound: this.config.sound ? "modules/EXT-Screen/sounds/close.mp3" : null
          });
        }
        break;
      case "SCREEN_POWERSTATUS":
        this.sendNotification("EXT_SCREEN-POWER", payload);
        break;
      case "GOVERNOR_SLEEPING":
        this.sendNotification("EXT_GOVERNOR-SLEEPING");
        break;
      case "GOVERNOR_WORKING":
        this.sendNotification("EXT_GOVERNOR-WORKING");
        break;
      case "DETECTOR_START":
        this.sendNotification("EXT_DETECTOR-START");
        break;
      case "DETECTOR_STOP":
        this.sendNotification("EXT_DETECTOR-STOP");
        break;
      case "SCREEN_FORCELOCKED":
        this.screenDisplay.hideShowCounter(payload);
        this.isForceLocked = payload ? true : false;
        break;
      case "FORCE_LOCK_END":
        this.screenDisplay.showEXT();
        break;
      */
    }
  },

  async notificationReceived (notification, payload, sender) {
    if (notification === "GA_READY") {
      if (sender.name === "MMM-GoogleAssistant") {
        try {
          await this.scanPir();
          this.sendSocketNotification("INIT");
        } catch (e) {
          this.sendNotification("EXT_ALERT", {
            message: e,
            type: "error"
          });
        }
      }
    }
    if (!this.ready) return;
    switch(notification) {
      case "EXT_SCREEN-END":
        this.sendNotification("MMM_PIR-END");
        break;
      case "EXT_SCREEN-WAKEUP":
        this.sendNotification("MMM_PIR-WAKEUP");

        //if (this.ignoreSender.indexOf(sender.name) === -1) {
        this.sendNotification("EXT_ALERT", {
          message: this.translate("ScreenWakeUp", { VALUES: sender.name }),
          type: "information"
        });
        //}
        break;
      case "EXT_SCREEN-LOCK":
        this.sendNotification("MMM_PIR-LOCK");
        MM.getModules().withClass("MMM-Pir").enumerate((module) => {
          module.screenDisplay.hideMe();
        });
        //if (!this.isForceLocked) this.screenDisplay.hideEXT();
        //if (this.ignoreSender.indexOf(sender.name) === -1) {
        this.sendNotification("EXT_ALERT", {
          message: this.translate("ScreenLock", { VALUES: sender.name }),
          type: "information"
        });

        //}
        break;
      case "EXT_SCREEN-UNLOCK":
        this.sendNotification("MMM_PIR-UNLOCK");
        MM.getModules().withClass("MMM-Pir").enumerate((module) => {
          module.screenDisplay.showMe();
        });
        //if (!this.isForceLocked) this.screenDisplay.showEXT();
        //if (this.ignoreSender.indexOf(sender.name) === -1) {
        this.sendNotification("EXT_ALERT", {
          message: this.translate("ScreenUnLock", { VALUES: sender.name }),
          type: "information"
        });
        //}
        break;
      case "EXT_SCREEN-FORCE_END":
        this.sendSocketNotification("LOCK_FORCE_END");
        break;
      case "EXT_SCREEN-FORCE_WAKEUP":
        this.sendSocketNotification("LOCK_FORCE_WAKEUP");
        break;
      case "EXT_SCREEN-FORCE_TOGGLE":
        this.sendSocketNotification("LOCK_FORCE_TOOGLE");
        break;
      case "MMM_PIR-SCREEN_POWERSTATUS":
        this.sendNotification("EXT_SCREEN-POWER", payload);
        break;
    }
  },

  getTranslations () {
    return {
      en: "translations/en.json",
      fr: "translations/fr.json",
      it: "translations/it.json",
      de: "translations/de.json",
      es: "translations/es.json",
      nl: "translations/nl.json",
      pt: "translations/pt.json",
      ko: "translations/ko.json",
      el: "translations/el.json",
      "zh-cn": "translations/zh-cn.json",
      tr: "translations/tr.json"
    };
  },

  scanPir () {
    return new Promise((resolve, reject) => {
      var PIR = 0;
      MM.getModules().withClass("MMM-Pir").enumerate((module) => { PIR++; });
      if (!PIR) reject("You can't start EXT-Screen without MMM-Pir. Please install it");
      else resolve(true);
    });
  },

  /** EXT-TelegramBot Commands **/
  EXT_TELBOTCommands (commander) {
    commander.add({
      command: "screen",
      description: "Screen power control",
      callback: "tbScreen"
    });
  },
  tbScreen (command, handler) {
    if (handler.args) {
      var args = handler.args.toLowerCase().split(" ");
      var params = handler.args.split(" ");
      if (args[0] === "on") {
        this.sendNotification("MMM_PIR-WAKEUP");
        handler.reply("TEXT", this.translate("ScreenPowerOn"));
        return;
      }
      if (args[0] === "off") {
        this.sendNotification("FORCE_END");
        handler.reply("TEXT", this.translate("ScreenPowerOff"));
        return;
      }
    }
    handler.reply("TEXT", "Need Help for /screen commands ?\n\n\
  *on*: Power on the screen\n\
  *off*: Power off the screen\n\
  ",{ parse_mode:"Markdown" });
  }
});
