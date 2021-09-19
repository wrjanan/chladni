
import * as Utils from "./utils.js";
import { Debouncer } from "./utils.js";

const MAX_VALUE = 1000000000000000000;
const keysPrefix = ["FIRST", "SECOND", "THIRD", "FOURTH", "FIFTH", "SIXTH", "SEVENTH", "EIGHTH"]
const tokenid = 0;
const text = `${keysPrefix[0]}${tokenid}`;

const intarray = BigInteger.parse(keccak256(text),16);
const first = intarray.remainder(MAX_VALUE).toString();
const firstNo = (first) / (MAX_VALUE);

const getDecimal = (number, token) => {
  const text = `${keysPrefix[number]}${token}`;
  const intarray = BigInteger.parse(keccak256(text),16);
  const first = intarray.remainder(MAX_VALUE).toString();
  return (first) / (MAX_VALUE);
}

const NUM_PARTICLES = getDecimal(0, tokenid) * 420000;
const DEFAULT_RANDOM_VIBRATION_INTENSITY = getDecimal(1, tokenid) * 20;
let MAX_GRADIENT_INTENSITY = getDecimal(2, tokenid) * 100;
const DEBUG_VIBRATION_LEVELS = false;
const CANVAS_SCALE = 1.5;
const worker = new Worker("gradient-worker.js");
        
const debouce = () => {
  const debounceTimer = new Debouncer();
  debounceTimer.set(this.resize.bind(this), 350)
}

class ChladniApp {
    test() {
        alert();
    }
  
    change(tokenid) {
        this.tokenId.innerText = tokenid;
      
        this.particles = new Float32Array(getDecimal(0, tokenid) * 420000 * 2);
        this.vibrationIntensity = getDecimal(1, tokenid) * 20;
        MAX_GRADIENT_INTENSITY = getDecimal(2, tokenid) * 100;
      
    }
  
    destroy() {
      
      this.worker.removeEventListener("message", this.onMessageFromWorker.bind(this));
      
      window.removeEventListener("resize", debouce);
      window.removeEventListener("keypress", this.keypress.bind(this));
      clearInterval(this.interval);
      delete this;
    }
  
    constructor(tokenid) {
        MAX_GRADIENT_INTENSITY = getDecimal(2, tokenid) * 100;
        this.tokenid = 0;
      
        this.canvas = document.createElement("canvas");
        this.canvas.classList.add("pixelated");
        this.context = this.canvas.getContext("2d");
        document.body.appendChild(this.canvas);

        /** @type {ImageData} */
        this.imageData = null;

        /** @type {Uint32Array} */
        this.buffer = null;
        /** @type {Float32Array} */
        this.vibrationValues = null;
        /** @type {Float32Array} */
        this.gradients = null;

        this.vibrationIntensity = getDecimal(1, tokenid) * 20;
        this.halfVibrationIntensity = this.vibrationIntensity / 2;

        this.debugVibration = DEBUG_VIBRATION_LEVELS;
        this.isRunning = true;

        this.width = window.innerWidth / CANVAS_SCALE;
        this.height = window.innerHeight / CANVAS_SCALE;

        this.particles = new Float32Array(getDecimal(0, tokenid) * 420000 * 2);

        this.nonResonantColor = Utils.cssColorToColor(Utils.readCssVarAsHexNumber("non-resonant-color"));
        this.colorIndex = 0;
        this.colors = [];
        let cssColorIndex = 1;
        let cssColor;
        while (cssColor = Utils.readCssVarAsHexNumber("particle-color-" + cssColorIndex)) {
            this.colors.push(Utils.cssColorToColor(cssColor));
            cssColorIndex++;
        }
        this.selectedColor = this.colors[this.colorIndex];

        this.backgroundColor = Utils.cssColorToColor(Utils.readCssVarAsHexNumber("background-color"));

        this.fpsCount = 0;
        this.initStatus();

        this.worker = worker;
        this.worker.addEventListener("message", this.onMessageFromWorker.bind(this));

        window.addEventListener("resize", debouce);
        this.resize();

        this.updateFn = this.update.bind(this);
        this.update(performance.now());

        this.interval = setInterval(this.checkForFallenParticles.bind(this), 10000);

        window.addEventListener("keypress", this.keypress.bind(this));
    }

    initStatus() {
      
        this.tokenId = document.getElementById("tokenId");
        this.tokenId.innerText = this.tokenid;
        this.fpsElem = document.getElementById("fps");
        setInterval(() => {
            this.fpsElem.innerText = this.fpsCount.toString(); this.fpsCount = 0;
        }, 1000);
    }

    keypress(event) {
        switch (event.key) {
            case "d": this.debugVibration = !this.debugVibration; break;
            case " ": this.isRunning = !this.isRunning; break;
        }
    }

    resize() {
        this.width = Math.ceil(window.innerWidth / CANVAS_SCALE);
        this.height = Math.ceil(window.innerHeight / CANVAS_SCALE);
        this.canvas.setAttribute("width", this.width);
        this.canvas.setAttribute("height", this.height);

        this.worker.postMessage({
            width: this.width,
            height: this.height,
        });

        this.imageData = this.context.getImageData(0, 0, this.width, this.height);
        this.buffer = new Uint32Array(this.imageData.data.buffer);
        // recalculateGradients();
        console.info(`New buffer created (${this.width}x${this.height})`);

        for (let i = 0; i < this.particles.length; i += 2) {
            this.particles[i] = Math.random() * this.width;
            this.particles[i + 1] = Math.random() * this.height;
        }
    }

    onMessageFromWorker(message) {
        this.vibrationIntensity = message.data.vibrationIntensity;
        this.halfVibrationIntensity = this.vibrationIntensity / 2;
        this.vibrationValues = message.data.vibrationValues ? new Float32Array(message.data.vibrationValues) : null;
        this.gradients = message.data.gradients ? new Float32Array(message.data.gradients) : null;
        if (this.gradients) {
            this.colorIndex = (this.colorIndex + 1) % this.colors.length;
            this.selectedColor = this.colors[this.colorIndex];
        }
    }

    // replace sand that fell from the plate
    checkForFallenParticles() {
        const SLACK = 100;  // allow particles to really leave the screen before replacing them

        for (let i = 0; i < this.particles.length; i += 2) {
            let x = this.particles[i];
            let y = this.particles[i + 1];

            const didFall = x < -SLACK || x >= this.width + SLACK || y < -SLACK || y >= this.height + SLACK;

            if (didFall) {
                this.particles[i] = Math.random() * this.width;
                this.particles[i + 1] = Math.random() * this.height;
            }
        }
    }

    obtainGradientAt(x, y) {
        // used to lerp nearest gradient grid corners here, but it's too expensive and doesn't make any visual difference
        x = Math.round(x);
        y = Math.round(y);
        const index = (y * this.width + x) * 2;
        return [
            this.gradients[index],
            this.gradients[index + 1]
        ];
    }

    update() {
        if (!this.isRunning) {
            this.fpsCount++;
            requestAnimationFrame(this.updateFn);
            return;
        }

        if (this.debugVibration && this.vibrationValues) {
            const MAX_LUMINOSITY = 64;  // up to 256
            for (let i = 0; i < this.vibrationValues.length; i++) {
                const intensity = this.vibrationValues[i] * MAX_LUMINOSITY;
                this.buffer[i] = Utils.rgbToVal(intensity, intensity, intensity);
            }
        } else {
            this.buffer.fill(this.backgroundColor);
        }

        const color = this.gradients ? this.selectedColor : this.nonResonantColor;

        for (let i = 0; i < this.particles.length; i += 2) {
            let x = this.particles[i];
            let y = this.particles[i + 1];

            if (this.gradients) {
                const [gradX, gradY] = this.obtainGradientAt(x, y);

                // descend gradient
                x += MAX_GRADIENT_INTENSITY * gradX;
                y += MAX_GRADIENT_INTENSITY * gradY;
            }

            // random vibration
            x += Math.random() * this.vibrationIntensity - this.halfVibrationIntensity;
            y += Math.random() * this.vibrationIntensity - this.halfVibrationIntensity;

            this.particles[i] = x;
            this.particles[i + 1] = y;

            this.buffer[Math.round(y) * this.width + Math.round(x)] = color;
        }

        this.context.putImageData(this.imageData, 0, 0);

        this.fpsCount++;
        requestAnimationFrame(this.updateFn);
    }
}

let app = new ChladniApp(0);

document.getElementById("tokenIdButton").onclick = () => {
  // app.destroy();
  // document.getElementsByTagName("canvas")[0].remove();
  // app = new ChladniApp(document.getElementById("tokenIdInput").value );
  
  app.change(document.getElementById("tokenIdInput").value);
  app.resize();
}

document.getElementById("randomButton").onclick = () => {
  // app.destroy();
  // document.getElementsByTagName("canvas")[0].remove();
  // app = new ChladniApp(document.getElementById("tokenIdInput").value );
  
  app.change(Math.floor(Math.random() * 10000));
  app.resize();
}
