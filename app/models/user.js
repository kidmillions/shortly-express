var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Links = require('./link');

var User = db.Model.extend({
  initialize: function() {
    //create unique salt
    this.on('creating', function(model, attrs, options){
      model.set('salt', bcrypt.genSaltSync(10));
      model.set('password', bcrypt.hashSync(this.get('password'), this.get('salt')));
    });
    //hash password and set it
    //save this information to the model in the db
  },
  tableName: 'users',
  hasTimestamps: false,
  links: function(){
    return this.hasMany(Links);
  }
});

module.exports = User;
