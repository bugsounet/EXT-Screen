class screenDisplayer {
  constructor (that) {
    this.config = that.config;
    this.translate = (...args) => that.translate(...args);
    this.bar = null;
    this.init = null;
    this.autoHide = false;
    this.hide = (...args) => that.hide(...args);
    this.show = (...args) => that.show(...args);
    console.log("[SCREEN] screenDisplayer Ready");
  }

  prepare () {
    var dom = document.createElement("div");
    dom.id = "EXT-SCREEN";

    var counters = document.createElement("div");
    counters.id = "EXT-SCREEN_COUNTERS";

    if (this.config.displayCounter || this.config.displayBar) {
      /** Screen TimeOut Text **/
      var screen = document.createElement("div");
      screen.id = "EXT-SCREEN_SCREEN";
      if (this.config.displayStyle !== "Text" || !this.config.displayCounter) screen.className = "hidden";
      var screenText = document.createElement("div");
      screenText.id = "EXT-SCREEN_SCREEN_TEXT";
      screenText.textContent = this.translate("ScreenTurnOff");
      screenText.classList.add("bright");
      screen.appendChild(screenText);
      var screenCounter = document.createElement("div");
      screenCounter.id = "EXT-SCREEN_SCREEN_COUNTER";
      screenCounter.classList.add("bright");
      screenCounter.textContent = "--:--";
      screen.appendChild(screenCounter);

      /** Screen TimeOut Bar **/
      var bar = document.createElement("div");
      bar.id = "EXT-SCREEN_BAR";
      if ((this.config.displayStyle === "Text") || !this.config.displayBar) bar.className = "hidden";
      var screenBar = document.createElement(this.config.displayStyle === "Bar" ? "meter" : "div");
      screenBar.id = "EXT-SCREEN_SCREEN_BAR";
      screenBar.classList.add(this.config.displayStyle);
      if (this.config.displayStyle === "Bar") {
        screenBar.value = 0;
        screenBar.max= this.config.delay;
      }
      bar.appendChild(screenBar);
      counters.appendChild(screen);
      counters.appendChild(bar);
    }
    dom.appendChild(counters);

    if (this.config.displayLastPresence) {
      /** Last user Presence **/
      var presence = document.createElement("div");
      presence.id = "EXT-SCREEN_PRESENCE";
      presence.className = "hidden";
      var presenceText = document.createElement("div");
      presenceText.id = "EXT-SCREEN_PRESENCE_TEXT";
      presenceText.textContent = this.translate("ScreenLastPresence");
      presence.appendChild(presenceText);
      var presenceDate = document.createElement("div");
      presenceDate.id = "EXT-SCREEN_PRESENCE_DATE";
      presenceDate.classList.add("presence");
      presenceDate.textContent = "Loading ...";
      presence.appendChild(presenceDate);
      dom.appendChild(presence);
    }

    if (this.config.displayAvailability) {
      /** availability of the screen **/
      var availability = document.createElement("div");
      availability.id = "EXT-SCREEN_AVAILABILITY";
      availability.classList.add("bright");
      var availabilityText = document.createElement("div");
      availabilityText.id = "EXT-SCREEN_AVAILABILITY_TEXT";
      availabilityText.textContent = this.translate("ScreenAvailability");
      availability.appendChild(availabilityText);
      var availabilityValue = document.createElement("div");
      availabilityValue.id = "EXT-SCREEN_AVAILABILITY_DATA";
      availabilityValue.classList.add("availability");
      availabilityValue.textContent = "--:--:-- (---%)";
      availability.appendChild(availabilityValue);
      dom.appendChild(availability);
    }
    return dom;
  }

  prepareBar () {
    /** Prepare TimeOut Bar **/
    if ((this.config.displayStyle === "Text") || (this.config.displayStyle === "Bar") || (!this.config.displayBar)) return;
    this.bar = new ProgressBar[this.config.displayStyle](document.getElementById("EXT-SCREEN_SCREEN_BAR"), {
      strokeWidth: this.config.displayStyle === "Line" ? 2 : 5,
      trailColor: "#1B1B1B",
      trailWidth: 1,
      easing: "easeInOut",
      duration: 500,
      svgStyle: null,
      from: { color: "#FF0000" },
      to: { color: "#00FF00" },
      text: {
        style: {
          position: "absolute",
          left: "50%",
          top: this.config.displayStyle === "Line" ? "0" : "50%",
          padding: 0,
          margin: 0,
          transform: {
            prefix: true,
            value: "translate(-50%, -50%)"
          }
        }
      }
    });
  }

  barAnimate (payload) {
    let value = (100 - ((payload * 100) / this.config.delay))/100;
    let timeOut = moment(new Date(this.config.delay-payload)).format("m:ss");
    this.bar.animate(value, {
      step: (state, bar) => {
        bar.path.setAttribute("stroke", state.color);
        bar.setText(this.config.displayCounter ? timeOut : "");
        bar.text.style.color = state.color;
      }
    });
  }

  prepareBody () {
    document.body.id = "EXT_SCREEN_ANIMATE";
  }

  screenShowing () {
    if (!this.init) return this.init = true;
    MM.getModules().enumerate((module)=> {
      module.show(1000, () => {}, { lockString: "EXT-SCREEN_LOCK" });
    });
    if (this.config.animateBody) {
      addAnimateCSS("EXT_SCREEN_ANIMATE", "zoomIn", 1);
      setTimeout(() => {
        removeAnimateCSS("EXT_SCREEN_ANIMATE", "zoomIn");
      },1000);
    }
    logScreen("Show All modules.");
  }

  screenHiding () {
    MM.getModules().enumerate((module)=> {
      module.hide(1000, () => {}, { lockString: "EXT-SCREEN_LOCK" });
    });
    if (this.config.animateBody) {
      addAnimateCSS("EXT_SCREEN_ANIMATE", "zoomOut", 1);
      setTimeout(() => {
        removeAnimateCSS("EXT_SCREEN_ANIMATE", "zoomOut");
      },1000);
    }
    logScreen("Hide All modules.");
  }

  /** Hide EXT with Flip animation **/
  hideEXT () {
    if (this.autoHide) return logScreen("Already Hidden.");
    this.autoHide = true;
    this.hide(1000, () => {}, { lockString: "EXT-SCREEN_LOCK" });
  }

  showEXT () {
    if (!this.autoHide) return logScreen("Already Showing.");
    this.autoHide = false;
    this.show(1000, () => {}, { lockString: "EXT-SCREEN_LOCK" });
  }

  /** Hide or show counter **/
  hideShowCounter (state) {
    if (this.config.displayCounter || this.config.displayBar) {
      var counters = document.getElementById("EXT-SCREEN_COUNTERS");
      if (state) counters.classList.add("hidden");
      else counters.classList.remove("hidden");
    }
  }

  checkStyle () {
    /** Crash prevent on Time Out Style Displaying **/
    /** --> Set to "Text" if not found */
    let Style = [ "Text", "Line", "SemiCircle", "Circle" ];
    let found = Style.find((style) => {
      return style === this.config.displayStyle;
    });
    if (!found) {
      console.error(`[SCREEN] displayStyle Error ! [${ this.config.displayStyle  }]`);
      this.config.displayStyle = "Text";
    }
  }

  opacityRegions (dimmer) {
    var regions = document.querySelectorAll(".region");
    regions.forEach((region) => {
      region.style.opacity = dimmer;
    });
  }
}
