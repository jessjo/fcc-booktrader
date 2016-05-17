'use strict';

var express = require('express');
var routes = require('./app/routes/index.js');
var mongoose = require('mongoose');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var Users = require('./app/models/users.js');
var Books = require('./app/models/books.js');
var gBooks = require ('google-books-search');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })

var session = require('express-session');
require('dotenv').load();
var app = express();

mongoose.connect(process.env.MONGO_URI);



//configure passport

passport.use(new Strategy({
    clientID: process.env.FACEBOOK_KEY,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "https://fcc-booktrader-jessjo.c9users.io/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, cb) {

        //check user table for anyone with a facebook ID of profile.id
        Users.findOne({
            'id': profile.id 
        }, function(err, user) {
            if (err) {
                return cb(err);
            }
            //No user was found... so create a new user with values from Facebook (all the profile. stuff)
            if (!user) {
            	console.log(profile);
                user = new Users({
                	id:profile.id,
                    name: profile.displayName,
                    username: profile.username,
                    
                });
                user.save(function(err) {
                    if (err) console.log(err);
                    return cb(err, user);
                });
            } else {
                //found user. Return
                return cb(err, user);
            }
        });
    }
  
));




app.set('views', __dirname + '/app/views');
app.set('view engine', 'ejs');
app.use(session({ secret: 'ilovebunnyrabbits' }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/',
  function(req, res) {
    res.render('index', { user: req.user, search: "", book: "", owned: "" });
   
  });
  
  app.get('/login',
  function(req, res){
    res.render('login');
  });
  
  app.get('/mybooks',
  function(req, res) {
    res.render('mybooks', { user: req.user });
   
  });
  
  app.post('/findBook', upload.array(),
  	function(req,res){
  		console.log(req.body.title);
  		
  		//set to only return 1 best match book
  		
  	    var options = {
    		field: 'title',
    		offset: 0,
 			limit: 1,
    		type: 'books',
    		order: 'relevance',
    		lang: 'en'
		};
		
    	var thisBook = gBooks.search(req.body.title, options, function(error, results) {
    			if ( ! error ) {
     			console.log(results);
     			//book found in google books api, search our data base to see if it exists or add

     			Books.findOne({
            		'bookid': results[0].id 
        		}, function(err, book) {
            		if (err) {
                		return err;
            		}
            		//no book found, create one.
        			 if (!book) {
          
                		book = new Books({
                			bookid:results[0].id,
                	 		title: results[0].title,
                	 	    author: results[0].authors,
                    		rating: results[0].averageRating,
                    		thumbnail: results[0].thumbnail,
                 	
                		});
                	book.save(function(err) {
                    	if (err) console.log(err);
                    	console.log(book);
                    
                    	res.render('index', { user: req.user, search: req.body.title, book: book, owned: "" });
                    	return book;
                    
                	});
                		
            	} else {
                	//found book. Return. The only time to check if owned is if we know it's in collection.
                	
                	console.log("found book");
                	console.log(book);
                	var owned = false;
                	if (req.user){
                		console.log(req.user);
                		owned = checkOwnership(book.bookid, req.user, res, req, book, owned);
                	} else {
                		console.log ("the owned status is "+ owned);
                		res.render('index', { user: req.user, search: req.body.title, book: book, owned: owned });
          				return book;
                	}
            }
        });
    
     			
    		} else {
        		console.log(error);
        		//what to do if error in searching for book
        		res.render('index', { user: req.user, search: req.body.title, book: "", owned: "" });
    		}
		});
		
  })
  
  app.post('/addBook', upload.array(),
  	 function(req,res){
  	 	var user = req.user;
  	 	var thisBookID = req.body.bookID;
  			   	Books.findOneAndUpdate(
    					{bookid: req.body.bookID},
    					{$push: {owners: user.id}},
    					{safe: true, upsert: true},
    					function(err, model) {
        					if (err) console.log(err);
			                	Users.findOneAndUpdate(
			    					{id: user.id},
			    					{$push: {books: thisBookID}},
			    					{safe: true, upsert: true},
			    					function(err, model2) {
			    						console.log ("user update:" + model2)
			    						console.log(user);
			        					if (err) console.log(err);
			        					res.render('index', { user: user, search: req.body.title, book: "", owned: true });
			
			    					}
			    				);
			                	
			               
			    					}
			    	);
                	
        		});
  
		
 

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  });
  


var port = process.env.PORT || 8080;
app.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});


//function to check if the user owns a given book
function checkOwnership(bookID, user, res, req, book, owned){
	console.log(bookID + " is the bookID");
	console.log(user.books.indexOf(bookID) + " is the index of bookID");
	if(user.books.indexOf(bookID) >= 0){
		
		owned = true;
		console.log ("the owned status is "+ owned);
        res.render('index', { user: req.user, search: req.body.title, book: book, owned: owned });
	
	} else {
		 res.render('index', { user: req.user, search: req.body.title, book: book, owned: owned });

	}
	
}