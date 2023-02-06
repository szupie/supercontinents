import { geoOrthographic } from './d3-modules.js';

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
	transitionToCoord(reverseProjection.rotate().map(val=>-val));
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

// Make an asynchronous request to load the current map texture,
// dropping all older requests if a more recent one loads first
// to avoid jumping back and forth in time in case of many concurrent requests
function loadAndUpdateTexture() {
	const requestTime = Date.now();
	clearTimeout(hiResDelayTimer);

	let firstAvailImgPromise;
	if (mapSelector.currentTextureIsCached(mapSelector.TextureRes.HI)) {
		// use high resolution if already loaded
		firstAvailImgPromise = mapSelector.getCurrentTexture(mapSelector.TextureRes.HI);
	} else {
		// otherwise use preview resolution
		firstAvailImgPromise = mapSelector.getCurrentTexture(mapSelector.TextureRes.LO);
		// debounce request for high res image
		hiResDelayTimer = setTimeout(() => {
			mapSelector.getCurrentTexture(mapSelector.TextureRes.HI).then(img=>{
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

function redrawGlobes(rotation = false) {
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

function checkMainContentVisibility() {
	const globeNode = document.getElementById('globe-group');
	
	// get viewport height without floating address bar on mobile browsers
	const viewportHeight = 
		document.documentElement.getBoundingClientRect().height;
	// height of content visible below intro
	// (distance from bottom of intro to bottom of viewport)
	const visibleHeight = viewportHeight -
		document.getElementById('intro').getBoundingClientRect().bottom;
	// height needed to show hemisphere with top padding
	const visibilityThreshold = radius + parseFloat(
		window.getComputedStyle(globeNode).getPropertyValue('padding-top')
	);
	if (visibleHeight < visibilityThreshold) {
		globeNode.classList.add('peek');
		if (!window.matchMedia('(prefers-reduced-motion)').matches) {
			setConstantRotation(true);
		}
	} else {
		globeNode.classList.remove('peek');
		setConstantRotation(false);
	}

	// make globe static until it is stickied to the top or stories are visible
	const globeStickied = globeNode.getBoundingClientRect().top <= 0;
	const storiesInViewport = viewportHeight > 
		document.getElementById('stories').getBoundingClientRect().top;
	if (globeStickied || storiesInViewport) {
		globeNode.classList.remove('static');
	} else {
		globeNode.classList.add('static');
	}
}
// skip to interactive mode when clicking instructions
document.getElementById('instructions').addEventListener('click', e=>{
	document.getElementById('globe-group').scrollIntoView();
})

initRotationControl(projection, document.getElementById('globe'), redrawGlobes);

globeOverlays.init(projection, overlayNode);
globeOverlays.bindReverseMapToNode(
	document.getElementById('reverse-vector'), reverseProjection
);

mapSelector.init(document.getElementById('maps-list'), handleMyaUpdate);
initTimeline();

// randomise starting view (not centered on the Pacific Ocean)
projection.rotate([Math.random()*180 - 90, 0]);
redrawGlobes();

document.body.style.setProperty('--initing-transition-duration', '0ms');
checkMainContentVisibility();
document.addEventListener('scroll', checkMainContentVisibility);
// enable transition durations after initial position is rendered
setTimeout(e=>{
	document.body.style.removeProperty('--initing-transition-duration');
}, 500);
