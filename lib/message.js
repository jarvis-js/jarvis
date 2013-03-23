/*global module*/

function Message(attributes) {
	for (var key in attributes) {
		this[key] = attributes[key];
	}
}

module.exports = Message;
