// @ts-check

/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 * @property {number} timeout
 * @property {number} [maxSpeed]
 * @property {boolean} [forwards]
 */
const CIRCLE_SELECTOR = '.circle';
const field = /** @type {HTMLElement} */ (document.getElementById('field'));
const debugXField = /** @type {HTMLElement} */ (document.getElementById('debug-x-field'));
const debugYField = /** @type {HTMLElement} */ (document.getElementById('debug-y-field'));
const debugXOriginal = /** @type {HTMLElement} */ (document.getElementById('debug-x-original'));
const debugYOriginal = /** @type {HTMLElement} */ (document.getElementById('debug-y-original'));
const program = /** @type {HTMLElement} */ (document.getElementById('program'));
const deleteButton = /** @type {HTMLElement} */ (document.getElementById('delete-circle'));
const deleteCircleNumber = /** @type {HTMLInputElement} */ (document.getElementById('circle-index'));
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
/** @type {HTMLElement[]} */
const circles = [];
/** @type {any[]} */
const lines = [];
field.addEventListener('mousemove', (e) => {
    const [x, y] = translateCoordinates.toFieldCoords(e.clientX, e.clientY)
    const [ogX, ogY] = translateCoordinates.fromFieldCoords(parseFloat(x), parseFloat(y));
    debugXField.textContent = x;
    debugYField.textContent = y;
    debugXOriginal.textContent = `${ogX}`;
    debugYOriginal.textContent = `${ogY}`;
})

document.addEventListener('DOMContentLoaded', async () => {
    attachCircleListeners();
    updateCode(path);
    for (let i = 0; i < path.length; i++) {
        const { x, y } = path[i];
        createCircle(field, ...translateCoordinates.fromFieldCoords(x, y), i);
    }
})

deleteButton.addEventListener('click', function (e) {
    const value = parseInt(deleteCircleNumber.value);
    if (isNaN(value)) {
        console.log('that is not number idiot')
        return;
    }
    deleteCircle(value);

})

field.addEventListener('mouseup', function (e) {
    if (e.target instanceof HTMLElement && e.target.matches(CIRCLE_SELECTOR)) {
        console.log('we clicky a circle');
        return;
    }
    const x = e.clientX - (RADIUS / 2);
    const y = e.clientY - (RADIUS / 2);
    const [fieldX, fieldY] = translateCoordinates.toFieldCoords(x, y);

    path.push({ x: parseFloat(fieldX), y: parseFloat(fieldY), timeout: 1000 });
    createCircle(field, x, y, path.length - 1);
    updateCode(path);
});

/**
 * @param {Point[]} path
 */
function updateCode(path) {
    program.innerHTML = '';
    for (let { x, y, timeout } of path) {
        program.innerHTML = program.innerHTML + '<br>' + `chassis.moveToPoint(${y}, ${x}, ${timeout});`;
    }
}

/**
 * @param {number} index
 */
function deleteCircle(index) {
    path.splice(index, 1);
    const removedCircle = circles.splice(index, 1);
    if (removedCircle[0] !== undefined) {
        removedCircle[0].remove();
        updateCode(path);
        for (let i = 0; i < circles.length; i++) {
            circles[i].setAttribute('data-index', i.toString());
            circles[i].textContent = i.toString();
        }
    }
    const removedLine = lines.splice(index, 1);
    removedLine[0].remove();
    if (index > 0) {
        const adjustedLine = lines[index - 1];
        adjustedLine.end = circles[index];
    }
}

async function wait(n = 1000) {
    return new Promise((resolve) => setTimeout(resolve, n));
}

/**
 * Draws a circle at x and y then adds event listeners to it for interaction.
 * @param {HTMLElement} parent
 * @param {number} x
 * @param {number} y
 * @param {number} index
 */
function createCircle(parent, x, y, index) {
    const previousCircle = circles[circles.length - 1];
    const circle = drawCircle(parent, x, y, index);
    circle.classList.add('new');
    circle.setAttribute('data-index', `${index}`);
    setTimeout(() => {
        circle.classList.remove('new');
    }, 1000)
    circles.push(circle);
    if (previousCircle) {
        // @ts-ignore
        lines.push(new LeaderLine(previousCircle, circle));
    }
    return circle;
}

/**
 * @param {HTMLElement} parent
 * @param {number} x
 * @param {number} y
 * @param {number} index
 * @param {number} [radius]
 * @returns
 */
function drawCircle(parent, x, y, index, radius = RADIUS) {
    const fragment = document.createDocumentFragment();
    const circle = document.createElement('div');
    circle.classList.add('circle');
    circle.style.width = `${radius}px`;
    circle.style.height = `${radius}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.textContent = index.toString();
    fragment.appendChild(circle);
    parent.append(fragment);
    return circle;

}

function attachCircleListeners() {
    let dragging = false;
    /** @type {HTMLElement | null} */
    let circleElement = null;
    field.addEventListener('mousedown', (e) => {
        const element = /** @type {HTMLElement} */ (e.target);
        if (!element.matches(CIRCLE_SELECTOR)) {
            return;
        }
        element.classList.add('dragging');
        circleElement = element;
        dragging = true;
    });
    field.addEventListener('mouseup', (e) => {
        if (!circleElement) {
            return;
        }
        const element = /** @type {HTMLElement} */ (e.target);
        element.classList.remove('dragging');
        circleElement = null;
        dragging = false;
    });
    field.addEventListener('mousemove', (e) => {
        if (!circleElement) {
            return;
        }
        if (!dragging) {
            return;
        }
        const indexString = circleElement.getAttribute('data-index');
        const x = e.clientX - RADIUS / 2;
        const y = e.clientY - RADIUS / 2;
        circleElement.style.left = `${x}px`;
        circleElement.style.top = `${y}px`;
        if (!indexString) {
            console.error('wat');
            return;
        }
        const index = parseInt(indexString, 10);
        const val = path[index];
        const [fieldX, fieldY] = translateCoordinates.toFieldCoords(e.clientX, e.clientY)
        val.x = parseFloat(fieldX);
        val.y = parseFloat(fieldY);
        if (index > 0) {
            lines[index - 1].position();
        }
        lines[index].position();
        updateCode(path);
    })
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
