// @ts-check

/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 * @property {number} timeout
 * @property {number} [radians]
 * @property {string} [codeBefore]
 * @property {string} [codeAfter]
 * @property {Attributes} [attributes]
 */

/**
 * @typedef {object} Attributes
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

document.addEventListener('DOMContentLoaded', async () => {
    attachCircleListeners();
    generatePointsUi(path);
    for (let i = 0; i < path.length; i++) {
        const { x, y } = path[i];
        createCircle(field, ...translateCoordinates.fromFieldCoords(x, y), i);
    }
})

field.addEventListener('mouseup', function (e) {
    if (e.target instanceof HTMLElement && e.target.matches(CIRCLE_SELECTOR)) {
        console.log('we clicky a circle');
        return;
    }
    const x = e.clientX - (RADIUS / 2);
    const y = e.clientY - (RADIUS / 2);
    const [fieldX, fieldY] = translateCoordinates.toFieldCoords(x, y);
    const point = { x: parseFloat(fieldX), y: parseFloat(fieldY), timeout: 1000 };

    path.push(point);
    createCircle(field, x, y, path.length - 1);
    program.appendChild(generatePointElement(point, path.length));
});

/**
 * @param {Point[]} path
 */
function updateCode(path) {
    program.innerHTML = '';
    const [firstPosition, ...rest] = path;
    program.innerHTML = `chassis.setPose(${firstPosition.y}, ${firstPosition.x}, ${firstPosition.radians ?? 0})`;
    for (let { x, y, timeout } of rest) {
        program.innerHTML = program.innerHTML + `\nchassis.moveToPoint(${y}, ${x}, ${timeout});`;
    }
}

/**
 * 
 * @param {Point[]} path 
 */
function generatePointsUi(path) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < path.length; i++) {
        fragment.appendChild(generatePointElement(path[i], i));
    }
    program.append(fragment);
}

/**
 * 
 * @param {Point} point
 * @param {number} index 
 * @returns {HTMLElement}
 */
function generatePointElement(point, index) {
    const id = crypto.randomUUID();
    const div = document.createElement('div');
    div.classList.add("points-ui-wrapper");
    const html = `
        <div class="point-ui" data-index="${index}">
            <h3 class="point-ui-title">Step: ${index}</h3>
            <div class="point-ui-form">
                <label class="point-ui-label" for="${id}-x">X:</label>
                <input id="${id}-x" data-attribute="x" type="input" value="${point.x}" />
                <label class="point-ui-label" for="${id}-y">Y:</label>
                <input id="${id}-y" data-attribute="y" type="input" value="${point.y}" />
                <label class="point-ui-label" for="${id}-timeout">Timeout:</label>
                <input id="${id}-timeout" data-attribute="timeout" type="input" value="${point.timeout ?? ''}" />
                <label class="point-ui-label" for="${id}-radians">Radians:</label>
                <input id="${id}-radians" data-attribute="radians" type="input" value="${point.radians ?? ''}" />
                <button class="point-ui-delete">X</button>
            </div>
        </div>
    `
    div.innerHTML = html;
    div.addEventListener('click', (e) => {
        // @ts-ignore
        const index = parseInt(div.children[0].getAttribute('data-index'), 10);
        const target = /** @type {HTMLElement} */ (e.target);
        if (target.matches('.point-ui-delete')) {
            deleteCircle(index);
        }
    });
    div.addEventListener('change', (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        if (target.matches('input')) {
            const property = /** @type {string} */ (target.getAttribute('data-attribute'));
            updateCircle(index, property, parseFloat(target.value));
        }
    })
    return div;
}

/**
 * 
 * @param {Point} point 
 * @param {number} index 
 * @param  {...string} properties 
 */
function updatePointElement(point, index, ...properties) {
    for (const property of properties) {
        const element = /** @type {HTMLInputElement} */ (document.querySelector(`.point-ui[data-index="${index}"] input[data-attribute="${property}"]`));
        if (!element) {
            throw new Error(`Could not find element for ${index} and ${property}`);
        }
        // @ts-ignore
        element.value = point[property];
    }
}

/**
 * @param {number} index
 */
function deletePointElement(index) {
    const elements = document.querySelectorAll('.point-ui');
    for (let i = 0; i < elements.length; i++) {
        if (i === index) {
            elements[i].remove();
        }
        if (i > index) {
            elements[i].setAttribute('data-index', `${i - 1}`);
            // @ts-ignore
            elements[i].querySelector('.point-ui-title').textContent = `Step: ${i - 1}`;
        }
    }
}

/**
 * @param {number} index
 */
function deleteCircle(index) {
    if (index > circles.length - 1) {
        return;
    }
    const isEnd = index === circles.length - 1;
    const isStart = index === 0;
    path.splice(index, 1);
    const removedCircle = circles.splice(index, 1)
    if (removedCircle[0] !== undefined) {
        removedCircle[0].remove();
        deletePointElement(index);
        for (let i = 0; i < circles.length; i++) {
            circles[i].setAttribute('data-index', i.toString());
            circles[i].textContent = i.toString();
        }
    }
    if (isStart) {
        const [nextLine] = lines.splice(index, 1);
        nextLine.remove();
    } else if (isEnd) {
        const [previousLine] = lines.splice(index - 1, 1);
        previousLine.remove();
    } else {
        const [nextLine] = lines.splice(index, 1);
        nextLine.remove();
        const previousLine = lines[index - 1];
        previousLine.end = circles[index];
    }
}

/**
 * @param {number} index 
 * @param {string} property 
 * @param {number} value
 */
function updateCircle(index, property, value) {
    console.log('updating', property)
    const circle = circles[index];
    if (property == 'x') {
        const [fieldX] = translateCoordinates.fromFieldCoords(value, 0);
        circle.style.left = `${fieldX}px`;
    } else if (property === 'y') {
        const [_, fieldY] = translateCoordinates.fromFieldCoords(0, value);
        circle.style.top = `${fieldY}px`;
    }
    if (index > 0) {
        lines[index - 1].position();
    }
    lines[index].position();
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
        lines.push(new LeaderLine(previousCircle, circle, { path: 'straight' }));
    }
    return circle;
}

/**
 * @param {HTMLElement} parent
 * @param {number} x
 * @param {number} y
 * @param {number} index
 * @returns
 */
function drawCircle(parent, x, y, index) {
    const fragment = document.createDocumentFragment();
    const circle = document.createElement('div');
    circle.classList.add('circle');
    circle.style.width = `${RADIUS}px`;
    circle.style.height = `${RADIUS}px`;
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
        const [fieldX, fieldY] = translateCoordinates.toFieldCoords(x, y)
        val.x = parseFloat(fieldX);
        val.y = parseFloat(fieldY);
        if (index > 0) {
            lines[index - 1].position();
        }
        lines[index].position();
        updatePointElement(val, index, 'x', 'y')
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

/**
 * Creates a debounced version of a function
 * @param {Function} func - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, delay) {
    if (typeof func !== 'function') {
        throw new TypeError('Expected a function as the first argument');
    }
    if (typeof delay !== 'number' || delay < 0) {
        throw new TypeError('Delay must be a non-negative number');
    }

    /** @type {number} */
    let timerId;
    /**
     * @this {any}
     * @param {...any} args
     */
    return function (...args) {
        console.log('i been call')
        clearTimeout(timerId); // Reset the timer on each call
        timerId = setTimeout(() => {
            func.apply(this, args); // Preserve context and arguments
        }, delay);
    };
}
