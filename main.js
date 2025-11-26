const field = document.getElementById('field');
const debugXField = document.getElementById('debug-x-field');
const debugYField = document.getElementById('debug-y-field');
const debugXOriginal = document.getElementById('debug-x-original');
const debugYOriginal = document.getElementById('debug-y-original');
const program = document.getElementById('program');
const translateCoordinates = createTranslate(field);
const RADIUS = 30;
const path = [
    [-55, 16.5],
    [-44, 46.5],
    [-72, 48.2],
    [-46.5, 48.2],
    [-46.5, 60],
    [46, 62],
    [50, 48],
    [32, 48],
    [24, 48],
    [40, 48],
    [72, 48.4],
    [48, 48.4],
    [32, 48],
    [24, 48],
    [38, 48],
    [38, -46],
    [72, -47.3],
    [45, -47.3],
    [46.5, -60],
    [-46, -62],
];
field.addEventListener('mousemove', (e) => {
    const [ x, y ] = translateCoordinates.toFieldCoords(e.clientX, e.clientY)
    const [ ogX, ogY ] = translateCoordinates.fromFieldCoords(parseFloat(x), parseFloat(y));
    debugXField.textContent = x;
    debugYField.textContent = y;
    debugXOriginal.textContent = ogX;
    debugYOriginal.textContent = ogY;
})

document.addEventListener('DOMContentLoaded', async () => {
    updateCode(path);
    for (const [x, y] of path) {
        drawCircle(field, ...translateCoordinates.fromFieldCoords(x, y));
        await wait();
    }
})

field.addEventListener('click', function(e) {
    const x = e.clientX - (RADIUS / 2);
    const y = e.clientY - (RADIUS / 2);
    const [fieldX, fieldY] = translateCoordinates.toFieldCoords(x, y);
    
    path.push([fieldX, fieldY]);
    drawCircle(field, x, y);
    updateCode(path);
});

function updateCode(path) {
    program.innerHTML = '';
    for (let [x, y] of path) {
        program.innerHTML = program.innerHTML + '<br>' + `chassis.moveToPoint(${y}, ${x})`;
    }
}

async function wait(n = 1000) {
    return new Promise((resolve) => setTimeout(resolve, n));
}

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
 * @returns {function} Function to translate x and y coordinates into inches
 */
function createTranslate(field, desiredWidth = 144, desiredHeight = 144) {
    // origin is 0, 0 in the center of the div
    // translate 1000px x 1000px -> 144in x 144in
    const fieldElement = field.getBoundingClientRect();
    const width = fieldElement.width;
    const height = fieldElement.height;

    return {
        fromFieldCoords: (x, y) => {
            const remappedX = x + 0.5 * desiredWidth;
            const remappedY = 0.5 * desiredHeight - y;
            const expandedX = remappedX / desiredWidth * width;
            const expandedY = remappedY / desiredHeight * height;
            return [expandedX, expandedY];
        },
        toFieldCoords: (x, y) => {
            const squishedX = x / width * desiredWidth;
            const squishedY = y / height * desiredHeight;
            const remappedX = squishedX - 0.5 * desiredWidth;
            const remappedY = 0.5 * desiredHeight - squishedY;
            return [remappedX.toFixed(2), remappedY.toFixed(2)];
        }
    }
}
