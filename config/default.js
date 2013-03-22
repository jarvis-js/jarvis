/*global module*/

var path = require('path');

var modulePath = path.resolve(__dirname + '/../node_modules/');

module.exports = {

	server: {
		port: 8000
	},

	module: {
		exclude: [],
		paths: [
			modulePath.toString()
		],
		prefix: 'jarvis-module-',
		settings: {}
	},

	brain: {
		mode: null,
		prefix: 'jarvis-brain-',
		settings: {}
	},

	debug: false

};
