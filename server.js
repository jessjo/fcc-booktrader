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
  
  app.get('/allbooks',
  function(req, res) {
   var thesebooks =[];
    Books.find({ "owners.0": { "$exists": true } },function(err,books) {
      if (err) throw err;
        console.log(books.length);
        res.render('allbooks', { user: req.user, books: books });
    })
    
  });
  
  app.get('/books/:bookID',
  function(req, res) {
   var thisBook =req.params.bookID;
        Books.findOne({
            		  'bookid': thisBook
        		  }, function(err, book) {
        		    if(err) throw err;
        		     res.render('book', { book: book });
        		  });
    
  });
  
  
  app.get('/mybooks',
  function(req, res) {
    var books = [];
    //find a user, get their book list. 
    
    //look up each book add to book array
    console.log(req.user);
     Users.findOne({
            		  'id': req.user.id
        		  }, function(err, user) {
            	  	if (err) {
                	  	return err;
            	  	}
            	  	console.log(user);
        if (user.books.length ==0){
             res.render('mybooks', { user: user, books: "" });
        }
        var z =0;
    		for (var i=0; i<user.books.length; i++){
    		
    		  Books.findOne({
            		  'bookid': user.books[i] 
        		  }, function(err, book) {
            	  	if (err) {
                	  	return err;
            	  	}
            	  	if (book){
            	  	  books[z] = book;
            	  	  z++;
            	  	}
            	  	console.log("i "+ i + "books.length " + user.books.length + "books" + books.length);
            	  	if (books.length == user.books.length){
            	  	    console.log ("Number of books:" + user.books.length);
            	        res.render('mybooks', { user: user, books: books });
            	  	}
        		});
    		}
    		
        		  });
   
  });
  
  app.post('/findBook', upload.array(),
  	function(req,res){
		returnBookInfo(res, req, displayPage);
  })
  
  app.post('/addBook', upload.array(),
  	 function(req,res){
  	 	var user = req.user;
  	 	var thisBookID = req.body.bookID;
  	 	       	Users.findOneAndUpdate(
    					  {id: user.id},
    					  {$push: {status: "owned"}},
    				  	{safe: true, upsert: true},
    					  function(err, model) {
    					    if (err) throw err;
    					});
  			   	Books.findOneAndUpdate(
    					{bookid: req.body.bookID},
    					{$push: {owners: req.user.id}},
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
    return owned;
	}
	
}

function returnBookInfo(res, req, displayPage){
      var searchlimit = 5;
  		console.log("search term: " + req.body.title);
  		
  		//set to only return 1 best match book
  		
  	   var options = {
    		  field: 'title',
    	  	offset: 0,
 			    limit: searchlimit,
    	  	type: 'books',
    		  order: 'relevance',
    		  lang: 'en'
	  	};
		  var allbooks = [];
	  	var allowned = [];
	  	var lookup = 0;
		
    	var thisBook = gBooks.search(req.body.title, options, function(error, results) {
    			if ( ! error ) {
     		  results.forEach(function(result) {
     			//book found in google books api, search our data base to see if it exists or add
         
     			  Books.findOne({
            		'bookid': result.id 
        		  }, function(err, book) {
            		if (err) {
                		return err;
            		}
            		//no book found, create one.
        			 if (!book) {
          
                	 book = new Books({
                			  bookid: result.id,
                	 		  title: result.title,
                	 	    author: result.authors,
                    		rating: result.averageRating,
                    		thumbnail: result.thumbnail
                 	
                		});
                	book.save(function(err) {
                    	if (err) console.log(err);
                    	//console.log(book);
                    	allbooks.push(book);
                    	allowned.push(true);
                    	console.log(allbooks);
                    
                  //  	
                    
                	});
                		
            	} else {
                	//found book. Return. The only time to check if owned is if we know it's in collection.
                	console.log("found book: " + book );
                	var owned = false;
                	if (req.user){
                		console.log(req.user);
                		owned = checkOwnership(book.bookid, req.user, res, req, book, owned);
                		allowned.push(owned);
                	} else {
                		console.log ("the owned status is "+ owned);
                	
          				return book;
                	}
            }
              if (++lookup == results.length){
                          console.log("allbooks: " + allbooks);
                    	    res.render('index', { user: req.user, search: req.body.title, book: allbooks[0], owned: allowned[0] });
                    	    return allbooks;
               }
        });
        
     			
    
    			});
    			}
});

}

function displayPage(res, req, owned, allbooks){
  console.log("here");
  console.log (allbooks);
  res.render('index', { user: req.user, search: req.body.title, book: allbooks[0], owned: owned });
}