/**************
*  EXT-Screen *
*  Bugsounet  *
**************/

var logScreen = (...args) => { /* do nothing */ };

Module.register("EXT-Screen", {
  requiresVersion: "2.25.0",
  defaults: {
    debug: false,
    animateBody: true,
    autoDimmer: false,
    delay: 2 * 60 * 1000,
    mode: 1,
    xrandrForceRotation: "normal",
    wrandrForceRotation: "normal",
    wrandrForceMode: null,
    displayCounter: true,
    displayBar: true,
    displayStyle: "Text",
    displayLastPresence: true,
    lastPresenceTimeFormat: "LL H:mm",
    displayAvailability: true,
    detectorSleeping: false,
    gpio: 20,
    clearGpioValue: true,
    sound: false,
    touchMode: 3,
    ON: [
      //  {
      //    dayOfWeek: [0],
      //    hour: 7,
      //    minute: 45
      //  }
    ],
    OFF: [
      //  {
      //    dayOfWeek: [1],
      //    hour: 17,
      //    minute: 00
      //  }
    ]
  },

  start () {
    this.ignoreSender= [
      "MMM-GoogleAssistant",
      "EXT-Pir",
      "EXT-Screen",
      "EXT-Motion",
      "EXT-Keyboard",
      "EXT-StreamDeck"
    ];

    if (this.config.debug) logScreen = (...args) => { console.log("[SCREEN]", ...args); };
    this.userPresence = null;
    this.lastPresence = null;
    this.ready = false;
    let Tools = {
      sendSocketNotification: (...args) => this.sendSocketNotification(...args),
      sendNotification: (...args) => this.sendNotification(...args),
      hidden: () => { return this.hidden; },
      translate: (...args) => this.translate(...args),
      hide: (...args) => this.hide(...args),
      show: (...args) => this.show(...args)
    };
    let displayConfig = {
      animateBody: this.config.animateBody,
      displayCounter: this.config.displayCounter,
      displayBar: this.config.displayBar,
      displayStyle: this.config.displayStyle,
      displayLastPresence: this.config.displayLastPresence,
      displayAvailability: this.config.displayAvailability,
      delay: this.config.delay
    };
    this.screenDisplay = new screenDisplayer(displayConfig, Tools);
    this.config.displayStyle = this.screenDisplay.checkStyle();
    this.screenTouch = new screenTouch(this.config.touchMode, Tools);
    this.isForceLocked = false;
  },

  socketNotificationReceived (notification, payload) {
    switch(notification) {
      case "INITIALIZED":
        this.sendNotification("EXT_HELLO", this.name);
        this.screenTouch.touch(this);
        this.ready = true;
        break;
      case "SCREEN_SHOWING":
        this.screenDisplay.screenShowing();
        break;
      case "SCREEN_HIDING":
        this.screenDisplay.screenHiding();
        break;
      case "SCREEN_OUTPUT":
        if (this.config.displayStyle === "Text") {
          let counter = document.getElementById("EXT-SCREEN_SCREEN_COUNTER");
          counter.textContent = payload.timer;
        } else {
          this.screenDisplay.barAnimate(payload.bar, payload.timer);
        }
        if (this.config.autoDimmer) {
          this.screenDisplay.opacityRegions(payload.dimmer);
        }
        if (this.config.displayAvailability) {
          let availability= document.getElementById("EXT-SCREEN_AVAILABILITY_DATA");
          availability.textContent= `${payload.availability} (${payload.availabilityPercent}%)`;
        }
        break;
      case "SCREEN_PRESENCE":
        if (payload) this.lastPresence = moment().format(this.config.lastPresenceTimeFormat);
        else this.userPresence = this.lastPresence;
        if (this.userPresence && this.config.displayLastPresence) {
          let presence= document.getElementById("EXT-SCREEN_PRESENCE");
          presence.classList.remove("hidden");
          presence.classList.add("bright");
          let userPresence= document.getElementById("EXT-SCREEN_PRESENCE_DATE");
          userPresence.textContent= this.userPresence;
        }
        break;
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
    }
  },

  notificationReceived (notification, payload, sender) {
    if (notification === "GA_READY") {
      if (sender.name === "MMM-GoogleAssistant") {
        if (this.config.animateBody) this.screenDisplay.prepareBody();
        this.screenDisplay.prepareBar();
        this.sendSocketNotification("INIT", this.config);
      }
    }
    if (!this.ready) return;
    switch(notification) {
      case "EXT_SCREEN-END":
        this.sendSocketNotification("FORCE_END");
        break;
      case "EXT_SCREEN-WAKEUP":
        this.sendSocketNotification("WAKEUP");
        if (this.ignoreSender.indexOf(sender.name) === -1) {
          this.sendNotification("EXT_ALERT", {
            message: this.translate("ScreenWakeUp", { VALUES: sender.name }),
            type: "information"
          });
        }
        break;
      case "EXT_SCREEN-LOCK":
        this.sendSocketNotification("LOCK");
        if (!this.isForceLocked) this.screenDisplay.hideEXT();
        if (this.ignoreSender.indexOf(sender.name) === -1) {
          this.sendNotification("EXT_ALERT", {
            message: this.translate("ScreenLock", { VALUES: sender.name }),
            type: "information"
          });
        }
        break;
      case "EXT_SCREEN-UNLOCK":
        this.sendSocketNotification("UNLOCK");
        if (!this.isForceLocked) this.screenDisplay.showEXT();
        if (this.ignoreSender.indexOf(sender.name) === -1) {
          this.sendNotification("EXT_ALERT", {
            message: this.translate("ScreenUnLock", { VALUES: sender.name }),
            type: "information"
          });
        }
        break;
      case "EXT_SCREEN-FORCE_END":
        this.sendSocketNotification("LOCK_FORCE_END");
        break;
      case "EXT_SCREEN-FORCE_WAKEUP":
        this.sendSocketNotification("LOCK_FORCE_WAKEUP");
        break;
    }
  },

  getDom () {
    return this.screenDisplay.prepare();
  },

  getStyles () {
    return [ "EXT-Screen.css" ];
  },

  getScripts () {
    return [
      "/modules/EXT-Screen/components/progressbar.js",
      "/modules/MMM-Pir/node_modules/long-press-event/dist/long-press-event.min.js",
      "/modules/EXT-Screen/components/screenDisplayer.js",
      "/modules/EXT-Screen/components/screenTouch.js"
    ];
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
        this.sendSocketNotification("WAKEUP");
        handler.reply("TEXT", this.translate("ScreenPowerOn"));
        return;
      }
      if (args[0] === "off") {
        this.sendSocketNotification("FORCE_END");
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
