'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Book = new Schema({

		title: String,
		author: String,
		id: String,
		rating: Number,
		thumbnail: String,
		owners: [String]
	
});

module.exports = mongoose.model('Book', Book);
