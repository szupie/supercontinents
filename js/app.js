import { geoOrthographic } from './d3-modules.js';

import { init as initRotationControl, transitionToCoord } from './globe/rotation-control.js';
import { init as initTextureGlobe } from './globe/webgl-globe.js';
import * as globeOverlays from './globe/globe-overlays.js';
import * as mapSelector from './map-selector.js';
import { init as initTimeline } from './timeline.js';


const textureCanvas = document.getElementById('globe-texture');
let radius = textureCanvas.offsetWidth/2;
textureCanvas.setAttribute('width', radius*2);
textureCanvas.setAttribute('height', radius*2);

const projection = geoOrthographic()
	.translate([radius, radius])
	.scale(radius);

const reverseCanvas = document.getElementById('reverse-texture');
let reverseRadius = reverseCanvas.offsetWidth/2;
reverseCanvas.setAttribute('width', reverseRadius*2);
reverseCanvas.setAttribute('height', reverseRadius*2);

const reverseProjection = geoOrthographic()
	.translate([reverseRadius, reverseRadius])
	.scale(reverseRadius)
	.rotate([180, 0]);


const globeTexture = initTextureGlobe(textureCanvas, radius);
const reverseTexture = initTextureGlobe(reverseCanvas, reverseRadius);

document.getElementById('reverse-globe').addEventListener('click', e=>{
	transitionToCoord(reverseProjection.rotate().map(val=>-val));
});

const overlayNode = document.getElementById('globe-overlay');
overlayNode.setAttribute('width', radius*2);
overlayNode.setAttribute('height', radius*2);


let lastUpdate = 0;
const hiResDelay = 100;
let hiResDelayTimer;

const resolutions = {
	'hi': mapSelector.getClosestResolution(radius*12),
	'lo': mapSelector.getClosestResolution(radius*2)
}

async function handleMyaUpdate(prevMya, newMya) {
	document.getElementById('mya-value').textContent = mapSelector.currentMya;

	switch (mapSelector.currentMapType) {
		case mapSelector.MapTypes.TEXTURE:
			document.body.setAttribute('data-map-type', 'texture');
			await loadAndUpdateTexture();
			break;
		case mapSelector.MapTypes.VECTOR:
			document.body.setAttribute('data-map-type', 'vector');
			break;
		default:
			document.body.setAttribute('data-map-type', 'none');
			break;
	}
	globeOverlays.handleMyaUpdate(prevMya, newMya);
}

// Make an asynchronous request to load the current map texture,
// dropping all older requests if a more recent one loads first
// to avoid jumping back and forth in time in case of many concurrent requests
function loadAndUpdateTexture() {
	const requestTime = Date.now();
	clearTimeout(hiResDelayTimer);

	let firstAvailImgPromise;
	if (mapSelector.currentTextureIsCached(resolutions['hi'])) {
		// use high resolution if already loaded
		firstAvailImgPromise = mapSelector.getCurrentTexture(resolutions['hi']);
	} else {
		// otherwise use preview resolution
		firstAvailImgPromise = mapSelector.getCurrentTexture(resolutions['lo']);
		// debounce request for high res image
		hiResDelayTimer = setTimeout(() => {
			mapSelector.getCurrentTexture(resolutions['hi']).then(img=>{
				// drop texture if a later request was fulfilled
				if (requestTime >= lastUpdate) {
					lastUpdate = requestTime;
					updateTexture(globeTexture, img);
				}
			})
		}, hiResDelay);
	}
	return firstAvailImgPromise.then(img=>{
		if (requestTime > lastUpdate) {
			lastUpdate = requestTime;
			updateTexture(globeTexture, img);
			updateTexture(reverseTexture, img);
		}
	});
}

function updateTexture(textureInstance, img) {
	let rotation;
	if (Object.is(textureInstance, globeTexture)) {
		rotation = projection.rotate();
	} else {
		rotation = reverseProjection.rotate();
	}
	textureInstance.setTexture(img);
	textureInstance.redraw(rotation);
}

function redrawGlobe(rotation = false) {
	if (rotation && !isNaN(rotation[0]) && !isNaN(rotation[1])) {
		projection.rotate(rotation);
		reverseProjection.rotate([rotation[0]+180, -rotation[1]]);
	}
	if (mapSelector.currentMapType == mapSelector.MapTypes.TEXTURE) {
		globeTexture.redraw(projection.rotate());
		reverseTexture.redraw(reverseProjection.rotate());
	}
	globeOverlays.redraw();
}


initRotationControl(projection, textureCanvas, redrawGlobe);

globeOverlays.init(projection, overlayNode, radius);
globeOverlays.bindReverseMapToNode(
	document.getElementById('reverse-vector'), reverseProjection
);

mapSelector.init(document.getElementById('maps-list'), handleMyaUpdate);
initTimeline();

redrawGlobe();
