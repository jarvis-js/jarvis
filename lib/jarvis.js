/*global Error,module,require*/

var events = require('events');
var fs     = require('fs');
var path   = require('path');
var util   = require('util');

var bunyan = require('bunyan');
var glob   = require('glob');
var clone  = require('clone');

var Brain     = require('./brain.js');
var Channel   = require('./channel.js');
var Group     = require('./group.js');
var Module    = require('./module.js');
var User      = require('./user.js');

function Jarvis(config) {

	this.config = config;

	this.log = bunyan.createLogger({
		name: 'jarvis',
		level: config.logLevel || 'info'
	});

	this.users = [];
	this.groups = [];

	this.brain = null;
	this.channels = [];
	this.modules = [];

}

util.inherits(Jarvis, events.EventEmitter);

module.exports = Jarvis;

/**
 * Load modules and start REST API.
 * @param  {Function} callback Function called when Jarvis has loaded.
 */
Jarvis.prototype.bootUp = function bootUp(callback) {
	var self = this;

	var storage = Brain;

	if (self.config.brain.mode) {
		storage = require(self.config.brain.prefix + self.config.brain.mode);
	}
	self.brain = new storage(self.config.brain.config);
	self.brain.wake(function() {

		self.loadUsers();
		self.loadGroups();

		self.findModules(function(foundModules) {

			var onModuleLoaded = function(error, moduleDetails) {
				if (error) {
					throw error;
				}
			};

			foundModules.forEach(function(moduleDetails) {
				self.loadModule(moduleDetails, onModuleLoaded);
			});
		});
	});
};

/**
 * Unloads modules and stops the REST API.
 * @param  {Function} callback Function called when Jarvis has shutdown.
 */
Jarvis.prototype.shutdown = function shutdown(callback) {
	var self = this;
	var moduleCount = Object.keys(this.modules).length;
	var unloadedCount = 0;

	var checkUnloaded = function() {
		unloadedCount++;
		if (moduleCount === unloadedCount) {
			self.brain.sleep(function() {
				self.server.close(callback);
			});
		}
	};

	for (var i = 0; i < this.modules.length; i++) {
		this.unloadModule(this.modules[i].name, checkUnloaded);
	}
};

/**
 * Looks in the module search paths for modules whose name start with the
 * module prefix.
 * @param  {Function} callback Called after modules have been found.
 */
Jarvis.prototype.findModules = function findModules(callback) {
	var self = this;

	var searchPaths = this.config.module.paths;
	if (typeof searchPaths === 'string') {
		searchPaths = [ searchPaths ];
	}

	var searchedCount = 0;
	var foundModules = [];

	var onGlobResult = function(error, directories) {
		searchedCount++;

		directories.forEach(function(directory) {
			var modulePrefix = self.config.module.prefix;
			var splitPath = directory.split('/');
			var moduleName = splitPath.pop().substr(modulePrefix.length);
			var modulePath = splitPath.join('/');

			foundModules.push({
				name: moduleName,
				prefix: modulePrefix,
				path: modulePath,
				fullPath: modulePath + '/' + modulePrefix + moduleName
			});
		});

		if (searchedCount === searchPaths.length) {
			callback(foundModules);
		}
	};

	searchPaths.forEach(function(searchPath) {
		glob(path.join(searchPath, self.config.module.prefix) + '*', onGlobResult);
	});
};

Jarvis.prototype.loadModule = function loadModule(moduleDetails, callback) {
	var moduleName = moduleDetails.name;

	if (this.config.module.exclude.indexOf(moduleName) !== -1 || this.config.module.exclude.indexOf('*') !== -1) {
		this.log.info('Skipping module ' + moduleName + ' - In exclude list');
		return;
	}

	for (var i = 0; i < this.modules.length; i++) {
		if (this.modules[i].name === moduleName) {
			callback(null, this.modules[i].name);
			return;
		}
	}

	var config = {};
	if (this.config.module.config && this.config.module.config[moduleName]) {
		config = this.config.module.config[moduleName];
	}

	var module = new Module(moduleName, moduleDetails, config);
	var fullPath = path.join(moduleDetails.path, moduleDetails.prefix + moduleName);

	require(fullPath)(this, module);
	this.modules.push(module);

	this.emit('module-loaded', moduleDetails);
	callback(null, moduleDetails);
};

Jarvis.prototype.unloadModule = function unloadModule(name, callback) {
	var self = this;

	var index;
	for (var i = 0; i < this.modules.length; i++) {
		if (this.modules[i].name === name) {
			index = i;
			break;
		}
	}

	if ( ! index) {
		callback(new Error('Module ' + name + ' not loaded to unload'));
		return;
	}

	for (var nodeModule in require.cache) {
		if (nodeModule.indexOf(this.modules[index].details.fullPath + '/') === 0) {
			delete require.cache[nodeModule];
		}
	}

	this.modules[index].unload();
	this.modules.splice(i, 1);

	self.emit('module-unloaded', name);
	callback();
};

Jarvis.prototype.recall = function recall(key, callback) {
	this.brain.recall(key, callback);
};

Jarvis.prototype.remember = function remember(key, data, callback) {
	this.brain.remember(key, data, callback);
};

Jarvis.prototype.forget = function forget(key, callback) {
	this.brain.forget(key, callback);
};

Jarvis.prototype.createChannel = function createChannel(identifier) {
	var self = this;
	var channel = new Channel(identifier);
	channel.on('message', function(message) {
		self.respondTo(message);
	});
	this.channels.push(channel);
	return channel;
};

Jarvis.prototype.getChannel = function getChannel(identifier) {
	for (var i = 0; i < this.channels.length; i++) {
		var channel = this.channels[i];
		if (channel.identifier === identifier) {
			return channel;
		}
	}
};

Jarvis.prototype.removeChannel = function removeChannel(identifier) {
	for (var i = 0; i < this.channels.length; i++) {
		if (this.channels[i].identifier === identifier) {
			this.channels.split(i, 1);
			break;
		}
	}
};

Jarvis.prototype.say = function say(message, response) {
	for (var i = 0; i < this.channels.length; i++) {
		if (this.channels[i].identifier === message.channel) {
			this.channels[i].say(message, response);
			break;
		}
	}
};

Jarvis.prototype.reply = function reply(message, response) {
	for (var i = 0; i < this.channels.length; i++) {
		if (this.channels[i].identifier === message.channel) {
			this.channels[i].reply(message, response);
			break;
		}
	}
};

Jarvis.prototype.action = function action(message, response) {
	for (var i = 0; i < this.channels.length; i++) {
		if (this.channels[i].identifier === message.channel) {
			this.channels[i].action(message, response);
			break;
		}
	}
};

Jarvis.prototype.respondTo = function respondTo(message) {
	var matching;

	var module;
	action_search_loop:
	for (var i = 0; i < this.modules.length; i++) {
		module = this.modules[i];

		for (var actionKey in module.actions) {
			var action = module.actions[actionKey];

			var match = action.match.exec(message.body);
			if (match) {
				if (action.type === 'command' || (action.type === 'trigger' && ! matching)) {
					matching = {
						action: action,
						match: match
					};
					if (action.type === 'command') {
						break action_search_loop;
					}
				}
			}
		}

	}

	if (matching) {
		var matchedResult = matching.match;
		var matchedAction = matching.action;

		if (matchedAction.type === 'command' && ! message.direct) {
			return;
		}

		var permission = module.name + ':' + matchedAction.name;

		this.hasPermission(message.user.identifier, permission, matchedAction.secure, function(permitted) {
			if (permitted) {
				delete matchedResult.input;
				delete matchedResult.index;
				var args = matchedResult.slice(1);
				for (var i = 0; i < args.length; i++) {
					if (args[i] !== undefined) {
						args[i] = args[i].replace(/^"(.*)"$/, "$1");
					}
				}
				args.unshift(message);
				matchedAction.func.apply(message, args);
			}
		});

	}
};

Jarvis.prototype.hasPermission = function hasPermission(userIdentifier, permission, security, callback) {
	var permitted = false;
	if ( ! security) {
		permitted = true;
	}
	else {
		var user;
		for (var i = 0; i < this.users.length; i++) {
			user = this.users[i];
			if (user.hasIdentity(userIdentifier)) {
				if (user.hasPermission(permission)) {
					permitted = true;
					break;
				}
			}
		}

		if ( ! permitted && user) {
			for (var j = 0; j < this.groups.length; j++) {
				var group = this.groups[j];
				if (group.hasUser(user.name) && group.hasPermission(permission)) {
					permitted = true;
					break;
				}
			}
		}
	}

	callback(permitted);
};

Jarvis.prototype.addUser = function addUser(username, callback) {
	var self = this;

	var exists = false;
	for (var i = 0; i < this.users.length; i++) {
		var user = this.users[i];
		if (user.name === username) {
			if (typeof callback === 'function') {
				callback(new Error('User already exists'));
			}
			return;
		}
	}

	var newUser = new User(username);

	this.listenToUser(newUser);

	this.users.push(newUser);
	this.emit('user-added', newUser);

	this.saveUsers();

	if (typeof callback === 'function') {
		callback(null, newUser);
	}
};

Jarvis.prototype.deleteUser = function deleteUser(username, callback) {
	var i = null;
	for (i = 0; i < this.users.length; i++) {
		if (this.users[i].name === username) {
			break;
		}
	}

	if (i === null) {
		if (typeof callback === 'function') {
			callback(new Error('User not found'));
		}
		return;
	}

	var user = this.users.splice(i, 1);
	this.emit('user-deleted', user[0]);

	this.saveUsers();

	for (var j = 0; j < this.groups.length; j++) {
		var group = this.groups[j];
		group.deleteUser(username);
	}

	if (typeof callback === 'function') {
		callback();
	}
};

Jarvis.prototype.findUser = function findUser(username, callback) {
	for (var i = 0; i < this.users.length; i++) {
		var user = this.users[i];
		if (user.name === username) {
			if (typeof callback === 'function') {
				callback(null, user);
			}
			return;
		}
	}

	if (typeof callback === 'function') {
		callback(new Error('User not found with username "' + username + '"'));
	}
};

Jarvis.prototype.findUserWithIdentity = function findUserWithIdentity(identifier, callback) {
	for (var i = 0; i < this.users.length; i++) {
		var user = this.users[i];
		if (user.hasIdentity(identifier)) {
			if (typeof callback === 'function') {
				callback(null, user);
			}
			return;
		}
	}

	if (typeof callback === 'function') {
		callback(new Error('User not found with identity "' + identifier + '"'));
	}
};

Jarvis.prototype.loadUsers = function loadUsers(callback) {
	var self = this;
	this.recall('users', function(users) {
		if (users) {
			users.forEach(function(user) {
				var u = Object.create(User.prototype);
				for (var key in user) {
					u[key] = user[key];
				}

				self.listenToUser(u);

				self.users.push(u);
			});
		}

		if (typeof callback === 'function') {
			callback();
		}
	});
};

Jarvis.prototype.saveUsers = function saveUsers(callback) {
	this.remember('users', this.users, callback);
};

Jarvis.prototype.listenToUser = function listenToUser(user) {
	var self = this;

	[
		'identity-added',
		'identity-deleted',
		'permission-added',
		'permission-deleted'
	].forEach(function(event) {
		user.on(event, function() {
			self.saveUsers();
		});
	});
};

Jarvis.prototype.addGroup = function addGroup(name, callback) {
	var self = this;

	var exists = false;
	for (var i = 0; i < this.groups.length; i++) {
		var group = this.groups[i];
		if (group.name === name) {
			if (typeof callback === 'function') {
				callback(new Error('Group already exists'));
			}
			return;
		}
	}

	var newGroup = new Group(name);

	this.listenToGroup(newGroup);

	this.groups.push(newGroup);
	this.emit('group-added', newGroup);

	this.saveGroups();

	if (typeof callback === 'function') {
		callback(null, newGroup);
	}
};

Jarvis.prototype.deleteGroup = function deleteGroup(name, callback) {
	var i = null;
	for (i = 0; i < this.groups.length; i++) {
		if (this.groups[i].name === name) {
			break;
		}
	}

	if (i === null) {
		if (typeof callback === 'function') {
			callback(new Error('Group not found'));
		}
		return;
	}

	var group = this.groups.splice(i, 1);
	this.emit('group-deleted', group[0]);

	this.saveGroups();

	if (typeof callback === 'function') {
		callback();
	}
};

Jarvis.prototype.findGroup = function findGroup(name, callback) {
	for (var i = 0; i < this.groups.length; i++) {
		var group = this.groups[i];
		if (group.name === name) {
			if (typeof callback === 'function') {
				callback(null, group);
			}
			return;
		}
	}

	if (typeof callback === 'function') {
		callback(new Error('Group not found with name "' + name + '"'));
	}
};

Jarvis.prototype.loadGroups = function loadGroups(callback) {
	var self = this;
	this.recall('groups', function(groups) {
		if (groups) {
			groups.forEach(function(group) {
				var g = Object.create(Group.prototype);
				for (var key in group) {
					g[key] = group[key];
				}

				self.listenToGroup(g);

				self.groups.push(g);
			});
		}

		if (typeof callback === 'function') {
			callback();
		}
	});
};

Jarvis.prototype.saveGroups = function saveGroups(callback) {
	this.remember('groups', this.groups, callback);
};

Jarvis.prototype.listenToGroup = function listenToGroup(group) {
	var self = this;

	[
		'user-added',
		'user-deleted',
		'permission-added',
		'permission-deleted'
	].forEach(function(event) {
		group.on(event, function() {
			self.saveGroups();
		});
	});
};

Jarvis.prototype.getModules = function() {
	var modules = [];
	for (var i = 0; i < this.modules.length; i++) {
		var module = clone(this.modules[i]);
		var actions = [];

		for (var j = 0; j < module.actions.length; j++) {
			var action = clone(module.actions[j]);
			action.match = action.match.toString();
			actions.push(action);
		}

		module.actions = actions;
		delete module.details;
		delete module.config;
		delete module._events;
		modules.push(module);
	}
	return modules;
};

Jarvis.prototype.getActions = function() {
	var actions = [];
	for (var i = 0; i < this.modules.length; i++) {
		var module = this.modules[i];
		for (var j = 0; j < module.actions.length; j++) {
			var action = clone(module.actions[j]);
			action.match = action.match.toString();
			actions.push(action);
		}
	}
	return actions;
};
