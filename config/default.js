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
		config: {}
	},

	brain: {
		mode: null,
		prefix: 'jarvis-brain-',
		config: {}
	},

	debug: false

};
