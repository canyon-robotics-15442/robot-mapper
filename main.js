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

// From https://github.com/canyon-robotics-15442/Team_B/blob/main/include/lemlib/chassis/chassis.hpp#L313-L324
// struct MoveToPointParams {
//     /** whether the robot should move forwards or backwards. True by default */
//     bool forwards = true;
//     /** the maximum speed the robot can travel at. Value between 0-127. 127 by default */
//     float maxSpeed = 127;
//     /** the minimum speed the robot can travel at. If set to a non-zero value, the exit conditions will switch to
//      * less accurate but smoother ones. Value between 0-127. 0 by default */
//     float minSpeed = 0;
//     /** distance between the robot and target point where the movement will exit. Only has an effect if minSpeed is
//      * non-zero.*/
//     float earlyExitRange = 0;
// };

/**
 * @typedef {object} Attributes
 * @property {number} [maxSpeed]
 * @property {number} [minSpeed]
 * @property {boolean} [forwards]
 * @property {number} [earlyExitRange]
 */
const CIRCLE_SELECTOR = '.circle';
const field = /** @type {HTMLElement} */ (document.getElementById('field'));
const program = /** @type {HTMLElement} */ (document.getElementById('program'));
const exportDialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog#export-dialog'));
const importDialog = /** @type {HTMLDialogElement} */ (document.querySelector('dialog#import-dialog'));
const codeSnippet = /** @type {HTMLPreElement} */ (document.querySelector('pre#code-snippet'));
const exportCodeButton = /** @type {HTMLButtonElement} */ (document.querySelector('button#code-export'));
const importCodeButton = /** @type {HTMLButtonElement} */ (document.querySelector('button#code-import'));
const copyCodeButton = /** @type {HTMLButtonElement} */ (document.querySelector('button#code-copy'));
const importCodeTrigger = /** @type {HTMLButtonElement} */ (document.querySelector('button#code-import-button'));
const importCodeTextArea = /** @type {HTMLTextAreaElement} */ (document.querySelector('textarea#code-import-text'));
const shareButton = /** @type {HTMLTextAreaElement} */ (document.querySelector('button#share'));
const translateCoordinates = createTranslate(field);
const RADIUS = 30;
/** @type {Point[]} */
let path = [];
/** @type {HTMLElement[]} */
const circles = [];
/** @type {any[]} */
const lines = [];

document.addEventListener('DOMContentLoaded', async () => {
    const url = new URL(location.href);
    const params = url.searchParams;
    const p = params.get('p');
    if (p) {
        const decoded = atob(decodeURIComponent(p));
        const json = JSON.parse(decoded);
        if (json.path) {
            path = json.path;
        }
        params.delete('p');
        window.history.replaceState({}, '', url.toString());
    }
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

shareButton.addEventListener('click', async (e) => {
    const p = encodeURIComponent(btoa(JSON.stringify({ v: 0, path })));
    const sharedUrl = new URL(location.href);
    sharedUrl.searchParams.append('p', p);
    await navigator.clipboard.writeText(sharedUrl.toString());
});

exportCodeButton.addEventListener('click', (e) => {
    updateCode(path);
    exportDialog.showModal();
});

importCodeButton.addEventListener('click', (e) => {
    importDialog.showModal();
});

copyCodeButton.addEventListener('click', async (e) => {
    e.preventDefault();
    const text = codeSnippet.textContent;
    await navigator.clipboard.writeText(text);
    exportDialog.querySelector('.copy-toast')?.classList.add('show');
    await wait(3000);
    exportDialog.querySelector('.copy-toast')?.classList.remove('show');
});

importCodeTrigger.addEventListener('click', (e) => {
    const codeTextArea = /** @type {HTMLTextAreaElement} */ (document.querySelector('#code-import-text'));
    const code = codeTextArea?.value;
    if (!code) {
        return;
    }
    const outPath = [];
    /** @type {any} */
    let point = {};
    for (const line of code.split('\n')) {
        const startPose = line.match(/\w+\.setPose\(\s*(?<y>-?\d+(\.\d+)?),\s*(?<x>-?\d+(\.\d+)?),\s*(?<radians>-?\d+(\.\d+)?)\s*\);?/);

        if (startPose) {
            console.log('found pose', startPose)
            point.x = parseFloat(startPose.groups?.x ?? '');
            point.y = parseFloat(startPose.groups?.y ?? '');
            point.radians = parseFloat(startPose.groups?.radians ?? '');
            outPath.push(point);
            point = {};
            continue;
        }

        const match = line.match(/(\w+\.moveToPoint\((?<y>-?\d+(\.\d+)?),\s*(?<x>-?\d+(\.\d+)?),\s*(?<timeout>-?\d+(\.\d+)?),?\s*(?<attributes>{.+})?\s*\);?)/i);
        if (match) {
            point.x = parseFloat(match.groups?.x ?? '');
            point.y = parseFloat(match.groups?.y ?? '');
            point.timeout = parseFloat(match.groups?.timeout ?? '');

            if (match.groups?.attributes) {
                point.attributes = {};
                const attributes = match.groups.attributes.slice(1, -1).trim().split(/,\s*/g);
                for (const a of attributes) {
                    const [key, value] = a.split(/\s*=\s*/);
                    if (!key.startsWith('.')) {
                        throw new Error(`${key} does not start with .`);
                    }
                    // @ts-ignore
                    const keyWithoutDot = key.slice(1);
                    if (value === 'true') {
                        point.attributes[keyWithoutDot] = true;
                    } else if (value === 'false') {
                        point.attributes[keyWithoutDot] = false;
                    } else {
                        point.attributes[keyWithoutDot] = parseFloat(value);
                    }
                }
            }
            outPath.push(point);
            point = {};
        } else {
            point.codeBefore = (point.codeBefore ?? '') + line.trim() + '\n';
        }
    }
    if (point.codeBefore) {
        outPath[outPath.length - 1].codeAfter = point.codeBefore;
    }
    path = outPath;
    field.replaceChildren();
    for (const l of lines) {
        l.remove();
    }
    lines.length = 0;
    circles.length = 0;
    generatePointsUi(outPath);
    for (let i = 0; i < outPath.length; i++) {
        const { x, y } = outPath[i];
        createCircle(field, ...translateCoordinates.fromFieldCoords(x, y), i);
    }
    importDialog.close();
});

/**
 * @param {Point[]} path
 */
function updateCode(path) {
    const [firstPosition, ...rest] = path;
    const output = [];
    if (firstPosition.codeBefore) {
        output.push(firstPosition.codeBefore.trim());
    }
    output.push(`chassis.setPose(${firstPosition.y}, ${firstPosition.x}, ${firstPosition.radians ?? 0})`);
    if (firstPosition.codeAfter) {
        output.push(firstPosition.codeAfter.trim());
    }
    for (let { x, y, attributes, timeout, codeBefore, codeAfter } of rest) {
        if (codeBefore) {
            output.push(codeBefore.trim());
        }
        let attrs = '';
        const entries = Object.entries(attributes ?? {});
        if (entries.length > 0) {
            attrs += '{ ';
        }
        for (const [key, value] of entries) {
            attrs += `.${key} = ${value}, `
        }
        if (entries.length > 0) {
            attrs = attrs.substring(0, attrs.length - 2);
            attrs += ' }';
        }
        output.push(`chassis.moveToPoint(${y}, ${x}, ${timeout}${attrs ? ', ' + attrs : ''});`);
        if (codeAfter) {
            output.push(codeAfter.trim());
        }
    }
    codeSnippet.innerHTML = output.join('\n');
}

/**
 * 
 * @param {Point[]} path 
 */
function generatePointsUi(path) {
    program.replaceChildren();
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
        <details class="point-ui" data-index="${index}">
            <summary class="point-ui-title">Step: ${index}</summary>
            <div class="point-ui-form">
                <label class="point-ui-label" for="${id}-x">X:</label>
                <input id="${id}-x" data-attribute="x" type="input" value="${point.x}" />
                <label class="point-ui-label" for="${id}-y">Y:</label>
                <input id="${id}-y" data-attribute="y" type="input" value="${point.y}" />
                <label class="point-ui-label" for="${id}-timeout">Timeout:</label>
                <input id="${id}-timeout" data-attribute="timeout" type="input" value="${point.timeout ?? ''}" />
                <label class="point-ui-label" for="${id}-radians">Radians:</label>
                <input id="${id}-radians" data-attribute="radians" type="input" value="${point.radians ?? ''}" />
                <div class="point-ui-attributes">
                    <label class="point-ui-attribute-label" for="${id}-attributes-max-speed">Max Speed:</label>
                    <input id="${id}-attributes-max-speed" data-attribute="attributes.maxSpeed" type="input" value="${point.attributes?.maxSpeed ?? ''}" />
                    <label class="point-ui-attribute-label" for="${id}-attributes-min-speed">Min Speed:</label>
                    <input id="${id}-attributes-min-speed" type="input" data-attribute="attributes.minSpeed" value="${point.attributes?.minSpeed ?? ''}" />
                    <label class="point-ui-attribute-label" for="${id}-attributes-early-exit-range">Early Exit Range:</label>
                    <input id="${id}-attributes-early-exit-range" data-attribute="attributes.earlyExitRange" type="input" value="${point.attributes?.earlyExitRange ?? ''}" />
                    <label class="point-ui-attribute-label" for="${id}-attributes-forwards">Forwards?:</label>
                    <input id="${id}-attributes-forwards" type="checkbox" data-attribute="attributes.forwards" ${point.attributes?.forwards ? "checked" : ""} />
                </div>
                <label class="point-ui-label" for="${id}-before-code">Before code:</label>
                <textarea id="${id}-before-code" data-attribute="codeBefore">${point.codeBefore ?? ''}</textarea>
                <label class="point-ui-label" for="${id}-after-code">After code:</label>
                <textarea id="${id}-after-code" data-attribute="codeAfter">${point.codeAfter ?? ''}</textarea>
                <button class="point-ui-delete">X</button>
            </div>
        </details>
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
        const property = /** @type {string} */ (target.getAttribute('data-attribute'));
        if (!property) {
            console.warn("No property attribute found")
            return;
        }
        if (property === 'x' || property === 'y') {
            const value = parseFloat(target.value);
            // @ts-ignore
            path[index][property] = value;
            updateCircle(index, property, value);
        }
        else if (property.startsWith('attributes.')) {
            const subProperty = property.split('.')[1];
            /** @type {Record<string, unknown>} */
            const attributes = path[index].attributes ?? {};
            attributes[subProperty] = subProperty === 'forwards' ? target.checked : parseFloat(target.value);
            path[index].attributes = /** @type {Attributes} */ (attributes);
        }
        else {
            // @ts-ignore
            path[index][property] = target.value;
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
 * @param {string|number} value
 */
function updateCircle(index, property, value) {
    console.log('updating', property)
    const circle = circles[index];
    if (property == 'x') {
        const [fieldX] = translateCoordinates.fromFieldCoords(/** @type {number} */(value), 0);
        circle.style.left = `${fieldX}px`;
    } else if (property === 'y') {
        const [_, fieldY] = translateCoordinates.fromFieldCoords(0, /** @type {number} */(value));
        circle.style.top = `${fieldY}px`;
    }
    if (index > 0) {
        lines[index - 1].position();
    }
    if (lines[index]) {
        lines[index].position();
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
        if (lines[index]) {
            lines[index].position();
        }
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
