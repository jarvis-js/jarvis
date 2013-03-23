/*global module,require*/

var clone = require('clone');

var Bunyan  = require('bunyan');
var Restify = require('restify');

/**
 * REST API server.
 * @param {Object} config Config object.
 * @param {Jarvis} jarvis Jarvis instance.
 */
function ApiServer(config, jarvis) {
	this.config = config;
	this.jarvis = jarvis;

	var serverOptions = {
		name: 'Jarvis'
	};
	if (jarvis.config.debug) {
		serverOptions.log = Bunyan.createLogger({
			level: 'error',
			name: 'jarvis',
			stream: process.stdout
		});
	}

	this.server = Restify.createServer(serverOptions);
	this.server.use(Restify.bodyParser());

	var self = this;
	this.server.get('/', function(request, response, next) { self.getRoutes(request, response, next); });

	this.server.get('/modules', function(request, response, next) { self.getModules(request, response, next); });
	this.server.get('/actions', function(request, response, next) { self.getActions(request, response, next); });

	this.server.get('/users', function(request, response, next) { self.getUsers(request, response, next); });
	this.server.post('/users', function(request, response, next) { self.addUser(request, response, next); });
	this.server.get('/users/:user', function(request, response, next) { self.getUser(request, response, next); });
	this.server.del('/users/:user', function(request, response, next) { self.deleteUser(request, response, next); });

	this.server.get('/users/:user/identities', function(request, response, next) { self.getUserIdentities(request, response, next); });
	this.server.post('/users/:user/identities', function(request, response, next) { self.addUserIdentity(request, response, next); });
	this.server.del('/users/:user/identities/:identity', function(request, response, next) { self.deleteUserIdentity(request, response, next); });

	this.server.get('/users/:user/permissions', function(request, response, next) { self.getUserPermissions(request, response, next); });
	this.server.post('/users/:user/permissions', function(request, response, next) { self.addUserPermission(request, response, next); });
	this.server.del('/users/:user/permissions/:permission', function(request, response, next) { self.deleteUserPermission(request, response, next); });

	this.server.get('/groups', function(request, response, next) { self.getGroups(request, response, next); });
	this.server.post('/groups', function(request, response, next) { self.addGroup(request, response, next); });
	this.server.get('/groups/:group', function(request, response, next) { self.getGroup(request, response, next); });
	this.server.del('/groups/:group', function(request, response, next) { self.deleteGroup(request, response, next); });

	this.server.get('/groups/:group/users', function(request, response, next) { self.getGroupUsers(request, response, next); });
	this.server.post('/groups/:group/users', function(request, response, next) { self.addGroupUser(request, response, next); });
	this.server.del('/groups/:group/users/:user', function(request, response, next) {self.deleteGroupUser(request, response, next); });

	this.server.get('/groups/:group/permissions', function(request, response, next) { self.getGroupPermissions(request, response, next); });
	this.server.post('/groups/:group/permissions', function(request, response, next) { self.addGroupPermission(request, response, next); });
	this.server.del('/groups/:group/permissions/:permission', function(request, response, next) { self.deleteGroupPermission(request, response, next); });
}

module.exports = ApiServer;

/**
 * Start the server.
 * @param  {Function} callback Function to call when server is listening.
 */
ApiServer.prototype.listen = function listen(callback) {
	this.server.listen(this.config.port, callback);
};

/**
 * Close the server.
 * @param  {Function} callback Function to call when server has stopped listening.
 */
ApiServer.prototype.close = function close(callback) {
	this.server.close(callback);
};

/**
 * GET /
 */
ApiServer.prototype.getRoutes = function getRoutes(request, response, next) {
	response.json(200, [
		'GET /',
		'GET /modules',
		'GET /actions',
		'GET /users',
		'POST /users',
		'GET /users/:user',
		'DELETE /users/:user',
		'GET /users/:user/identities',
		'POST /users/:user/identities',
		'DELETE /users/:user/identities/:identity',
		'GET /users/:user/permissions',
		'POST /users/:user/permissions',
		'DELETE /users/:user/permissions/:permission',
		'GET /groups',
		'POST /groups',
		'GET /groups/:group',
		'DELETE /groups/:group',
		'GET /groups/:group/users',
		'POST /groups/:group/users',
		'DELETE /groups/:group/users/:user',
		'GET /groups/:group/permissions',
		'POST /groups/:group/permissions',
		'DELETE /groups/:group/permissions/:permission'
	]);
	return next();
};

/**
 * GET /modules
 */
ApiServer.prototype.getModules = function getModules(request, response, next) {
	var modules = [];
	for (var i = 0; i < this.jarvis.modules.length; i++) {
		var module = clone(this.jarvis.modules[i]);
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

	response.json(200, modules);
	return next();
};

ApiServer.prototype.getActions = function getActions(request, response, next) {
	var actions = [];
	for (var i = 0; i < this.jarvis.modules.length; i++) {
		var module = this.jarvis.modules[i];
		for (var j = 0; j < module.actions.length; j++) {
			var action = clone(module.actions[j]);
			action.match = action.match.toString();
			actions.push(action);
		}
	}

	response.json(200, actions);
	return next();
};

/**
 * GET /users
 */
ApiServer.prototype.getUsers = function getUsers(request, response, next) {
	response.json(200, this.jarvis.users);
	return next();
};

/**
 * POST /users
 *
 * Params: {
 *   user: Name of user to add.
 * }
 */
ApiServer.prototype.addUser = function addUser(request, response, next) {
	if ( ! request.params.user) {
		return next(new Restify.BadRequestError('Missing user parameter'));
	}

	var name = request.params.user;

	this.jarvis.addUser(name, function(error, user) {
		if (error) {
			return next(new Restify.ConflictError(error.message));
		}

		response.json(user);
		return next();
	});
};

/**
 * GET /users/:user
 */
ApiServer.prototype.getUser = function getUser(request, response, next) {
	var name = request.params.user;

	this.jarvis.findUser(name, function(error, user) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(user);
		return next();
	});
};

/**
 * DELETE /users/:user
 */
ApiServer.prototype.deleteUser = function deleteUser(request, response, next) {
	var name = request.params.user;

	this.jarvis.deleteUser(name, function(error) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(200);
		return next();
	});
};

/**
 * GET /users/:user/identities
 */
ApiServer.prototype.getUserIdentities = function getUserIdentities(request, response, next) {
	var name = request.params.user;

	this.jarvis.findUser(name, function(error, user) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(user.identities);
		return next();
	});
};

/**
 * POST /users/:user/identities
 *
 * Params: {
 *   identity: Identity to add to user.
 * }
 */
ApiServer.prototype.addUserIdentity = function addUserIdentity(request, response, next) {
	var name = request.params.user;

	if ( ! request.params.identity) {
		return next(new Restify.BadRequestError('Missing identity parameter'));
	}

	var identity = request.params.identity;

	this.jarvis.findUser(name, function(error, user) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		if (user.hasIdentity(identity)) {
			return next(new Restify.ConflictError('User "' + name + '" already has identity "' + identity + '"'));
		}

		user.addIdentity(identity);

		response.json(200);
		return next();
	});
};

/**
 * DELETE /users/:user/identities/:identity
 */
ApiServer.prototype.deleteUserIdentity = function deleteUserIdentity(request, response, next) {
	var name = request.params.user;
	var identity = request.params.identity;

	this.jarvis.findUser(name, function(error, user) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		user.deleteIdentity(identity);

		response.json(200);
		return next();
	});
};

/**
 * GET /users/:user/permissions
 */
ApiServer.prototype.getUserPermissions = function getUserPermissions(request, response, next) {
	var name = request.params.user;

	this.jarvis.findUser(name, function(error, user) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(user.permissions);
		return next();
	});
};

/**
 * POST /users/:user/permissions
 *
 * Params: {
 *   permission: Permission to add to user.
 * }
 */
ApiServer.prototype.addUserPermission = function addUserPermission(request, response, next) {
	var name = request.params.user;

	if ( ! request.params.permission) {
		return next(new Restify.BadRequestError('Missing permission parameter'));
	}

	var permission = request.params.permission;

	this.jarvis.findUser(name, function(error, user) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		if (user.hasPermission(permission)) {
			return next(new Restify.ConflictError('User "' + name + '" already has permission "' + permission + '"'));
		}

		user.addPermission(permission);

		response.json(200);
		return next();
	});
};

/**
 * DELETE /users/:user/permissions/:permission
 */
ApiServer.prototype.deleteUserPermission = function deleteUserPermission(request, response, next) {
	var name = request.params.user;
	var permission = request.params.permission;

	this.jarvis.findUser(name, function(error, user) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		user.deletePermission(permission);

		response.json(200);
		return next();
	});
};

/**
 * GET /groups
 */
ApiServer.prototype.getGroups = function getGroups(request, response, next) {
	response.json(200, this.jarvis.groups);
	return next();
};

/**
 * POST /groups
 *
 * Params: {
 *   group: Name of group to add.
 * }
 */
ApiServer.prototype.addGroup = function addGroup(request, response, next) {
	if ( ! request.params.group) {
		return next(new Restify.BadRequestError('Missing group name'));
	}

	this.jarvis.addGroup(request.params.group, function(error, group) {
		if (error) {
			return next(new Restify.ConflictError(error.message));
		}

		response.json(group);
		return next();
	});
};

/**
 * GET /groups/:group
 */
ApiServer.prototype.getGroup = function getGroup(request, response, next) {
	var name = request.params.group;

	this.jarvis.findGroup(name, function(error, group) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(group);
		return next();
	});
};

/**
 * DELETE /groups/:group
 */
ApiServer.prototype.deleteGroup = function deleteGroup(request, response, next) {
	var name = request.params.group;

	this.jarvis.deleteGroup(name, function(error) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(200);
		return next();
	});
};

/**
 * GET /groups/:group/users
 */
ApiServer.prototype.getGroupUsers = function getGroupUsers(request, response, next) {
	var name = request.params.group;

	this.jarvis.findGroup(name, function(error, group) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(group.users);
		return next();
	});
};

/**
 * POST /groups/:group/users
 *
 * Params: {
 *   user: Name of user to add to group.
 * }
 */
ApiServer.prototype.addGroupUser = function addGroupUser(request, response, next) {
	var self = this;
	var name = request.params.group;

	if ( ! request.params.user) {
		return next(new Restify.BadRequestError('Missing user parameter'));
	}

	var user = request.params.user;

	this.jarvis.findGroup(name, function(error, group) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		if (group.hasUser(user)) {
			return next(new Restify.ConflictError('Group "' + name + '" already has user "' + user + '"'));
		}

		self.jarvis.findUser(user, function(error, user) {
			if (error) {
				return next(new Restify.NotFoundError(error.message));
			}

			group.addUser(user.name);

			response.json(200);
			return next();
		});
	});
};

/**
 * DELETE /groups/:group/users/:user
 */
ApiServer.prototype.deleteGroupUser = function deleteGroupUser(request, response, next) {
	var self = this;
	var name = request.params.group;
	var user = request.params.user;

	this.jarvis.findGroup(name, function(error, group) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		if ( ! group.hasUser(user)) {
			return next(new Restify.NotFoundError(error.message));
		}

		group.deleteUser(user);

		response.json(200);
		return next();
	});
};

/**
 * GET /groups/:group/permissions
 */
ApiServer.prototype.getGroupPermissions = function getGroupPermissions(request, response, next) {
	var name = request.params.group;

	this.jarvis.findGroup(name, function(error, group) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		response.json(group.permissions);
		return next();
	});
};

/**
 * POST /groups/:group/permissions
 *
 * Params: {
 *   permission: Permission to add to group.
 * }
 */
ApiServer.prototype.addGroupPermission = function addGroupPermission(request, response, next) {
	var name = request.params.group;

	if ( ! request.params.permission) {
		return next(new Restify.BadRequestError('Missing permission parameter'));
	}

	var permission = request.params.permission;

	this.jarvis.findGroup(name, function(error, group) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		if (group.hasPermission(permission)) {
			return next(new Restify.ConflictError('Group "' + name + '" already has permission "' + permission + '"'));
		}

		group.addPermission(permission);

		response.json(200);
		return next();
	});
};

/**
 * DELETE /groups/:group/permissions/:permission
 */
ApiServer.prototype.deleteGroupPermission = function deleteGroupPermission(request, response, next) {
	var name = request.params.group;
	var permission = request.params.permission;

	this.jarvis.findGroup(name, function(error, group) {
		if (error) {
			return next(new Restify.NotFoundError(error.message));
		}

		group.deletePermission(permission);

		response.json(200);
		return next();
	});
};
