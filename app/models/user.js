var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Links = require('./link');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: false,
  links: function(){
    return this.hasMany(Links);
  }
});

module.exports = User;
