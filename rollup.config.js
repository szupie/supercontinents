import urlResolve from 'rollup-plugin-url-resolve';

export default {
	input: 'js/vendor-loader.js',
	output: {
		file: 'js/vendor-local.js'
	},
	plugins: [urlResolve()]
};
