var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var links = require('./link');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  links: function(){
    return this.hasMany(links);
  }
});

module.exports = User;
