import { geoOrthographic } from 'https://cdn.skypack.dev/d3-geo@3';

import { init as initRotationControl } from './globe/rotation-control.js';
import { init as initTextureGlobe, redraw as redrawGlobeTexture } from './globe/webgl-globe.js';
import * as globeOverlays from './globe/globe-overlays.js';
import * as mapSelector from './map-selector.js';
import { init as initTimeline } from './timeline.js';

let radius = Math.min(window.innerWidth, window.innerHeight, 600)/2;

const projection = geoOrthographic()
	.translate([radius, radius])
	.scale(radius);

const textureCanvas = document.getElementById('globe-texture');
textureCanvas.setAttribute('width', radius*2);
textureCanvas.setAttribute('height', radius*2);

const overlayNode = document.getElementById('globe-overlay');
overlayNode.setAttribute('width', radius*2);
overlayNode.setAttribute('height', radius*2);

function handleMapUpdate() {
	document.getElementById('mya-value').textContent = mapSelector.currentMya;
	globeOverlays.handleMapUpdate();
}

function redrawGlobe(rotation = false) {
	if (rotation && !isNaN(rotation[0]) && !isNaN(rotation[1])) {
		projection.rotate(rotation);
	}
	redrawGlobeTexture();
	globeOverlays.redraw();
}


initRotationControl(projection, textureCanvas, redrawGlobe);

initTextureGlobe(textureCanvas, projection, radius);
globeOverlays.init(overlayNode, projection, radius);

mapSelector.init(document.getElementById('maps-list'), handleMapUpdate);
initTimeline();

redrawGlobe();
