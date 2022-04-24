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
function handleMapUpdate() {
	document.getElementById('mya-value').textContent = mapSelector.currentMya;


	const requestTime = Date.now();
	clearTimeout(hiResDelayTimer);

	let imgPromise;
	if (mapSelector.isCached(resolutions['hi'])) {
		// use high resolution if already loaded
		imgPromise = mapSelector.getImg(resolutions['hi']);
	} else {
		// otherwise use preview resolution
		imgPromise = mapSelector.getImg(resolutions['lo']);
		// debounce request for high res image
		hiResDelayTimer = setTimeout(() => {
			mapSelector.getImg(resolutions['hi']).then(img=>{
				if (requestTime >= lastUpdate) {
					lastUpdate = requestTime;
					updateTexture(globeTexture, img);
				}
			})
		}, hiResDelay);
	}
	imgPromise.then(img=>{
		if (requestTime > lastUpdate) {
			lastUpdate = requestTime;
			updateTexture(globeTexture, img);
			updateTexture(reverseTexture, img);
			globeOverlays.handleMapUpdate();
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
	globeTexture.redraw(projection.rotate());
	reverseTexture.redraw(reverseProjection.rotate());
	globeOverlays.redraw();
}


initRotationControl(projection, textureCanvas, redrawGlobe);

globeOverlays.init(projection, overlayNode, radius);

mapSelector.init(document.getElementById('maps-list'), handleMapUpdate);
initTimeline();

redrawGlobe();
