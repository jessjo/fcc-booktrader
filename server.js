'use strict';

var express = require('express');
var routes = require('./app/routes/index.js');
var mongoose = require('mongoose');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
var Users = require('./app/models/users.js');

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
    Users.find({ facebookId: profile.id }, function (err, user) {
    	 if (err) throw err;
    	   if(user){
               
               console.log(user + " found.");
              
             } else {
                  console.log("no result")
             }
      return cb(err, user);
    });
  }
));




app.set('views', __dirname + '/app/views');
app.set('view engine', 'ejs');

app.get('/',
  function(req, res) {
    res.render('index', { user: req.user });
  });
  
  app.get('/login',
  function(req, res){
    res.render('login');
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
  
  /**
  app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    res.render('profile', { user: req.user });
  });
  **/

var port = process.env.PORT || 8080;
app.listen(port,  function () {
	console.log('Node.js listening on port ' + port + '...');
});