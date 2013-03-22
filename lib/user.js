/*global module*/

var events = require('events');
var util   = require('util');

function User(name) {
	this.name = name;
	this.identities = [];
	this.permissions = [];
}

util.inherits(User, events.EventEmitter);

module.exports = User;

User.prototype.addIdentity = function addIdentity(identity) {
	if ( ! this.hasIdentity(identity)) {
		this.identities.push(identity);
		this.emit('identity-added', {
			user: this,
			identity: identity
		});
	}
};

User.prototype.deleteIdentity = function deleteIdentity(identity) {
	var index = this.identities.indexOf(identity);
	if (index !== -1) {
		this.identities.splice(index, 1);
		this.emit('identity-deleted', {
			user: this,
			identity: identity
		});
	}
};

User.prototype.hasIdentity = function hasIdentity(identity) {
	return this.identities.indexOf(identity) !== -1;
};

User.prototype.addPermission = function addPermission(permission) {
	if ( ! this.hasPermission(permission)) {
		this.permissions.push(permission);
		this.emit('permission-added', {
			user: this,
			permission: permission
		});
	}
};

User.prototype.deletePermission = function deletePermission(permission) {
	var index = this.permissions.indexOf(permission);
	if (index !== -1) {
		this.permissions.splice(index, 1);
		this.emit('permission-deleted', {
			user: this,
			permission: permission
		});
	}
};

User.prototype.hasPermission = function hasPermission(permission) {
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
