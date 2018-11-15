
const NUM_PARTICLES = 10000;
const VIBRATION_INTENSITY = 4;
const HALF_VIBRATION = VIBRATION_INTENSITY / 2;

/**
 * https://stackoverflow.com/a/52827031/778272
 * @returns {Boolean} true if system is big endian */
const isBigEndian = (() => {
    const array = new Uint8Array(4);
    const view = new Uint32Array(array.buffer);
    return !((view[0] = 1) & array[0]);
})();
console.info("Endianness: " + (isBigEndian ? "big" : "little"));

const rgbToVal = isBigEndian ?
    (r, g, b) => ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0:
    (r, g, b) => ((0xff << 24) | (b << 16) | (g << 8) | r) >>> 0;

const valToRGB = isBigEndian ?
    (val) => [(val >>> 24) & 0xff, (val >>> 16) & 0xff, (val >>> 8)  & 0xff] :
    (val) => [         val & 0xff, (val >>> 8)  & 0xff, (val >>> 16) & 0xff];

class Debouncer {
    constructor () { this.timer = null; }
    set(task, delay) {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.timer = null;
            task();
        }, delay);
    }
}

// create canvas
const canvas = document.createElement("canvas");
canvas.classList.add("pixelated");
const c = canvas.getContext("2d");
/** @type {ImageData} */
let imageData = null;
document.body.appendChild(canvas);
const canvasScale = 1;
/** @type {Uint32Array} */
let buffer = null;

let width = window.innerWidth / canvasScale;
let height = window.innerHeight / canvasScale;

const debounceTimer = new Debouncer();

const particles = new Float32Array(NUM_PARTICLES * 2);
const color = rgbToVal(0xff, 0x94, 0x30);

function init() {
    const fpsElem = document.getElementById("fps");
    let fpsCount = 0;
    const fallingElem = document.getElementById("falling");
    let fallingCount = 0;
    setInterval(() => {
        fpsElem.innerText = fpsCount.toString(); fpsCount = 0;
        fallingElem.innerText = fallingCount.toString(); fallingCount = 0;
    }, 1000);

    // resize canvas to cover whole screen
    function resize() {
        width = Math.ceil(window.innerWidth / canvasScale);
        height = Math.ceil(window.innerHeight / canvasScale);
        canvas.setAttribute("width", width);
        canvas.setAttribute("height", height);

        imageData = c.getImageData(0, 0, width, height);
        buffer = new Uint32Array(imageData.data.buffer);
        console.info(`New buffer created (${width}x${height})`);

        for (let i = 0; i < particles.length; i += 2) {
            particles[i] = Math.random() * width;
            particles[i + 1] = Math.random() * height;
        }
    }
    window.addEventListener("resize", () => debounceTimer.set(resize, 350));
    resize();

    function didParticleFall(x, y) {
        const SLACK = 100;
        return x < -SLACK || x >= width + SLACK || y < -SLACK || y >= height + SLACK;
    }

    // animation loop
    function update() {
        // c.clearRect(0, 0, width, height);
        buffer.fill(0);

        for (let i = 0; i < particles.length; i += 2) {
            let x = particles[i];
            let y = particles[i + 1];

            // 60Hz vibration
            x += Math.random() * VIBRATION_INTENSITY - HALF_VIBRATION;
            y += Math.random() * VIBRATION_INTENSITY - HALF_VIBRATION;

            particles[i] = x;
            particles[i + 1] = y;

            buffer[Math.round(y) * width + Math.round(x)] = color;

            // ToDo do this check less frequently
            // replace sand if it fell from the plate
            if (didParticleFall(x, y)) {
                particles[i] = Math.random() * width;
                particles[i + 1] = Math.random() * height;
                fallingCount++;
            }
        }

        c.putImageData(imageData, 0, 0);

        fpsCount++;
        requestAnimationFrame(update);
    }
    update(performance.now());
}
init();
