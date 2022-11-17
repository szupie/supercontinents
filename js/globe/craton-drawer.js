import { select, selectAll } from '../d3-modules.js';
import { 
	geoCircle, geoCentroid, geoRotation
} from '../d3-modules.js';

import { topoToFeature } from '../d3-modules.js';
import { versor } from '../d3-modules.js';


export {
	initInstance,
	bindReconstructionDataToSelection,
	offsetRotator
}

const cratonsRequest = fetch('./assets/data/craton-shapes.json')
	.then(response=>response.json());
const countriesRequest = fetch('https://unpkg.com/world-atlas/countries-110m.json')
	.then(response=>response.json()).then(data=>{
		return topoToFeature(
			data, data.objects.countries
		).features;
	});
const hintsRequest = fetch('./assets/data/craton-hints.json')
	.then(response=>response.json());


function bindReconstructionDataToSelection(rotations, selection) {
	const cratons = selection.selectAll('.reconstruction > .craton');

	// hide all cratons
	cratons.attr('visibility', 'hidden');

	// update rotation parameters for cratons included in reconstruction
	Object.keys(rotations).forEach(cratonName=>{
		const craton = cratons.filter(d=>(d['name'] == cratonName));
		if (!craton.empty()) {
			craton.datum()['rotation'] = rotations[cratonName];
			craton.attr('visibility', null);
		}
	});
}

function initInstance(pathGen, svgNode, {simple=false}={}) {
	const svg = select(svgNode);
	const projection = pathGen.projection();

	return Promise.all([cratonsRequest, countriesRequest, hintsRequest])
		.then(([cratonShapesData, countryShapesData, hintsData])=>{
			initDom(cratonShapesData, countryShapesData, hintsData);

			return {
				getCratonCenters: getCratonCenters,
				redrawReconstruction: drawCratons
			}
		});


	function getCratonCenters() {
		const reconstructionData = svg
			.selectAll('.reconstruction > .craton:not([visibility="hidden"])')
			.data();

		return reconstructionData.map(d=>{
			const cratonShape = svg.select(
				`#path-${toValidHtmlId(d['name'])}`
			).datum();
			const modernCenter = geoCentroid(cratonShape);
			const reconstructedCenter = offsetRotator(
				geoRotation(d['rotation'])(modernCenter)
			);

			return {
				'name': d['name'],
				'coordinates': reconstructedCenter
			}
		});
	}


	function drawCratons() {
		const viewRotation = projection.rotate();

		// for each craton, rotate to reconstructed position and draw
		svg.selectAll(
			'.reconstruction > .craton:not([visibility="hidden"])'
		).each(function(d) {
			if (d['rotation']) {
				drawCraton(d['rotation'], d['name'], viewRotation);
			}
		});

		// set projection back to original rotation
		projection.rotate(viewRotation);
	}

	function drawCraton(cratonRotation, cratonName, viewRotation) {
		const cratonId = toValidHtmlId(cratonName);

		const viewQuaternion = versor(offsetRotator(viewRotation));
		const cratonViewQuaternion = versor.multiply(
			viewQuaternion, versor(cratonRotation)
		);

		// draw craton path
		projection.rotate(versor.rotation(cratonViewQuaternion));
		svg.select(`#path-${cratonId}`).attr('d', pathGen);

		// draw country outlines
		svg.selectAll(
			`.craton[data-craton-name="${cratonName}"] .countries path`
		).each(function(d) {
			if (!d['country-rotation']) {
				select(this).attr('d', pathGen);
			} else {
				// additional rotation for specified countries (like Greenland)
				projection.rotate(versor.rotation(versor.multiply(
					cratonViewQuaternion, versor(d['country-rotation'])
				)));
				select(this).attr('d', pathGen);
				projection.rotate(versor.rotation(cratonViewQuaternion));
			}

		});

		// update extended clip path (if it exists)
		const clipNode = svg.select(`#clip-extended-${cratonId}`);
		if (!clipNode.empty() && clipNode.datum()) {
			const radius = clipNode.datum()['r'];
			const center = [clipNode.datum()['lon'], clipNode.datum()['lat']];

			svg.select(`#clip-extended-${cratonId} path`)
				.attr('d', pathGen(circleGen.radius(radius).center(center)()));
		}
	}


	function initDom(cratonShapesData, countryShapesData, hintsData){
		const clipsGroup = svg.select('defs').append('g')
			.attr('class', 'craton-clips');

		const cratons = svg.insert('g', ':first-child')
			.attr('class', 'reconstruction')
			.selectAll('g').data(hintsData).join('g')
			.attr('class', 'craton')
			.attr('data-craton-name', d=>d['name']);

		cratons.each(function(cratonData) {
			const cratonId = toValidHtmlId(cratonData['name']);

			// create path node for craton
			select(this).append('path')
				.attr('class', 'craton-path')
				.attr('id', `path-${cratonId}`)
				.datum(cratonShapesData.features.filter(
					d=>d.properties.name == cratonData['name']
				)[0])
				.attr('d', pathGen);

			if (simple) {
				return;
				// for simple maps, skip masking and labels
			}

			// create clip-path referencing craton path
			clipsGroup.append('clipPath')
				.attr('id', `clip-${cratonId}`)
				.append('use')
					.attr('href', `#path-${cratonId}`);


			// create country outlines for craton
			const countrySubset = countryShapesData.filter(d=>{
				if (cratonData['countries']) {
					return cratonData['countries'].includes(d.properties.name);
				}
			});
			const countryRotations = cratonData['country-rotations'];
			let clipIdPrefix = 'clip';
			if (cratonData['extended-mask']) clipIdPrefix = 'clip-extended';

			select(this).append('g')
				.attr('class', 'countries')
				.attr('clip-path', `url(#${clipIdPrefix}-${cratonId})`)
				.selectAll('path').data(countrySubset).join('path')
					.attr('d', pathGen)
					.style('fill', 'none')
					.each(function(d) {
						if (countryRotations) {
							const rot = countryRotations[d.properties.name];
							if (rot) {
								select(this).datum()['country-rotation'] = rot;
							}
						}
					});

			// add extended circular mask if specified
			if (cratonData['extended-mask']) {
				clipsGroup.append('clipPath')
					.attr('id', `clip-extended-${cratonId}`)
					.datum(cratonData['extended-mask'])
					.append('path');
			}
		});		
	}

}


// static helpers

function toValidHtmlId(name) {
	return name.replace(/[^A-Za-z0-9]+/g, '-');
}

// offset to align Scotese 2016 reconstructions with
// Evans 2021 and Elming et al. 2021
const offsetRotator = geoRotation([104, 0, 0]);

const circleGen = geoCircle();
