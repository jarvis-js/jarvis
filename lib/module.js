/*global module*/

var events = require('events');
var util   = require('util');

var clone  = require('clone');

var Action = require('./action.js');

/**
 * A module which supplies commands, triggers and channels.
 */
function Module(name, details, config) {
	this.name = name;
	this.details = details;
	this.config = config;
	this.actions = [];
}

util.inherits(Module, events.EventEmitter);

module.exports = Module;

/**
 * Called when the module is unloaded.  Should be overridden
 * if anything needs to be deleted or any connections closed.
 */
Module.prototype.unload = function unload() {};

Module.prototype.createCommand = function(attributes) {
	var command = new Action(attributes);
	command.type = 'command';
	return command;
};

Module.prototype.createTrigger = function(attributes) {
	var trigger = new Action(attributes);
	trigger.type = 'trigger';
	return trigger;
};

Module.prototype.addAction = function addAction(action, callback) {
	if ( ! action.type || (action.type !== 'command' && action.type !== 'trigger')) {
		if (typeof callback === 'function') {
			callback(new Error('Invalid action type'));
		}
	}

	if (typeof action.match === 'string' || action.match instanceof RegExp) {
		action.match = [ action.match ];
	}

	var module = this;

	var registeredCount = 0;
	var registerAction = function(regex) {
		var act = clone(action);
		act.match = regex;

		module.actions.push(act);
		module.emit(act.type + '-added', act);

		registeredCount++;
		if (registeredCount === action.match.length) {
			if (typeof callback === 'function') {
				callback();
			}
		}
	};

	for (var i = 0; i < action.match.length; i++) {
		module.buildRegex(action.match[i], true, false, registerAction);
	}

};

/**
 * Build regular expression from the passed string pattern.
 *
 * @param {String} Command pattern.
 * @param {Boolean} If true, start and end character modifiers will be added.
 * @param {Boolean} Switch for case sensitive expressions.
 * @param {Function} Callback to register the command.
 */
Module.prototype.buildRegex = function buildRegex(pattern, anchors, caseSensitive, callback) {
	if (callback === undefined) {
		if (caseSensitive === undefined) {
			callback = anchors;
			anchors = true;
			caseSensitive = false;
		}
		else {
			callback = caseSensitive;
			caseSensitive = false;
		}
	}
	if (!(pattern instanceof RegExp)) {
		var components = pattern.split(' ');
		var componentCount = components.length;
		var requiredMarkerPositions = [];
		var optionalMarkerPositions = [];
		components.forEach(function(component, index) {
			if (component.slice(0, 1) === ':') {
				if (index === componentCount - 1) {
					components[index] = '(.+)';
				}
				else {
					components[index] = '([^\\s]+|"[^"]*")';
				}
				if (component.slice(0, 2) === ':?') {
					optionalMarkerPositions.push(index);
				}
				else {
					requiredMarkerPositions.push(index);
				}
			}
			else {
				components[index] = components[index].replace(/[-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
			}
		});
		var requiredMarkerCount = requiredMarkerPositions.length;
		var optionalMarkerCount = optionalMarkerPositions.length;
		var optionalGroupStartPositions = [];
		if (optionalMarkerCount > 0 && requiredMarkerCount > 0) {
			if (componentCount !== 1) {
				components[componentCount - 1] += new Array(optionalMarkerCount + 1).join(')?');
			}
			var lastRequiredMarkerPosition = requiredMarkerPositions[requiredMarkerCount - 1];
			components[lastRequiredMarkerPosition] = components[lastRequiredMarkerPosition] + '(?:';
			optionalGroupStartPositions.push(lastRequiredMarkerPosition + 1);

			optionalMarkerPositions.forEach(function(position, index) {
				if (index < optionalMarkerCount - 1) {
					components[position] = components[position] + '(?:';
					optionalGroupStartPositions.push(position + 1);
				}
			});
		}
		var patternString = components.join(' ');
		if (anchors) {
			patternString = '^' + patternString + '$';
		}
		pattern = new RegExp(patternString, (caseSensitive ? 'i' : ''));
	}
	if (typeof callback === 'function') {
		callback(pattern);
	}
};
