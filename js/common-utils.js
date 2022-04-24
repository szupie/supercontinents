export {
	clampAbs, clamp, easeInOut
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
