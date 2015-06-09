var request = require('request');
var Users = require('../app/collections/users');
var User = require('../app/models/user');
var Links = require('../app/collections/links');
var Link = require('../app/models/link');
var session = require('express-session');



exports.getUrlTitle = function(url, cb) {
  request(url, function(err, res, html) {
    if (err) {
      console.log('Error reading url heading: ', err);
      return cb(err);
    } else {
      var tag = /<title>(.*)<\/title>/;
      var match = html.match(tag);
      var title = match ? match[1] : url;
      return cb(err, title);
    }
  });
};

var rValidUrl = /^(?!mailto:)(?:(?:https?|ftp):\/\/)?(?:\S+(?::\S*)?@)?(?:(?:(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[0-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]+-?)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))|localhost)(?::\d{2,5})?(?:\/[^\s]*)?$/i;

exports.isValidUrl = function(url) {
  return url.match(rValidUrl);
};

exports.restrict = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Get Out';
    res.redirect('/login');
  }
}

exports.findUser = function(username, callback){
  new User({username: username}).fetch()
  .then(function(model){
    callback(model);
  });
};

exports.findUserByID = function(id, callback){
  new User({id: id}).fetch()
  .then(function(model){
    callback(model);
  });
};


exports.createUser = function(username, password, callback) {
  new User({username: username}).fetch()
  .then(function(user){
    if(user){
      res.send('User already exists. Please log in.');
      res.redirect('/login');
    } else {
      var user = new User({
        password: password,
        username: username,
      });
      user.save().then(function(newUser){
        Users.add(newUser);
        callback(newUser);
      });
    }
  });
};

exports.createSession = function(req, res, user){
  req.session.regenerate(function() {
    req.session.user = user.get('id');
    res.redirect('/');
  })
};

exports.createLink = function(req, callback){
  var url = req.body.url;
  new Link({ url: url, user_id: req.session.user }).fetch().then(function(found) {
    if (found) {
      callback(found);
    } else {
      exports.getUrlTitle(url, function(err, title) {
        if (err) {
          callback(err, true);
        }
        var link = new Link({
          url: url,
          title: title,
          base_url: req.headers.origin
        });

        link.set('user_id', req.session.user);

        link.save().then(function(newLink) {
          Links.add(newLink);
          callback(newLink);
        });
      });
    }
  });
}
/************************************************************/
// Add additional utility functions below
/************************************************************/
