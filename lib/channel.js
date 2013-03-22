/*global module*/

var events = require('events');
var util   = require('util');

var Message = require('./message');

function Channel(id) {
	this.identifier = id;
	this.multiuser = false;

	this.Message = Message;
}

util.inherits(Channel, events.EventEmitter);

module.exports = Channel;

Channel.prototype.received = function received(message) {
	this.emit('message', message);
};

Channel.prototype.say = function say(message, response) {};

Channel.prototype.reply = function reply(message, response) {
	this.say(message, response);
};

Channel.prototype.action = function action(message, response) {
	this.say(message, response);
};
