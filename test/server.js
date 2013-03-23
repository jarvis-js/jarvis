var request = require('request');

var Jarvis = require('../lib/jarvis.js');
var config = require('config');

var PORT = config.server.port;
var HOST = 'http://localhost:' + PORT;

describe('API', function() {

	var jarvis = new Jarvis(config);

	before(function(done) {
		jarvis.bootUp(done);
	});

	after(function(done) {
		jarvis.shutdown();
		done();
	});

	describe('GET /', function() {
		it('should return an array of routes', function(done) {
			request.get({
				url: HOST + '/',
				json: true
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(Object.keys(jarvis.server.server.routes).length);
				done();
			});
		});
	});

	describe('GET /modules', function() {
		it('should return an array', function(done) {
			request.get({
				url: HOST + '/modules',
				json: true
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				done();
			});
		});
	});

	describe('GET /actions', function() {
		it('should return an array', function(done) {
			request.get({
				url: HOST + '/actions',
				json: true
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				done();
			});
		});
	});

	/*-------------------------------------------------------------*/
	/* User routes tests                                           */
	/*-------------------------------------------------------------*/

	describe('GET /users', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/users',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /users', function() {
		it('should respond with Bad Request error', function(done) {

			request.post({
				url: HOST + '/users',
				json: true
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(400);
				done();
			});

		});
	});

	describe('POST /users with { "user": "Alex" }', function() {
		it('should respond with user object', function(done) {

			request.post({
				url: HOST + '/users',
				json: {
					user: 'Alex'
				}
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.name.should.equal('Alex');
				body.identities.should.be.an.instanceOf(Array);
				body.identities.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /users with { "user": "Alex" } for a second time', function() {
		it('should respond with a Conflict error', function(done) {

			request.post({
				url: HOST + '/users',
				json: {
					user: 'Alex'
				}
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(409);
				done();
			});

		});
	});

	describe('POST /users with { "name": "Paul" }', function() {
		it('should respond with user object', function(done) {

			request.post({
				url: HOST + '/users',
				json: {
					user: 'Paul'
				}
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.name.should.equal('Paul');
				body.identities.should.be.an.instanceOf(Array);
				body.identities.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('GET /users', function() {
		it('should return an array of two users', function(done) {

			request.get({
				url: HOST + '/users',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(2);
				done();
			});

		});
	});

	describe('GET /users/Alex', function() {
		it('should return user data', function(done) {

			request.get({
				url: HOST + '/users/Alex',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.name.should.equal('Alex');
				body.identities.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('DELETE /users/Paul', function() {
		it('should return success', function(done) {

			request.del({
				url: HOST + '/users/Paul',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /users', function() {
		it('should return an array with one user', function(done) {

			request.get({
				url: HOST + '/users',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(1);
				done();
			});

		});
	});

	describe('GET /users/Alex/identities', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/users/Alex/identities',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /users/Alex/identities with { "identity": "twitter@_whitman" }', function() {
		it('should return success', function(done) {

			request.post({
				url: HOST + '/users/Alex/identities',
				json: {
					identity: "twitter@_whitman"
				}
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /users/Alex/identities', function() {
		it('should return an array with one entry of "twitter@_whitman"', function(done) {

			request.get({
				url: HOST + '/users/Alex/identities',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(1);
				body[0].should.equal('twitter@_whitman');
				done();
			});

		});
	});

	describe('DELETE /users/Alex/identities/twitter@_whitman', function() {
		it('should return success', function(done) {

			request.del({
				url: HOST + '/users/Alex/identities/twitter@_whitman',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /users/Alex/identities', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/users/Alex/identities',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('GET /users/Alex/permissions', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/users/Alex/permissions',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /users/Alex/permissions with { "permission": "google-search" }', function() {
		it('should return success', function(done) {

			request.post({
				url: HOST + '/users/Alex/permissions',
				json: {
					permission: "google-search"
				}
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /users/Alex/permissions', function() {
		it('should return an array with one entry of "google-search"', function(done) {

			request.get({
				url: HOST + '/users/Alex/permissions',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(1);
				body[0].should.equal('google-search');
				done();
			});

		});
	});

	describe('DELETE /users/Alex/permissions/google-search', function() {
		it('should return success', function(done) {

			request.del({
				url: HOST + '/users/Alex/permissions/google-search',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /users/Alex/permissions', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/users/Alex/permissions',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	/*-------------------------------------------------------------*/
	/* Group routes tests                                          */
	/*-------------------------------------------------------------*/

	describe('GET /groups', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/groups',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				response.headers['content-type'].should.equal('application/json');
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /groups', function() {
		it('should respond with Bad Request error', function(done) {

			request.post({
				url: HOST + '/groups',
				json: true
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(400);
				done();
			});

		});
	});

	describe('POST /groups with { "group": "Admins" }', function() {
		it('should respond with group object', function(done) {

			request.post({
				url: HOST + '/groups',
				json: {
					group: 'Admins'
				}
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.name.should.equal('Admins');
				body.users.should.be.an.instanceOf(Array);
				body.users.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /groups with { "group": "Admins" } for a second time', function() {
		it('should respond with a Conflict error', function(done) {

			request.post({
				url: HOST + '/groups',
				json: {
					group: 'Admins'
				}
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(409);
				done();
			});

		});
	});

	describe('POST /groups with { "group": "Guests" }', function() {
		it('should respond with user object', function(done) {

			request.post({
				url: HOST + '/groups',
				json: {
					group: 'Guests'
				}
			}, function(error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.name.should.equal('Guests');
				body.users.should.be.an.instanceOf(Array);
				body.users.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('GET /groups', function() {
		it('should return an array of two groups', function(done) {

			request.get({
				url: HOST + '/groups',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(2);
				done();
			});

		});
	});

	describe('GET /groups/Admins', function() {
		it('should return group data', function(done) {

			request.get({
				url: HOST + '/groups/Admins',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.name.should.equal('Admins');
				body.users.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('DELETE /groups/Guests', function() {
		it('should return success', function(done) {

			request.del({
				url: HOST + '/groups/Guests',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /groups', function() {
		it('should return an array with one user', function(done) {

			request.get({
				url: HOST + '/groups',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(1);
				done();
			});

		});
	});

	describe('GET /groups/Admins/users', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/groups/Admins/users',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /groups/Admins/users with { "user": "Alex" }', function() {
		it('should return success', function(done) {

			request.post({
				url: HOST + '/groups/Admins/users',
				json: {
					user: "Alex"
				}
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('POST /groups/Admins/users with { "user": "NotAUser" }', function() {
		it('should return a Not Found error', function(done) {

			request.post({
				url: HOST + '/groups/Admins/users',
				json: {
					user: "NotAUser"
				}
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(404);
				done();
			});

		});
	});

	describe('GET /groups/Admins/users', function() {
		it('should return an array with one entry for the user "Alex"', function(done) {

			request.get({
				url: HOST + '/groups/Admins/users',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(1);
				body[0].should.equal('Alex');
				done();
			});

		});
	});

	describe('DELETE /groups/Admins/users/Alex', function() {
		it('should return success', function(done) {

			request.del({
				url: HOST + '/groups/Admins/users/Alex',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /groups/Admins/users', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/groups/Admins/users',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('GET /groups/Admins/permissions', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/groups/Admins/permissions',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

	describe('POST /groups/Admins/permissions with { "permission": "google-search" }', function() {
		it('should return success', function(done) {

			request.post({
				url: HOST + '/groups/Admins/permissions',
				json: {
					permission: "google-search"
				}
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /groups/Admins/permissions', function() {
		it('should return an array with one entry of "google-search"', function(done) {

			request.get({
				url: HOST + '/groups/Admins/permissions',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(1);
				body[0].should.equal('google-search');
				done();
			});

		});
	});

	describe('DELETE /groups/Admins/permissions/google-search', function() {
		it('should return success', function(done) {

			request.del({
				url: HOST + '/groups/Admins/permissions/google-search',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				done();
			});

		});
	});

	describe('GET /groups/Admins/permissions', function() {
		it('should return an empty array', function(done) {

			request.get({
				url: HOST + '/groups/Admins/permissions',
				json: true
			}, function (error, response, body) {
				if (error) {
					done(error);
				}

				response.statusCode.should.equal(200);
				body.should.be.an.instanceOf(Array);
				body.should.have.lengthOf(0);
				done();
			});

		});
	});

});
