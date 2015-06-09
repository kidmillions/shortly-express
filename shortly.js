var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require('express-session')
var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(session({secret: 'devonandchris', resave: false, saveUninitialized: true}));


var restrict = function(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    req.session.error = 'Get Out';
    res.redirect('/login');
  }

}



app.get('/', restrict,
function(req, res) {
  res.render('index');
});

app.get('/create', restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', restrict,
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.get('/login',
function(req, res) {
  res.render('login');
});

app.post('/signup',
function(req, res) {
  var password = req.body.password;
  var username = req.body.username;
  new User({username: username}).fetch()
  .then(function(user){
    if(user){
      //TODO: let user know that username is already taken
      res.redirect('/login');
    } else {
      var user = new User({
        password: password,
        username: username,
      });
      user.save().then(function(newUser){
        Users.add(newUser);
        res.send(200, newUser);
      });
    }
  });
});
//

app.post('/login', function(req, res) {
  //query db with username passed in
  var password = req.body.password;
  var username = req.body.username;
  //obtain salt for that user
  new User({username: username}).fetch()
    .then(function(model){
      var salt = model.get('salt');
      console.log("salt: ", salt)
      //concat password + salt and send to hashing
      var hashed = bcrypt.hashSync(password, salt);
      console.log('password: ', hashed);
      //check database for username and salted password
      if(model.get('password') === hashed){
        console.log('Password match');
        req.session.regenerate(function() {
          req.session.user = username;
          res.redirect('/');
        })
      } else {
        console.log('no password match')
      }
    });





  //if match found
    //begin session
    //route to '/links'

  //if not found
    //reroute to login
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        // link.related('user').attach([1]);
        //TODO: properly attach relationship b/w link and it's user in the session
        //      and only show that user's links

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
