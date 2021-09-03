import { pointer } from 'https://cdn.skypack.dev/d3-selection@3';

export {
	init
}

let projection;
let canvasNode;
let redrawFunction = ()=>{};


function init(theProjection, theCanvasNode, theRedrawFunction) {
	projection = theProjection;
	canvasNode = theCanvasNode;
	redrawFunction = theRedrawFunction;

	canvasNode.parentNode.addEventListener('pointerdown', handleDragStart);
	canvasNode.parentNode.addEventListener('pointermove', handleDragMove);
	document.addEventListener('pointerup', handleDragEnd);
}

let startingGeoCoord;
let draggingGlobe = false;
function handleDragStart(e){
	startingGeoCoord = projection.invert(pointer(e, canvasNode));
	if (!isNaN(startingGeoCoord[0]) && !isNaN(startingGeoCoord[1])) {
		draggingGlobe = true;
	}
}

function handleDragMove(e) {
	if (draggingGlobe) {
		const radius = projection.scale();

		const pointerOffset = pointer(e, canvasNode).map(val=>val-radius);
		const pointerDistanceFromCenter = Math.sqrt(
			pointerOffset.map(val=>Math.pow(val, 2))
			.reduce((sum, current)=>sum+current)
		);

		if (pointerDistanceFromCenter < radius) {
			const [lambda, phi] = calcRotation(
				startingGeoCoord, pointerOffset, radius
			);
			if (!isNaN(lambda) && !isNaN(phi)) {
				initInertia();
				redrawFunction([lambda, phi]);
			}
			// debugGeometry(startingGeoCoord, pointer(e, canvasNode), lambda, phi, radius);
		}
	}
}

function handleDragEnd(e) {
	draggingGlobe = false;
}


function calcRotation(geoCoord, pointerOffset, radius) {
	// Farthest a point on a given latitude can be from polar axis
	// (In this projection, each latitude ellipse has a
	// constant horizontal radius regardless of viewing angle)
	const latitudeRadius = radius * Math.cos(toRadians(geoCoord[1]));

	const lambda = toDegrees(Math.asin(
		Math.min(pointerOffset[0]/latitudeRadius, 1)
	));


	const a = -pointerOffset[1]/radius;
	const b = Math.cos(toRadians(geoCoord[1]))*Math.cos(toRadians(lambda));
	const c = Math.sin(toRadians(geoCoord[1]));
	const plusOrMinus = Math.sqrt(-Math.pow(a,2)+Math.pow(b,2)+Math.pow(c,2));

	let phi;
	if (c != -a) {
		if (b*plusOrMinus != c*(a+c)+Math.pow(b, 2)) {
			phi = toDegrees(2*Math.atan( (b-plusOrMinus)/(a+c) ));
		} else {
			console.log('need to figure out when this happens');
			if (b*plusOrMinus+c*(a+c)+Math.pow(b, 2) != 0) {
				phi = toDegrees(2*Math.atan( (b+plusOrMinus)/(a+c) ));
			} else {
				console.log('not plus either');
			}
		}
	} else {
		phi = toDegrees(2*Math.atan(a/b));
		console.log('special case');
		if (b == 0) { console.log('why b == 0'); }
		if (Math.pow(a, 2)+Math.pow(b, 2) == 0) {console.log('why a^2+b^2 == 0');}
	}

	return [lambda - geoCoord[0], phi];
}

function debugGeometry(geoCoord, targetPos, lambda, phi, radius) {
	const latitudeRadius = radius * Math.cos(toRadians(geoCoord[1]));

	// brute force approach looping through phi values
	let brutePhi;
	let closest = 999;
	for (let i=-180; i<=180; i++) {
		projection.rotate([lambda, i, 0]);
		let distance = Math.sqrt(Math.pow(geoCoord[0]-projection.invert(targetPos)[0], 2) + Math.pow(geoCoord[1]-projection.invert(targetPos)[1], 2));
		if (distance < closest) {
			closest = distance;
			brutePhi = i;
		}
	}
	projection.rotate([lambda, phi]);
	if (Math.abs(brutePhi - phi) > 2) {
		console.log('excessive deviation between brute force vs. computed phi: ', brutePhi, phi);
	}

	// debugging overlays to confirm correct geometry
	const ctx = document.getElementById('globe-overlay').getContext('2d');
	ctx.beginPath();
	ctx.strokeStyle = '#f00';
	ctx.fillStyle = '#f00';

	// geo coordinate under pointer on drag start
	ctx.ellipse(...projection(geoCoord), 5, 5, 0, 0, 2*Math.PI);
	ctx.fill();
	
	// vertical position of pointer
	ctx.beginPath();
	ctx.moveTo(0, targetPos[1]);
	ctx.lineTo(radius*2, targetPos[1]);
	ctx.stroke();

	// vertical center of selected latitude’s projected ellipse
	const radiusHeight = Math.abs(latitudeRadius*Math.sin(toRadians(phi)));
	ctx.moveTo(0, radius-radius*Math.sin(toRadians(geoCoord[1]))*Math.cos(toRadians(phi)));
	ctx.lineTo(radius*2, radius-radius*Math.sin(toRadians(geoCoord[1]))*Math.cos(toRadians(phi)));
	ctx.stroke();

	// highlight line of latitude
	ctx.ellipse(radius, radius-radius*Math.sin(toRadians(geoCoord[1]))*Math.cos(toRadians(phi)), latitudeRadius, radiusHeight, 0, 0, 2*Math.PI);
	ctx.stroke();

}


// Inertial rotation

let inertiaActive = false;
function initInertia() {
	if (!inertiaActive) {
		window.requestAnimationFrame(inertiaUpdateLoop);
		inertiaActive = true;
	}
}

const rotationHistory = [[], []];
function inertiaUpdateLoop() {
	const currentRotation = projection.rotate().slice(0, 2);

	currentRotation.forEach((rotation, axis)=>{
		rotationHistory[axis].unshift(rotation);
		rotationHistory[axis].length = 5;
	});


	if (draggingGlobe) {
		window.requestAnimationFrame(inertiaUpdateLoop);
	} else {
		const recentSpeeds = [];

		currentRotation.forEach((rotation, axis)=>{
			const lastChange = rotation - rotationHistory[axis][0];
			if (!isNaN(lastChange)) {
				const rotationDiffs = [];
				for (let i=0; i<rotationHistory[axis].length-1; i++) {
					// to do: wrapping values
					const diff = rotationHistory[axis][i] - rotationHistory[axis][i+1];
					rotationDiffs.push(diff);
				}
				const maxSpeed = 30;
				if (rotationDiffs.length) {
					recentSpeeds[axis] = clamp(
						rotationDiffs.reduce((sum, current)=>sum+current) / rotationDiffs.length,
						-maxSpeed,
						maxSpeed
					);
				}
				if (Math.abs(recentSpeeds[axis]) < 0.01) {
					rotationHistory[axis].length = 0;
				}
			}
		});
		let newLambda = currentRotation[0];
		let newPhi = currentRotation[1];
		if (recentSpeeds[0] && !isNaN(recentSpeeds[0])) {
			newLambda = currentRotation[0] + recentSpeeds[0]*0.9;
		}
		if (recentSpeeds[1] && !isNaN(recentSpeeds[1])) {
			newPhi = currentRotation[1] + recentSpeeds[1]*0.9;
		}
		if (currentRotation[0] != newLambda || currentRotation[1] != newPhi) {
			redrawFunction([newLambda, newPhi]);
			window.requestAnimationFrame(inertiaUpdateLoop);
		} else {
			inertiaActive = false;
			rotationHistory[0].length = 0;
			rotationHistory[1].length = 0;
		}
	}
}


// Helper functions

function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
}

function toDegrees(radians) {
	return radians/Math.PI*180;
}

function toRadians(degrees) {
	return degrees/180*Math.PI;
}
