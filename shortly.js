var util = require('./lib/utility');
var bcrypt = require('bcrypt-nodejs');
var db = require('./app/config');
var Click = require('./app/models/click');
var session = require('express-session');
var LocalStrategy = require('passport-local').Strategy;
var GitHubStrategy = require('passport-github2').Strategy;
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

passport.use(new GitHubStrategy({
  clientID: 'f7c76cf9dec2503c19dd',
  clientSecret: '24d8652bc20110d84646b2bd419020866001848b',
  callbackURL: 'http://127.0.0.1:4568/github/login/callback'
  },
  function(accessToken, refreshToken, profile, done) {
    util.findUserByGithubID(profile.id, function(model){
      var newUser = model
      if(!newUser){
        util.createUser(profile.username, accessToken, function(user) {
          newUser = user;
          console.log('new user created');
          return done(null, newUser);
        }, profile.id);
      } else {
         return done(null, newUser);
      }
    });
  }
));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  util.findUserByID(id, function(user) {
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
  Links.reset().query({where: {user_id: req.session.passport.user}}).fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.get('/github/login', passport.authenticate('github', {scope: ['user:email']}));

app.get('/github/login/callback', passport.authenticate('github', {
   successRedirect: '/',
   failureRedirect: '/login'
}));

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
  req.logout();
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
