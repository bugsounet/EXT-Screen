/** Screen management **/
/** bugsounet **/

const exec = require('child_process').exec
const process = require('process')
const moment = require('moment')
const path = require('path')
var log = (...args) => { /* do nothing */ }

class SCREEN {
  constructor(config, callbacks) {
    this.config = config
    this.sendSocketNotification = callbacks.sendSocketNotification
    this.detector = callbacks.detector
    this.governor = callbacks.governor
    if (this.config.debug) log = (...args) => { console.log("[SCREEN] [LIB]", ...args) }
    this.PathScript = path.dirname(require.resolve('../package.json'))+"/scripts"
    this.interval = null
    this.default = {
      animateBody: false,
      delay: 5 * 60 * 1000,
      displayCounter: true,
      displayAvailability: true,
      displayBar: false,
      detectorSleeping: false,
      mode: 1,
      gpio: 20,
      clearGpioValue: true,
      xrandrForceRotation: "normal",
      wrandrForceRotation: "normal"
    }
    this.config = Object.assign(this.default, this.config)
    this.screen = {
      mode: this.config.mode,
      running: false,
      locked: false,
      power: false,
      awaitBeforeTurnOff: this.config.animateBody,
      awaitBeforeTurnOffTimer: null,
      awaitBeforeTurnOffTime: 2000,
      uptime: Math.floor(process.uptime()),
      availabilityCounter: Math.floor(process.uptime()),
      availabilityPercent: 0,
      availabilityTimeHuman: 0,
      availabilityTimeSec: 0,
      forceLocked: false,
      cronStarted: false,
      cronON: false,
      cronOFF: false,
      xrandrRotation: null,
      wrandrRotation: null,
      hdmiPort: null,
      forceOnStart: true
    }

    this.status = false
    this.dimmerFrom = this.config.delay / 4

    this.xrandrRoation = [ "normal", "left", "right", "inverted" ]
    this.wrandrRoation = [ "normal", "90", "180", "270", "flipped", "flipped-90", "flipped-180", "flipped-270" ]

    switch (this.config.mode) {
      case 0:
        console.log("[SCREEN] Mode 0: Disabled")
        break
      case 1:
        console.log("[SCREEN] Mode 1: vcgencmd")
        break
      case 2:
        console.log("[SCREEN] Mode 2: dpms rpi")
        break
      case 3:
        console.log("[SCREEN] Mode 3: tvservice")
        break
      case 4:
        console.log("[SCREEN] Mode 4: HDMI CEC")
        break
      case 5:
        console.log("[SCREEN] Mode 5: dpms linux")
        break
      case 6:
        console.log("[SCREEN] Mode 6: Python script (Relay on/off)")
        break
      case 7:
        console.log("[SCREEN] Mode 7: Python script reverse (Relay on/off)")
        break
      case 8:
        console.log("[SCREEN] Mode 8: ddcutil")
        break
      case 9:
        if (this.xrandrRoation.indexOf(this.config.xrandrForceRotation) == -1) {
          console.error(`[SCREEN] Mode 9: xrandr invalid Rotation --> ${this.config.xrandrForceRotation}, Set to default: normal`)
          this.screen.xrandrRotation = "normal"
        } else {
          console.log(`[SCREEN] Mode 9: xrandr (primary display) -- Rotation: ${this.config.xrandrForceRotation}`)
          this.screen.xrandrRotation = this.config.xrandrForceRotation
        }
        break
      case 10:
        if (this.wrandrRoation.indexOf(this.config.wrandrForceRotation) == -1) {
          console.error(`[SCREEN] Mode 10: wlr-randr invalid Rotation --> ${this.config.wrandrForceRotation}, Set to default: normal`)
          this.screen.wrandrRotation = "normal"
        } else {
          console.log(`[SCREEN] Mode 10: wlr-randr (primary display) -- Rotation: ${this.config.wrandrForceRotation}`)
          this.screen.wrandrRotation = this.config.wrandrForceRotation
        }
        break
      default:
        this.logError("Unknow Mode Set to 0 (Disabled)")
        this.sendSocketNotification("ERROR", `[SCREEN] Unknow Mode (${this.config.mode}) Set to 0 (Disabled)`)
        this.config.mode = 0
        break
    }

    if (this.config.displayAvailability) {
      Number.prototype.toHHMMSS = function () {
        var sec_num = parseInt(this, 10); // don't forget the second param
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);

        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return hours+':'+minutes+':'+seconds;
      }
      this.screenAvailability()
    }

    this.screenStatus()
  }

  activate() {
    process.on('exit', (code) => {
      if (this.config.mode) this.setPowerDisplay(true)
      this.governor("GOVERNOR_WORKING")
      console.log('[SCREEN] ByeBye !')
      console.log('[SCREEN] @bugsounet')
    })
    this.start()
  }

  start(restart) {
    if (this.screen.locked || this.screen.running) return
    if (!restart) log("Start.")
    else log("Restart.")
    clearTimeout(this.screen.awaitBeforeTurnOffTimer)
    this.screen.awaitBeforeTurnOffTimer= null
    this.sendSocketNotification("SCREEN_PRESENCE", true)
    if (!this.screen.power) {
      this.governor("GOVERNOR_WORKING")
      if (this.config.mode) this.wantedPowerDisplay(true)
      this.sendSocketNotification("SCREEN_SHOWING")
      this.screen.power = true
    }
    if (this.config.autoDimmer) {
      this.sendSocketNotification("SCREEN_DIMMER", 1)
    }
    clearInterval(this.interval)
    this.interval = null
    this.counter = this.config.delay
    this.interval = setInterval( ()=> {
      this.screen.running = true

      if (this.config.displayCounter) {
        this.sendSocketNotification("SCREEN_TIMER", moment(new Date(this.counter)).format("mm:ss"))
        if (this.config.dev) log("Counter:", moment(new Date(this.counter)).format("mm:ss"))
      }
      if (this.config.displayBar) {
        this.sendSocketNotification("SCREEN_BAR", this.config.delay - this.counter )
      }
      if (this.config.autoDimmer) {
        if (this.counter <= this.dimmerFrom) {
          let dimmer = (100 - (((this.dimmerFrom - this.counter) * 100) / this.dimmerFrom))/100
          this.sendSocketNotification("SCREEN_DIMMER", dimmer.toFixed(1))
        }
      }
      if (this.counter <= 0) {
        clearInterval(this.interval)
        this.interval = null
        this.screen.running = false
        this.forceTurnOffScreen()
        log("Stops by counter.")
      }
      this.counter -= 1000
    }, 1000)
  }

  forceTurnOffScreen() {
    if (!this.screen.power) return log("forceTurnOffScreen: already off")
    this.sendSocketNotification("SCREEN_HIDING")
    this.screen.power = false
    if (this.config.mode) this.wantedPowerDisplay(false)
    if (this.config.detectorSleeping) this.detector("DETECTOR_STOP")
    if (this.config.autoDimmer) this.sendSocketNotification("SCREEN_DIMMER", 0)
    this.governor("GOVERNOR_SLEEPING")
    this.sendSocketNotification("SCREEN_PRESENCE", false)
  }

  stop() {
    if (this.screen.locked) return

    if (!this.screen.power) {
      this.governor("GOVERNOR_WORKING")
      if (this.config.mode) this.wantedPowerDisplay(true)
      this.sendSocketNotification("SCREEN_SHOWING")
      this.screen.power = true
    }
    this.sendSocketNotification("SCREEN_PRESENCE", true)
    if (!this.screen.running) return
    clearInterval(this.interval)
    this.interval = null
    this.screen.running = false
    log("Stops.")
  }

  reset() {
    if (this.screen.locked) return
    clearInterval(this.interval)
    this.interval = null
    this.screen.running = false
    this.start(true)
  }

  wakeup() {
    if (this.screen.locked) return
    if (!this.screen.power && this.config.detectorSleeping) this.detector("DETECTOR_START")
    this.reset()
  }

  lock() {
    if (this.screen.locked) return
    this.screen.locked = true
    clearInterval(this.interval)
    this.interval = null
    this.screen.running = false
    log("Locked !")
  }

  unlock() {
    if (this.screen.forceLocked) return log("Unlock: ForceLocked")
    this.screen.locked = false
    log("Unlocked !")
    this.start()
  }

  forceEnd() {
    clearInterval(this.interval)
    this.interval = null
    this.screen.running = false
    this.counter = 0
    this.forceTurnOffScreen()
  }

  wantedPowerDisplay(wanted) {
    var actual = false
    switch (this.config.mode) {
      case 0:
      /** disabled **/
        log("Disabled mode")
        break
      case 1:
      /** vcgencmd **/
        exec("/usr/bin/vcgencmd display_power", (err, stdout, stderr)=> {
          if (err) {
            this.logError(err)
            this.sendSocketNotification("ERROR", `[SCREEN] vcgencmd command error (mode: ${this.config.mode})`)
          }
          else {
            var displaySh = stdout.trim()
            actual = Boolean(Number(displaySh.substr(displaySh.length -1)))
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 2:
      /** dpms rpi**/
        var actual = false
        exec("DISPLAY=:0 xset q | grep Monitor", (err, stdout, stderr)=> {
          if (err) {
            this.logError(err)
            this.sendSocketNotification("ERROR", `[SCREEN] dpms command error (mode: ${this.config.mode})`)
          }
          else {
            let responseSh = stdout.trim()
            var displaySh = responseSh.split(" ")[2]
            if (displaySh == "On") actual = true
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 3:
      /** tvservice **/
        exec("tvservice -s | grep Hz", (err, stdout, stderr)=> {
          if (err) {
            this.logError(err)
            this.sendSocketNotification("ERROR", `[SCREEN] tvservice command error (mode: ${this.config.mode})`)
          }
          else {
            let responseSh = stdout.trim()
            if (responseSh) actual = true
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 4:
      /** CEC **/
        exec("echo 'pow 0' | cec-client -s -d 1", (err, stdout, stderr)=> {
          if (err) {
            this.logError(err)
            this.logError("HDMI CEC Error: " + stdout)
            this.sendSocketNotification("ERROR", `[SCREEN] HDMI CEC command error (mode: ${this.config.mode})`)
          } else {
            let responseSh = stdout.trim()
            var displaySh = responseSh.split("\n")[1].split(" ")[2]
            if (displaySh == "on") actual = true
            if (displaySh == "unknown") log("HDMI CEC unknow state")
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 5:
      /** dmps linux **/
        exec("xset q | grep Monitor", (err, stdout, stderr)=> {
          if (err) {
            this.logError("[Display Error] " + err)
            this.sendSocketNotification("ERROR", `[SCREEN] dpms linux command error (mode: ${this.config.mode})`)
          }
          else {
            let responseSh = stdout.trim()
            var displaySh = responseSh.split(" ")[2]
            if (displaySh == "On") actual = true
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 6:
      /** python script **/
        exec(`python monitor.py -s -g=${this.config.gpio}`, { cwd: this.PathScript }, (err, stdout, stderr)=> {
          if (err) {
            this.logError("[Display Error] " + err)
            this.sendSocketNotification("ERROR", `[SCREEN] python relay script error (mode: ${this.config.mode})`)
          }
          else {
            let responsePy = stdout.trim()
            log("Response PY -- Check State: " + responsePy)
            if (responsePy == 1) actual = true
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 7:
      /** python script reverse**/
        exec(`python monitor.py -s -g=${this.config.gpio}`, { cwd: this.PathScript }, (err, stdout, stderr)=> {
          if (err) {
            this.logError("[Display Error] " + err)
            this.sendSocketNotification("ERROR", `[SCREEN] python relay script error (mode: ${this.config.mode})`)
          }
          else {
            let responsePy = stdout.trim()
            log(`Response PY -- Check State (reverse): ${responsePy}`)
            if (responsePy == 0) actual = true
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 8:
      /** ddcutil **/
        exec("ddcutil getvcp d6", (err, stdout, stderr)=> {
          if (err) {
            this.logError(err)
            this.sendSocketNotification("ERROR", `[SCREEN] ddcutil command error (mode: ${this.config.mode})`)
          }
          else {
            let responseSh = stdout.trim()
            var displaySh = responseSh.split("(sl=")[1]
            log(responseSh)
            log(displaySh)
            if (displaySh == "0x01)") actual = true
            this.resultDisplay(actual,wanted)
          }
        })
        break
      case 9:
      /** xrandr on primary display **/
        exec("xrandr | grep 'connected primary'",
            (err, stdout, stderr)=> {
                if (err) {
                    this.logError(err)
                    this.sendSocketNotification("ERROR", `[SCREEN] xrandr command error (mode: ${this.config.mode})`)
                }
                else {
                    let responseSh = stdout.trim()
                    var power = "on"
                    this.screen.hdmiPort = responseSh.split(" ")[0]
                    if (responseSh.split(" ")[3] == "(normal") power = "off"
                    if (power == "on") actual = true
                    log(`[MODE 9] Monitor on ${this.screen.hdmiPort} is ${power}`)
                    this.resultDisplay(actual,wanted)
                }
            }
        )
        break
      case 10:
      /** wl-randr on primary display **/
        exec("WAYLAND_DISPLAY=wayland-1 wlr-randr | grep 'Enabled'",
            (err, stdout, stderr)=> {
                if (err) {
                    this.logError(err)
                    this.sendSocketNotification("ERROR", `[SCREEN] wlr-randr command error (mode: ${this.config.mode})`)
                } else {
                  let responseSh = stdout.trim()
                  if (responseSh.split(" ")[1] == "yes") actual = true
                  exec("WAYLAND_DISPLAY=wayland-1 wlr-randr",
                    (err, stdout, stderr) => {
                      if (err) {
                        this.logError(err)
                        this.sendSocketNotification("ERROR", `[SCREEN] wlr-randr scan screen command error (mode: ${this.config.mode})`)
                      } else {
                        let wResponse = stdout.trim()
                        this.screen.hdmiPort = wResponse.split(" ")[0]
                        log(`[MODE 10] Monitor on ${this.screen.hdmiPort} is ${actual}`)
                        this.resultDisplay(actual,wanted)
                      }
                    })
                }
            }
        )
        break
    }
  }

  resultDisplay(actual,wanted) {
    if (this.screen.forceOnStart) {
      log("Display: Force On Start")
      this.setPowerDisplay(true)
      this.screen.forceOnStart = false
    } else {
      log("Display -- Actual: " + actual + " - Wanted: " + wanted)
      this.screen.power = actual
      if (actual && !wanted) this.setPowerDisplay(false)
      if (!actual && wanted) this.setPowerDisplay(true)
    }
  }

  async setPowerDisplay(set) {
    log("Display " + (set ? "ON." : "OFF."))
    this.screen.power = set
    this.SendScreenPowerState()
    if (this.screen.awaitBeforeTurnOff && !set) await this.sleep(this.screen.awaitBeforeTurnOffTime)
    // and finally apply rules !
    switch (this.config.mode) {
      case 1:
        if (set) exec("/usr/bin/vcgencmd display_power 1")
        else exec("/usr/bin/vcgencmd display_power 0")
        break
      case 2:
        if (set) exec("DISPLAY=:0 xset dpms force on")
        else exec("DISPLAY=:0 xset dpms force off")
        break
      case 3:
        if (set) exec("tvservice -p && sudo chvt 6 && sudo chvt 7")
        else exec("tvservice -o")
        break
      case 4:
        if (set) exec("echo 'on 0' | cec-client -s")
        else exec("echo 'standby 0' | cec-client -s")
        break
      case 5:
        if (set) exec("xset dpms force on")
        else exec("xset dpms force off")
        break
      case 6:
        if (set)
          exec(`python monitor.py -r=1 -g=${this.config.gpio}`, { cwd: this.PathScript }, (err, stdout, stderr)=> {
            if (err) console.log("[SCREEN] err:", err)
            else log("Relay is " + stdout.trim())
          })
        else
          if (this.config.clearGpioValue) {
            exec(`python monitor.py -r=0 -c -g=${this.config.gpio}`, {cwd: this.PathScript},(err, stdout, stderr)=> {
              if (err) console.log("[SCREEN] err:", err)
              else {
                log("Relay is " + stdout.trim())
              }
            })
          } else {
            exec(`python monitor.py -r=0 -g=${this.config.gpio}`, {cwd: this.PathScript},(err, stdout, stderr)=> {
              if (err) console.log("[SCREEN] err:", err)
              else {
                log("Relay is " + stdout.trim())
              }
            })
          }
        break
      case 7:
        if (set) {
          if (this.config.clearGpioValue) {
            exec(`python monitor.py -r=0 -c -g=${this.config.gpio}`, {cwd: this.PathScript},(err, stdout, stderr)=> {
              if (err) console.log("[SCREEN] err:", err)
              else {
                log("Relay is " + stdout.trim())
              }
            })
          } else {
            exec(`python monitor.py -r=0 -g=${this.config.gpio}`, {cwd: this.PathScript},(err, stdout, stderr)=> {
              if (err) console.log("[SCREEN] err:", err)
              else {
                log("Relay is " + stdout.trim())
              }
            })
          }
        } else {
          exec(`python monitor.py -r=1 -g=${this.config.gpio}`, { cwd: this.PathScript }, (err, stdout, stderr)=> {
            if (err) console.log("[SCREEN] err:", err)
            else log("Relay is " + stdout.trim())
          })
        }
        break
      case 8:
        if (set) exec("ddcutil setvcp d6 1")
        else exec("ddcutil setvcp d6 4")
        break
      case 9:
        if (set) exec(`xrandr --output ${this.screen.hdmiPort} --auto --rotate ${this.screen.xrandrRotation}`)
        else exec(`xrandr --output ${this.screen.hdmiPort} --off`)
        break
      case 10:
        if (set) exec(`WAYLAND_DISPLAY=wayland-1 wlr-randr --output ${this.screen.hdmiPort} --on --transform ${this.screen.wrandrRotation}`)
        else exec(`WAYLAND_DISPLAY=wayland-1 wlr-randr --output ${this.screen.hdmiPort} --off`)
        break
    }
  }

  state() {
    this.sendSocketNotification("SCREEN_STATE", this.screen)
  }

  SendScreenPowerState() {
    this.sendSocketNotification("SCREEN_POWER", this.screen.power)
  }

  logError(err) {
    console.error("[SCREEN] " + err)
  }

  sleep(ms=1300) {
    return new Promise((resolve) => {
      this.screen.awaitBeforeTurnOffTimer = setTimeout(resolve, ms)
    })
  }

  screenAvailability() {
    console.log("[SCREEN] Availability started")
    setInterval(() => {
      this.screen.uptime = Math.floor(process.uptime())
      if (this.screen.power) this.screen.availabilityCounter++
      this.screen.availabilityPercent = (this.screen.availabilityCounter*100)/this.screen.uptime
      this.screen.availabilityTimeSec = this.screen.uptime > 86400 ? (this.screen.availabilityPercent * 864) : this.screen.availabilityCounter
      this.screen.availabilityTimeHuman = this.screen.availabilityTimeSec.toHHMMSS()
      let availability = {
        availabilityPercent:parseFloat(this.screen.availabilityPercent.toFixed(1)),
        availability: this.screen.availabilityTimeHuman
      }
      this.sendSocketNotification("SCREEN_AVAILABILITY", availability)
    }, 1000)
  }

  /** Cron Rules **/
  cronState(state) {
    this.screen.cronStarted= state.started
    this.screen.cronON= state.ON
    this.screen.cronOFF= state.OFF
    log("[CRON] Turn cron state to", state)
    if (!this.screen.cronStarted) return
    if ((!this.screen.cronON && !this.screen.cronOFF) || this.screen.cronON) {
      // and... consider first start
      this.sendForceLockState(true)
      if (this.screen.cronON) {
        this.screen.locked = false
        this.wakeup()
      }
      this.screen.cronON = true
      this.screen.cronOFF = false
      this.lock()
    } else if (this.screen.cronOFF) {
      this.sendForceLockState(false)
      this.screen.cronON = false
      this.screen.cronOFF = true
      this.unlock()
    }
  }

  /** Force Lock ON/OFF display **/
  forceLockOFF() {
    if (!this.screen.power) return log("[Force OFF] Display Already OFF")
    this.sendForceLockState(true)
    this.screen.locked = true
    clearInterval(this.interval)
    this.interval = null
    if (this.screen.running) this.counter = 0
    this.screen.running = false
    this.forceTurnOffScreen()
    log("[Force OFF] Turn OFF Display")
  }

  forceLockON() {
    if (this.screen.locked && !this.screen.forceLocked) return log("[Force ON] Display is Locked!")
    if (this.screen.power && this.screen.cronStarted) return log("[Force ON] Display Already ON")
    this.sendForceLockState(false)
    this.screen.locked = false
    this.wakeup()
    if (this.screen.cronStarted) {
      if (this.screen.cronON) this.sendForceLockState(true)
      this.lock()
    }
    this.sendSocketNotification("FORCE_LOCK_END")
    log("[Force ON] Turn ON Display")
  }

  sendForceLockState(state) {
    this.screen.forceLocked = state
    this.sendSocketNotification("SCREEN_FORCELOCKED", this.screen.forceLocked)
  }

  screenStatus() {
    setInterval(() => {
      let status = this.screen.power
      if (status !== this.status) {
        this.sendSocketNotification("SCREEN_POWERSTATUS", status)
        log("[POWER] Display from", this.status, "--->", status)
      }
      this.status = status
    }, 1000)
  }
}

module.exports = SCREEN
