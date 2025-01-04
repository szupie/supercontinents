export {
	clampAbs, clamp, easeInOut, easeInOutQuart, addPointerListener
}

function clampAbs(val, abs) {
	return clamp(val, -abs, abs);
}

function clamp(val, min, max) {
	return Math.min(Math.max(val, min), max);
}

function easeInOut(percentage) {
	return (Math.sin((percentage-0.5)*Math.PI) + 1) / 2;
}

function easeInOutQuart(percentage) {
	if (percentage < 0.5) {
		return 8 * Math.pow(percentage, 4);
	} else {
		return 1 - Math.pow(-2 * percentage + 2, 4) / 2;
	}
}

const PointerEventFallbackMap = Object.freeze({
	'pointerdown': {
		'touch': 'touchstart',
		'mouse': 'mousedown'
	},
	'pointerup': {
		'touch': 'touchend',
		'mouse': 'mouseup'
	},
	'pointermove': {
		'touch': 'touchmove',
		'mouse': 'mousemove'
	},
});
// attaches pointer event listener, or equivalent single-touch or mouse events
function addPointerListener(node, eventType, handler) {
	if (typeof PointerEvent !== 'undefined') {
		node.addEventListener(eventType, handler);
	} else {
		node.addEventListener(PointerEventFallbackMap[eventType]['touch'], e=>{
			if (e.type === 'touchend') {
				handler(e);
			} else if (e.touches[0]) {
				// copy position data to event root to mimic PointerEvent
				// (while supporting preventDefault)
				e.clientX = e.touches[0].clientX;
				e.clientY = e.touches[0].clientY;
				handler(e);
			}
			else { console.error('Unexpected TouchEvent with no touches', e); }
		});
		node.addEventListener(PointerEventFallbackMap[eventType]['mouse'], handler);
	}
}
