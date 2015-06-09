var util = require('./lib/utility');
var bcrypt = require('bcrypt-nodejs');
var db = require('./app/config');
var Click = require('./app/models/click');
var session = require('express-session');
var LocalStrategy = require('passport-local').Strategy;
var init = require('./lib/init');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var User = require('./app/models/user');
var app = init.app;
var passport = init.passport;

passport.use(new LocalStrategy(
  function(username, password, done) {
    util.findUser(username, function(user) {
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!user.validPassword(password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }

      return done(null, user);
    })
  }
));

passport.serializeUser(function(user, done) {
  console.log('serializing');
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  util.findUserByID(id, function(user) {
    console.log('found user: ', user.attributes, " and now deserializing");
    var err = null;
    done(err, user);
  });
});

app.get('/', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/create', util.restrict,
function(req, res) {
  res.render('index');
});

app.get('/links', util.restrict,
function(req, res) {
  Links.reset().query({where: {user_id: req.session.user}}).fetch().then(function(links) {
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
  util.createUser(req.body.username, req.body.password, function(newUser) {
    util.createSession(req, res, newUser);
  });
});

app.post('/login', passport.authenticate('local', {successRedirect: '/',
                                                   failureRedirect: '/login'}));

app.post('/logout',
function(req, res) {
  req.session.destroy();
  res.redirect('/login');
});

app.post('/links',
function(req, res) {
  var url = req.body.url;
  if (!util.isValidUrl(url)) {
    console.log('Not a valid url: ', url);
    return res.send(404);
  }
  util.createLink(req, function(link, err){
    if (err) {
      console.log('Error reading URL heading: ', err);
      res.send(404);
    }
    res.send(200, link);
  })
});

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
