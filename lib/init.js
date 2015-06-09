var express = require('express');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();
var secret = require('../secret.js');


app.set('views', __dirname + '/../views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/../public'));
app.use(cookieParser());
app.use(session({secret: secret.secret, resave: false, saveUninitialized: true}));


module.exports = app;
