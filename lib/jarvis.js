/*global Error,module,require*/

var events = require('events');
var fs     = require('fs');
var path   = require('path');
var util   = require('util');

var bunyan = require('bunyan');
var glob   = require('glob');

var ApiServer = require('./apiserver.js');
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

	this.server = new ApiServer(this.config.server, this);

	this.users = [];
	this.groups = [];

	this.brain = null;
	this.channels = {};
	this.modules = {};

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
		driver = require(self.config.brain.prefix + self.config.brain.mode);
	}
	self.brain = new storage(self.config.brain.settings);
	self.brain.wake(function() {

		self.retrieve('users', function(users) {
			if (users) {
				self.users = users;
			}
		});

		self.retrieve('groups', function(groups) {
			if (groups) {
				self.groups = groups;
			}
		});

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
		self.server.listen(function(err) {
			self.log.info('Server listening on port ' + self.config.server.port);
			if (typeof callback === 'function') {
				callback(err);
			}
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

	for (var module in this.modules) {
		this.unloadModule(module, checkUnloaded);
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

	if (this.modules[moduleName]) {
		callback(null, this.modules[moduleName].details);
		return;
	}

	var options = {};
	if (this.config.module.settings[moduleName]) {
		options = this.config.module.settings[moduleName];
	}

	var module = new Module(moduleName, moduleDetails, options);
	var fullPath = path.join(moduleDetails.path, moduleDetails.prefix + moduleName);

	require(fullPath)(this, module);
	this.modules[moduleName] = module;

	this.emit('module-loaded', moduleDetails);
	callback(null, moduleDetails);
};

Jarvis.prototype.unloadModule = function unloadModule(name, callback) {
	var self = this;
	if ( ! this.modules[name]) {
		callback(new Error('Module ' + name + ' not loaded to unload'));
		return;
	}

	for (var nodeModule in require.cache) {
		if (nodeModule.indexOf(this.modules[name].details.fullPath + '/') === 0) {
			delete require.cache[nodeModule];
		}
	}

	this.modules[name].unload();
	delete this.modules[name];

	self.emit('module-unloaded', name);
	callback();
};

Jarvis.prototype.retrieve = function retrieve(key, callback) {
	this.brain.retrieve(key, callback);
};

Jarvis.prototype.remember = function remember(key, data, callback) {
	this.brain.remember(key, data, callback);
};

Jarvis.prototype.forget = function forget(key, callback) {
	this.brain.forget(key, callback);
};

Jarvis.prototype.createChannel = function(identifier) {
	var self = this;
	var channel = new Channel(identifier);
	channel.on('message', function(message) {
		self.respondTo(message);
	});
	this.channels[identifier] = channel;
	return channel;
};

Jarvis.prototype.removeChannel = function(identifier) {
	if (this.channels[identifier]) {
		this.channels[identifier].removeAllListeners();
		delete this.channels[identifier];
	}
};

Jarvis.prototype.say = function(message, response) {
	if (this.channels[message.channel]) {
		this.channels[message.channel].say(message, response);
	}
};

Jarvis.prototype.reply = function(message, response) {
	if (this.channels[message.channel]) {
		this.channels[message.channel].reply(message, response);
	}
};

Jarvis.prototype.action = function(message, response) {
	if (this.channels[message.channel]) {
		this.channels[message.channel].action(message, response);
	}
};

Jarvis.prototype.respondTo = function(message) {
	var matching;

	var module;
	action_search_loop:
	for (var moduleKey in this.modules) {
		module = this.modules[moduleKey];

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
		var permission    = module.name + ':' + matchedAction.name;

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

	[
		'identity-added',
		'identity-deleted',
		'permission-added',
		'permission-deleted'
	].forEach(function(event) {
		newUser.on(event, function() {
			self.saveUsers();
		});
	});

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

Jarvis.prototype.loadUsers = function loadUsers(callback) {
	var self = this;
	this.retrieve('users', function(users) {
		if (users) {
			self.users = users;
		}

		if (typeof callback === 'function') {
			callback();
		}
	});
};

Jarvis.prototype.saveUsers = function saveUsers(callback) {
	this.remember('users', this.users, callback);
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

	[
		'user-added',
		'user-deleted',
		'permission-added',
		'permission-deleted'
	].forEach(function(event) {
		newGroup.on(event, function() {
			self.saveGroups();
		});
	});

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
	this.retrieve('groups', function(groups) {
		if (groups) {
			self.groups = groups;
		}

		if (typeof callback === 'function') {
			callback();
		}
	});
};

Jarvis.prototype.saveGroups = function saveGroups(callback) {
	this.remember('groups', this.groups, callback);
};