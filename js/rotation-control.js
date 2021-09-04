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
	document.addEventListener('pointermove', handleDragMove);
	document.addEventListener('pointerup', handleDragEnd);
}

let startingGeoCoord;
let draggingGlobe = false;
let hemisphereOrientation = 1;
let lastY;

function handleDragStart(e){
	startingGeoCoord = projection.invert(pointer(e, canvasNode));
	if (!isNaN(startingGeoCoord[0]) && !isNaN(startingGeoCoord[1])) {
		draggingGlobe = true;

		const radius = projection.scale();
		lastY = pointer(e, canvasNode)[1]-radius;
		hemisphereOrientation = getHemisphereOrientation(
			startingGeoCoord, projection.rotate()[0]
		);
	}
}

function handleDragMove(e) {
	if (draggingGlobe) {
		const radius = projection.scale();

		let pointerOffset = pointer(e, canvasNode).map(val=>val-radius);

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
			redrawFunction([lambda, phi]);
		}
		// debugGeometry(startingGeoCoord, pointer(e, canvasNode), lambda, phi, radius);
	}
}

function handleDragEnd(e) {
	draggingGlobe = false;
}


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
		if (yOffsetAtLambda*plusOrMinus != ellipseOriginMaxY*(pointerY+ellipseOriginMaxY)+Math.pow(yOffsetAtLambda, 2)) {
			// this is usually the correct solution
			phi = toDegrees(2*Math.atan( (yOffsetAtLambda-plusOrMinus)/(pointerY+ellipseOriginMaxY) ));
		} else {
			if (yOffsetAtLambda*plusOrMinus+ellipseOriginMaxY*(pointerY+ellipseOriginMaxY)+Math.pow(yOffsetAtLambda, 2) != 0) {
				// can’t yet find a case when this would be correct
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
					const diff = rotationHistory[axis][i] - rotationHistory[axis][i+1];
					rotationDiffs.push(closestHalfRotation(diff));
				}
				const maxSpeed = 30;
				if (rotationDiffs.length) {
					recentSpeeds[axis] = clampAbs(
						rotationDiffs.reduce(
							(sum,current)=>sum+current
						) / rotationDiffs.length,
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

function clampAbs(val, abs) {
	return clamp(val, -abs, abs);
}

function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
}

// returns equivalent 0° ≤ degree < 360°
function normDegree(degree) {
	return (degree+3600)%360;
}

// returns equivalent -180° ≤ degree < 180°
function closestHalfRotation(degree) {
	return (degree+180+3600)%360-180;
}

function toDegrees(radians) {
	return radians/Math.PI*180;
}

function toRadians(degrees) {
	return degrees/180*Math.PI;
}
