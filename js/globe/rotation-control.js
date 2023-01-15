import { pointer } from '../d3-modules.js';
import { clampAbs, clamp, easeInOut } from '../common-utils.js';

export {
	init,
	transitionToCoord,
	getCurrentRotation,
	isNorthUp,
	getDragCoords,
	getAntipodeRotation,
	setConstantRotation
}

let projection;
let redrawGlobe = ()=>{};
let dragHandlerNode;


function init(theProjection, theHandlerNode, redrawFunction) {
	projection = theProjection;
	redrawGlobe = redrawFunction;

	dragHandlerNode = theHandlerNode;
	dragHandlerNode.addEventListener('pointerdown', handleDragStart);
	dragHandlerNode.addEventListener('pointerup', handleDragEnd);
}


// Transition point to center

let transitionLoop;
const transitionDuration = 500;

function transitionToCoord(geoCoord) {
	cancelInertia();

	const start = getCurrentRotation();
	const startTime = Date.now();
	const rotationDiff = start.map((val,i)=>
		closestHalfRotation(-geoCoord[i]-val)
	);
	transitionLoop = ()=>{
		const percentage = clamp(
			(Date.now() - startTime)/transitionDuration,
			0, 1
		);
		const eased = easeInOut(percentage);
		const newRotation = rotationDiff.map((val,i)=>val*eased+start[i]);
		redrawGlobe(newRotation);

		if (percentage < 1) {
			requestAnimationFrame(transitionLoop);
		}
	}
	requestAnimationFrame(transitionLoop);
}
function cancelTransition() {
	transitionLoop = ()=>{};
}


// Handle drag events

let startingGeoCoord;
let hemisphereOrientation = 1;
let lastY;

function handleDragStart(e) {
	cancelTransition();

	startingGeoCoord = projection.invert(pointer(e, dragHandlerNode));
	if (!isNaN(startingGeoCoord[0]) && !isNaN(startingGeoCoord[1])) {
		dragHandlerNode.classList.add('user-rotated');
		dragHandlerNode.classList.add('dragging');
		dragHandlerNode.setPointerCapture(e.pointerId);
		dragHandlerNode.addEventListener('pointermove', handleDragMove);

		const radius = projection.scale();
		lastY = pointer(e, dragHandlerNode)[1]-radius;
		hemisphereOrientation = getHemisphereOrientation(
			startingGeoCoord, getCurrentRotation()[0]
		);

		redrawGlobe();
	}
}

function handleDragMove(e) {
	cancelTransition();

	const radius = projection.scale();

	let pointerOffset = pointer(e, dragHandlerNode).map(val=>val-radius);

	// clamp to closest point on globe circumference
	const pointerDistanceFromCenter = Math.sqrt(
		pointerOffset.map(val=>Math.pow(val, 2))
		.reduce((sum, current)=>sum+current)
	);
	if (pointerDistanceFromCenter > radius) {
		pointerOffset = pointerOffset.map(
			val=>val/pointerDistanceFromCenter*radius
		);
	}

	const [lambda, phi] = calcRotation(
		startingGeoCoord, pointerOffset, radius
	);
	if (!isNaN(lambda) && !isNaN(phi)) {
		const direction = lastY - pointerOffset[1];
		hemisphereOrientation = getHemisphereOrientation(
			startingGeoCoord, lambda, direction
		);
		lastY = pointerOffset[1];

		initInertia();
		redrawGlobe([lambda, phi]);
	}
	// debugGeometry(startingGeoCoord, pointer(e, dragHandlerNode), lambda, phi, radius);
}

function handleDragEnd(e) {
	dragHandlerNode.classList.remove('dragging');
	dragHandlerNode.releasePointerCapture(e.pointerId);
	dragHandlerNode.removeEventListener('pointermove', handleDragMove);
}

function getDragCoords() {
	if (dragHandlerNode.classList.contains('dragging')) {
		return startingGeoCoord;
	} else {
		return false;
	}
}


// Calculate rotations

function calcRotation(geoCoord, pointerOffset, radius) {
	// Farthest a point on a given latitude can be from polar axis
	// (In this projection, each latitude ellipse has
	// a constant horizontal radius regardless of viewing angle)
	const latitudeRadius = radius * Math.cos(toRadians(geoCoord[1]));

	const clampedPointerX = clampAbs(pointerOffset[0], latitudeRadius);
	let lambda = toDegrees(Math.asin(clampedPointerX/latitudeRadius));
	if (hemisphereOrientation == -1) {
		lambda = 180-lambda;
	}

	const pointerY = -pointerOffset[1];
	const yOffsetAtLambda = latitudeRadius*Math.cos(toRadians(lambda));
	const ellipseOriginMaxY = radius*Math.sin(toRadians(geoCoord[1]));
	const plusOrMinus = Math.sqrt(-Math.pow(pointerY,2)+Math.pow(yOffsetAtLambda,2)+Math.pow(ellipseOriginMaxY,2));

	let phi;
	if (ellipseOriginMaxY != -pointerY) {
		if (plusOrMinus != ellipseOriginMaxY*(pointerY+ellipseOriginMaxY)/yOffsetAtLambda+yOffsetAtLambda) {
			// this is usually the correct solution
			phi = toDegrees(2*Math.atan( (yOffsetAtLambda-plusOrMinus)/(pointerY+ellipseOriginMaxY) ));
		} else {
			if (yOffsetAtLambda+ellipseOriginMaxY*(pointerY+ellipseOriginMaxY)/plusOrMinus+yOffsetAtLambda != 0) {
				// I have no idea if this has any geometric meaning
				// but I guess it’s needed to resolve singularities
				phi = toDegrees(2*Math.atan( (yOffsetAtLambda+plusOrMinus)/(pointerY+ellipseOriginMaxY) ));
			} else {
				console.log('Unhandled case:', pointerY, yOffsetAtLambda, ellipseOriginMaxY);
			}
		}
	} else {
		// I guess the above formulas run into a division by 0 issue
		// when a point is dragged to its mirrored position across the equator,
		// and this other formula works only for those specific instances?
		phi = toDegrees(2*Math.atan(pointerY/yOffsetAtLambda));
	}

	return [lambda - geoCoord[0], phi];
}

// value depends on which east-west hemisphere the coordinate lies:
// 1: if upwards from the point leads closer to north pole
// -1: if upwards from the point leads closer to south pole
// 0: if coordinate is rotated maximally eastward/westward
function getHemisphereOrientation(geoCoord, lambda, direction) {
	const angleFromFront = normDegree(
		lambda + geoCoord[0]
	);
	if (angleFromFront > 90 && angleFromFront < 270) {
		return -1;
	} else if (angleFromFront == 90 || angleFromFront == 270) {
		if (direction) {
			// positive direction means up; positive latitude means north
			// use south-up orientation when moving up in northern hemisphere;
			// use south-up orientation when moving down in southern hemisphere
			// so, use south-up when signs match
			if (direction * geoCoord[1] > 0) {
				return -1;
			} else {
				return 1;
			}
		} else {
			return 0;
		}
	} else {
		return 1;
	}
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
const rotationHistories = [[], []];
const maxInertiaSpeed = 30;
const inertiaDecayFactor = 0.9;
const inertiaWindowSize = 5;

function initInertia() {
	if (!inertiaActive) {
		window.requestAnimationFrame(inertiaUpdateLoop);
		inertiaActive = true;
	}
}
function cancelInertia() {
	inertiaActive = false;
	rotationHistories[0].length = 0;
	rotationHistories[1].length = 0;
}

function inertiaUpdateLoop() {
	// record current rotation
	const currentRotation = getCurrentRotation();
	currentRotation.forEach((rotation, axis)=>{
		rotationHistories[axis].unshift(rotation);
		rotationHistories[axis].length = inertiaWindowSize;
	});

	if (!dragHandlerNode.classList.contains('dragging')) {
		const newRotation = currentRotation.slice();

		currentRotation.forEach((rotation, axis)=>{
			const avgSpeed = calculateRecentSpeed(rotationHistories[axis]);

			// calculate new rotation if speed is over threshold
			if (!isNaN(avgSpeed) && Math.abs(avgSpeed) > 0.01) {
				newRotation[axis] = rotation + clampAbs(
					avgSpeed, maxInertiaSpeed
				) * inertiaDecayFactor;
			} else {
				rotationHistories[axis].length = 0;
			}
		});

		if (currentRotation[0] != newRotation[0] || 
			currentRotation[1] != newRotation[1]) {
			redrawGlobe(newRotation);
			window.requestAnimationFrame(inertiaUpdateLoop);
		} else {
			cancelInertia();
		}
	} else {
		// continue recording rotations while dragging in order to detect stops
		window.requestAnimationFrame(inertiaUpdateLoop);
	}
}

function calculateRecentSpeed(history) {
	const rotationDiffs = [];
	for (let i=0; i<history.length-1; i++) {
		const diff = history[i] - history[i+1];
		rotationDiffs.push(closestHalfRotation(diff));
	}

	if (rotationDiffs.length) {
		return rotationDiffs.reduce(
			(sum,current)=>sum+current
		) / rotationDiffs.length;
	}
}


// constant rotation

let rotationLoopId;
function setConstantRotation(active) {
	window.cancelAnimationFrame(rotationLoopId);
	if (active) {
		rotationLoopId = window.requestAnimationFrame(rotationUpdateLoop);
	}
}

function rotationUpdateLoop() {
	// record current rotation
	const newRotation = getCurrentRotation();
	newRotation[0] += 0.03;

	redrawGlobe(newRotation);
	rotationLoopId = window.requestAnimationFrame(rotationUpdateLoop);
}


// Helper functions

// returns equivalent 0° ≤ degree < 360°
function normDegree(degree) {
	return (degree+3600)%360;
}

// returns equivalent -180° < degree ≤ 180°
function closestHalfRotation(degree) {
	// use negative degree to prefer eastward rotation
	return 180 - (-degree+180+3600)%360;
}

function toDegrees(radians) {
	return radians/Math.PI*180;
}

function toRadians(degrees) {
	return degrees/180*Math.PI;
}

function getCurrentRotation() {
	return projection.rotate().slice(0, 2);
}

function isNorthUp() {
	return (getCurrentRotation()[1] < 90 && getCurrentRotation()[1] > -90);
}

function getAntipodeRotation() {
	return [getCurrentRotation()[0]+180, -getCurrentRotation()[1]];
}
