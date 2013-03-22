function Action(attributes) {
	this.name = attributes.name;
	this.match = attributes.match;
	this.func = attributes.func;
	this.description = attributes.description || '';
	this.example = attributes.example || '';
	this.secure = attributes.secure || false;
}

module.exports = Action;
