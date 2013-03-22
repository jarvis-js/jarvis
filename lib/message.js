/*global module*/

function Message(attributes) {
	this.body    = attributes.body;
	this.channel = attributes.channel;
	this.user    = attributes.user;
}

module.exports = Message;
