'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({

		name: String,
		email: String,
		username: String,
		facebook: String,
		id: String,
	    books: [String],
		status:[String]
});

module.exports = mongoose.model('User', User);
