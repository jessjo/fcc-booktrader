'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
	facebookID: String,
	facebook: {
		id: String,
		displayName: String,
		username: String
	},
	local:{
	    books: [String]
	}
});

module.exports = mongoose.model('User', User);
