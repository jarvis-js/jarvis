/*global module*/

function Brain(config) {
	this.data = {};
}

module.exports = Brain;

Brain.prototype.wake = function wake(callback) {
	if (typeof callback === 'function') {
		callback();
	}
};

Brain.prototype.sleep = function sleep(callback) {
	if (typeof callback === 'function') {
		callback();
	}
};

Brain.prototype.remember = function remember(key, data, callback) {
	this.data[key] = data;
	if (typeof callback === 'function') {
		callback();
	}
};

Brain.prototype.retrieve = function retrieve(key, callback) {
	var data = null;
	if (this.data[key]) {
		data = this.data[key];
	}

	if (typeof callback === 'function') {
		callback(data);
	}
};

Brain.prototype.forget = function forget(key, callback) {
	if (this.data[key]) {
		delete this.data[key];
	}

	if (typeof callback === 'function') {
		callback();
	}
};
