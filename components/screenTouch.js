class screenTouch {
  constructor(that) {
    this.mode = that.config.touchMode
    if (that.config.touchMode > 3 || that.config.touchMode < 0 || isNaN(that.config.touchMode)) this.mode = 3
    this.clickTimer = null
    this.clickCount = 0
    console.log("[SCREEN] screenTouch Ready")
  }

  touch(that) {
    let TouchScreen = document.getElementById("EXT-SCREEN")

    switch (this.mode) {
      case 1:
      /** mode 1 **/
        window.addEventListener('click', () => {
          this.clickCount++
          if (this.clickCount === 1) {
            this.clickTimer = setTimeout(() => {
              this.clickCount = 0
              that.notificationReceived("EXT_SCREEN-WAKEUP", undefined, {name: that.name})
            }, 400)
          } else if (this.clickCount === 2) {
            clearTimeout(this.clickTimer)
            this.clickCount = 0
            that.notificationReceived("EXT_SCREEN-END", undefined, {name: that.name})
          }
        }, false)
        break
      case 2:
      /** mode 2 **/
        TouchScreen.addEventListener('click', () => {
          if (!that.hidden) that.notificationReceived("EXT_SCREEN-WAKEUP", undefined, {name: that.name})
        }, false)

        window.addEventListener('long-press', () => {
          if (that.hidden) that.notificationReceived("EXT_SCREEN-WAKEUP", undefined, {name: that.name})
          else that.notificationReceived("EXT_SCREEN-END", undefined, {name: that.name})
        }, false)
        break
      case 3:
      /** mode 3 **/
        TouchScreen.addEventListener('click', () => {
          this.clickCount++
          if (this.clickCount === 1) {
            this.clickTimer = setTimeout(() => {
              this.clickCount = 0
              that.notificationReceived("EXT_SCREEN-WAKEUP", undefined, {name: that.name})
            }, 400)
          } else if (this.clickCount === 2) {
            clearTimeout(this.clickTimer)
            this.clickCount = 0
            that.notificationReceived("EXT_SCREEN-END", undefined, {name: that.name})
          }
        }, false)

        window.addEventListener('click', () => {
          if (that.hidden) {
            clearTimeout(this.clickTimer)
            this.clickCount = 0
            that.notificationReceived("EXT_SCREEN-WAKEUP", undefined, {name: that.name})
          }
        }, false)
        break
    }
    if (!this.mode) console.log("[SCREEN] Touch Screen Function disabled.")
    else console.log("[SCREEN] Touch Screen Function added. [mode " + this.mode +"]")
  }
}