/*global module*/

var events = require('events');
var util   = require('util');

function Group(name) {
	this.name = name;
	this.users = [];
	this.permissions = [];
}

util.inherits(Group, events.EventEmitter);

module.exports = Group;

Group.prototype.addUser = function addUser(username) {
	if ( ! this.hasUser(username)) {
		this.users.push(username);
		this.emit('user-added', {
			group: this,
			user: username
		});
	}
};

Group.prototype.deleteUser = function deleteUser(username) {
	var index = this.users.indexOf(username);
	if (index !== -1) {
		this.users.splice(index, 1);
		this.emit('user-deleted', {
			group: this,
			user: username
		});
	}
};

Group.prototype.hasUser = function hasUser(username) {
	return this.users.indexOf(username) !== -1;
};

Group.prototype.addPermission = function addPermission(permission) {
	if ( ! this.hasPermission(permission)) {
		this.permissions.push(permission);
		this.emit('permission-added', {
			group: this,
			permission: permission
		});
	}
};

Group.prototype.deletePermission = function deletePermission(permission) {
	var index = this.permissions.indexOf(permission);
	if (index !== -1) {
		this.permissions.splice(index, 1);
		this.emit('permission-deleted', {
			group: this,
			permission: permission
		});
	}
};

Group.prototype.hasPermission = function hasPermission(permission) {
	if (this.permissions.indexOf(permission) !== -1) {
		return true;
	}

	var splitPermission = permission.split(':');
	var wildCardPermission = splitPermission[0] + ':*';

	if (this.permissions.indexOf(wildCardPermission) !== -1) {
		return true;
	}

	return false;
};
