export {
	clampAbs, clamp, easeInOut, easeInOutQuart
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
