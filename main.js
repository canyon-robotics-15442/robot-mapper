// @ts-check

/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 * @property {number} timeout
 * @property {number} [maxSpeed]
 * @property {boolean} [forwards]
 */
const field = /** @type {HTMLElement} */ (document.getElementById('field'));
const debugXField = /** @type {HTMLElement} */ (document.getElementById('debug-x-field'));
const debugYField = /** @type {HTMLElement} */ (document.getElementById('debug-y-field'));
const debugXOriginal = /** @type {HTMLElement} */ (document.getElementById('debug-x-original'));
const debugYOriginal = /** @type {HTMLElement} */ (document.getElementById('debug-y-original'));
const program = /** @type {HTMLElement} */ (document.getElementById('program'));
const translateCoordinates = createTranslate(field);
const RADIUS = 30;
/** @type {Point[]} */
const path = [
    { x: -55, y: 16.5, timeout: 1000 },
    { x: -44, y: 46.5, timeout: 1000 },
    { x: -72, y: 48.2, timeout: 1000 },
    { x: -46.5, y: 48.2, timeout: 1000 },
    { x: -46.5, y: 60, timeout: 1000 },
    { x: 46, y: 62, timeout: 1000 },
    { x: 50, y: 48, timeout: 1000 },
    { x: 32, y: 48, timeout: 1000 },
    { x: 24, y: 48, timeout: 1000 },
    { x: 40, y: 48, timeout: 1000 },
    { x: 72, y: 48.4, timeout: 1000 },
    { x: 48, y: 48.4, timeout: 1000 },
    { x: 32, y: 48, timeout: 1000 },
    { x: 24, y: 48, timeout: 1000 },
    { x: 38, y: 48, timeout: 1000 },
    { x: 38, y: -46, timeout: 1000 },
    { x: 72, y: -47.3, timeout: 1000 },
    { x: 45, y: -47.3, timeout: 1000 },
    { x: 46.5, y: -60, timeout: 1000 },
    { x: -46, y: -62, timeout: 1000 },
];
field.addEventListener('mousemove', (e) => {
    const [ x, y ] = translateCoordinates.toFieldCoords(e.clientX, e.clientY)
    const [ ogX, ogY ] = translateCoordinates.fromFieldCoords(parseFloat(x), parseFloat(y));
    debugXField.textContent = x;
    debugYField.textContent = y;
    debugXOriginal.textContent = `${ogX}`;
    debugYOriginal.textContent = `${ogY}`;
})

document.addEventListener('DOMContentLoaded', async () => {
    updateCode(path);
    for (const {x, y} of path) {
        drawCircle(field, ...translateCoordinates.fromFieldCoords(x, y));
        await wait();
    }
})

field.addEventListener('click', function(e) {
    const x = e.clientX - (RADIUS / 2);
    const y = e.clientY - (RADIUS / 2);
    const [fieldX, fieldY] = translateCoordinates.toFieldCoords(x, y);
    
    path.push({x: parseFloat(fieldX), y: parseFloat(fieldY), timeout: 1000});
    drawCircle(field, x, y);
    updateCode(path);
});

/**
 * @param {Point[]} path 
 */
function updateCode(path) {
    program.innerHTML = '';
    for (let {x, y, timeout} of path) {
        program.innerHTML = program.innerHTML + '<br>' + `chassis.moveToPoint(${y}, ${x}, ${timeout});`;
    }
}

async function wait(n = 1000) {
    return new Promise((resolve) => setTimeout(resolve, n));
}

/**
 * 
 * @param {HTMLElement} parent 
 * @param {number} x 
 * @param {number} y 
 * @param {number} [radius]
 * @returns 
 */
function drawCircle(parent, x, y, radius = RADIUS) {
    const fragment = document.createDocumentFragment();
    const circle = document.createElement('div');
    circle.classList.add('circle');
    circle.classList.add('new');
    circle.style.width = `${radius}px`;
    circle.style.height = `${radius}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    fragment.appendChild(circle);
    parent.append(fragment);
    setTimeout(() => {
        circle.classList.remove('new');
    }, 1000)
    return circle;
}

/**
 * @param {HTMLElement} field
 * @param {number} desiredWidth
 * @param {number} desiredHeight
 */
function createTranslate(field, desiredWidth = 144, desiredHeight = 144) {
    // origin is 0, 0 in the center of the div
    // translate 1000px x 1000px -> 144in x 144in
    const fieldElement = field.getBoundingClientRect();
    const width = fieldElement.width;
    const height = fieldElement.height;

    return {
        /**
         * @param {number} x
         * @param {number} y
         * @returns {[number, number]}
         */
        fromFieldCoords: (x, y) => {
            const remappedX = x + 0.5 * desiredWidth;
            const remappedY = 0.5 * desiredHeight - y;
            const expandedX = remappedX / desiredWidth * width;
            const expandedY = remappedY / desiredHeight * height;
            return [expandedX, expandedY];
        },
        /**
         * @param {number} x 
         * @param {number} y
         * @returns {[string, string]}
         */
        toFieldCoords: (x, y) => {
            const squishedX = x / width * desiredWidth;
            const squishedY = y / height * desiredHeight;
            const remappedX = squishedX - 0.5 * desiredWidth;
            const remappedY = 0.5 * desiredHeight - squishedY;
            return [remappedX.toFixed(2), remappedY.toFixed(2)];
        }
    }
}
