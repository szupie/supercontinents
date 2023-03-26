import { geoOrthographic } from './vendor-local.js';

import { init as initRotationControl, transitionToCoord, setConstantRotation } from './globe/rotation-control.js';
import { init as initTextureGlobe } from './globe/webgl-globe.js';
import * as globeOverlays from './globe/globe-overlays.js';
import * as mapSelector from './map-selector.js';
import { init as initTimeline } from './timeline.js';


const textureCanvas = document.getElementById('globe-texture');
let radius = textureCanvas.offsetWidth/2;

const projection = geoOrthographic()
	.translate([radius, radius])
	.scale(radius);

const reverseCanvas = document.getElementById('reverse-texture');
let reverseRadius = reverseCanvas.offsetWidth/2;

const reverseProjection = geoOrthographic()
	.translate([reverseRadius, reverseRadius])
	.scale(reverseRadius)
	.rotate([180, 0]);


const globeTexture = initTextureGlobe(textureCanvas, radius);
const reverseTexture = initTextureGlobe(reverseCanvas, reverseRadius);

document.getElementById('reverse-globe').addEventListener('click', e=>{
	transitionToCoord(reverseProjection.rotate().slice(0, 2).map(val=>-val));
});

window.addEventListener('resize', e=>{
	radius = textureCanvas.offsetWidth/2;
	projection.translate([radius, radius]).scale(radius);
	globeOverlays.redraw();
	globeTexture.resize(radius);
	globeTexture.redraw(projection.rotate());
});

const overlayNode = document.getElementById('globe-overlay');
overlayNode.setAttribute('width', radius*2);
overlayNode.setAttribute('height', radius*2);


let lastUpdate = 0;
const hiResDelay = 100;
let hiResDelayTimer;

let useReducedRes = false;

async function handleMyaUpdate(prevMya, newMya) {
	let year, unit;
	if (mapSelector.currentMya < 1000) {
		year = mapSelector.currentMya;
		unit = "million";
	} else {
		year = mapSelector.currentMya / 1000;
		unit = "billion";
	}
	document.getElementById('year-value').textContent = year;
	document.getElementById('year-unit').textContent = unit;

	switch (mapSelector.currentMapType) {
		case mapSelector.MapTypes.TEXTURE:
			document.body.setAttribute('data-map-type', 'texture');
			await loadAndUpdateTexture();
			globeOverlays.handleMyaUpdate(prevMya, newMya);
			break;
		case mapSelector.MapTypes.VECTOR:
			document.body.setAttribute('data-map-type', 'vector');
			globeOverlays.handleMyaUpdate(prevMya, newMya);
			break;
		default:
			document.body.setAttribute('data-map-type', 'none');
			break;
	}
}

const TextureRes = mapSelector.TextureRes;
// Make an asynchronous request to load the current map texture,
// dropping all older requests if a more recent one loads first
// to avoid jumping back and forth in time in case of many concurrent requests
async function loadAndUpdateTexture() {
	await mapSelector.mapsReadyPromise;
	const requestTime = Date.now();
	clearTimeout(hiResDelayTimer);

	// lower resolution reduces antialiasing artifacts when globe is rotating
	let optimalRes = radius * 12;
	if (useReducedRes) {
		optimalRes = radius * 6;
	}

	let firstAvailImgPromise;
	let highResLoaded = false;
	if (mapSelector.currentTextureIsCached(TextureRes.HI)) {
		// use high resolution if already loaded
		firstAvailImgPromise = mapSelector.getCurrentTexture(TextureRes.HI);
	} else {
		// otherwise use preview resolution
		firstAvailImgPromise = mapSelector.getCurrentTexture(TextureRes.LO);
		// debounce request for high res image
		hiResDelayTimer = setTimeout(() => {
			mapSelector.getCurrentTexture(TextureRes.HI)
				.then(updateTextureIfNewer);
		}, hiResDelay);
	}
	function updateTextureIfNewer(img) {
		// drop texture if a later request was fulfilled
		if (img && !highResLoaded && requestTime >= lastUpdate) {
			lastUpdate = requestTime;
			const downsampled = getDownsampledImageData(img, optimalRes);
			updateTexture(globeTexture, downsampled);
			updateTexture(reverseTexture, img);
			if (img.width >= TextureRes.HI) {
				highResLoaded = true;
			}
		}
	}
	return firstAvailImgPromise.then(updateTextureIfNewer);
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

const scalerCanvas = document.createElement('canvas');
function getDownsampledImageData(img, size) {
	const scale = size / img.width;

	// skip downsampling step for speed
	if (scale > 1) return img;

	const ctx = scalerCanvas.getContext('2d');
	scalerCanvas.width = img.width * scale;
	scalerCanvas.height = img.height * scale;
	ctx.drawImage(img, 0, 0, scalerCanvas.width, scalerCanvas.height);
	return ctx.getImageData(0, 0, scalerCanvas.width, scalerCanvas.height);
}

function redrawGlobes(rotation = false) {
	if (rotation && !isNaN(rotation[0]) && !isNaN(rotation[1])) {
		projection.rotate(rotation);
		reverseProjection.rotate([((rotation[0] + 360) % 360) - 180, -rotation[1]]);
	}
	if (mapSelector.currentMapType == mapSelector.MapTypes.TEXTURE) {
		globeTexture.redraw(projection.rotate());
		reverseTexture.redraw(reverseProjection.rotate());
	}
	globeOverlays.redraw();
}


const instructionsNode = document.getElementById('instructions');
const globePanelNode = document.getElementById('globe-group');

// dummy node to determine viewport height without mobile address bar
const dummyNode = document.createElement('div');
dummyNode.style.height = '100vh';
dummyNode.style.position = 'absolute';
dummyNode.style.visibility = 'hidden';
document.body.appendChild(dummyNode);

function checkMainContentVisibility() {
	
	// get viewport height without floating address bar on mobile browsers
	const viewportHeight = dummyNode.getBoundingClientRect().height;

	// height of content visible below intro
	// (distance from bottom of intro to bottom of viewport)
	const visibleHeight = viewportHeight -
		document.getElementById('intro').getBoundingClientRect().bottom;
	// height needed to show hemisphere with top padding
	const visibilityThreshold = radius + parseFloat(
		window.getComputedStyle(globePanelNode).getPropertyValue('padding-top')
	);
	if (visibleHeight < visibilityThreshold) {
		globePanelNode.classList.add('peek');
		if (!window.matchMedia('(prefers-reduced-motion)').matches) {
			setConstantRotation(true);
		}
	} else {
		globePanelNode.classList.remove('peek');
		setConstantRotation(false);
	}

	// make globe static until scrolled past instructions
	const pastInstructions = 
		(instructionsNode.getBoundingClientRect().bottom <= 20);
	const lastState = globePanelNode.classList.contains('static');
	if (pastInstructions) {
		globePanelNode.classList.remove('static');
		useReducedRes = false;
	} else {
		globePanelNode.classList.add('static');
		useReducedRes = true;
	}
	// use lower resolution during initial autorotate to reduce antialiasing
	// (but wait until static state change for smoother transition animation)
	if (lastState != globePanelNode.classList.contains('static')) {
		loadAndUpdateTexture();
	}
}
// skip to interactive mode when clicking globe
globePanelNode.addEventListener('click', e=>{
	if (globePanelNode.classList.contains('static')) {
		const instructionBottomEdge = 
			window.scrollY + instructionsNode.getBoundingClientRect().bottom;
		window.scrollTo(0, instructionBottomEdge);
	}
});

initRotationControl(projection, document.getElementById('globe'), redrawGlobes);

globeOverlays.init(projection, overlayNode);
globeOverlays.bindReverseMapToNode(
	document.getElementById('reverse-vector'), reverseProjection
);

mapSelector.init(document.getElementById('maps-list'), handleMyaUpdate);
initTimeline();

// randomise starting view (not centered on the Pacific Ocean)
redrawGlobes([Math.random()*180 - 90, 0]);

document.body.style.setProperty('--initing-transition-duration', '0ms');
checkMainContentVisibility();
document.addEventListener('scroll', checkMainContentVisibility);
// enable transition durations after initial position is rendered
setTimeout(e=>{
	document.body.style.removeProperty('--initing-transition-duration');
}, 500);
