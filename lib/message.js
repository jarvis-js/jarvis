/*global module*/

function Message(attributes) {
	for (var key in attributes) {
		this[key] = attributes[key];
	}

	this.direct = attributes['direct'] || false;
}

module.exports = Message;
