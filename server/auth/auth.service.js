'use strict';

var passport = require('passport');
var config = require('../config/environment');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var compose = require('composable-middleware');
var User = require('../api/mysql').User;
var Role = require('../api/mysql').Role;
var models = require('../api/mysql')
var _ = require('lodash');
var shortid = require('shortid');
var mailService = require('../components/mail/mail.service');

var validateJwt = expressJwt({
  secret: config.secrets.session
});

/**
 * Attaches the user object to the request if authenticated
 * Otherwise returns 403
 */
function isAuthenticated() {
  return compose()
    // Validate jwt
    .use(function(req, res, next) {
      // allow access_token to be passed through query parameter as well
      if (req.query && req.query.hasOwnProperty('access_token')) {
        req.headers.authorization = 'Bearer ' + req.query.access_token;
      }
      validateJwt(req, res, next);
    })
    // Attach user to request
    .use(function(req, res, next) {
      User.find({
        where: {
          _id: req.user._id
        },
		include: [{
			model: Role}]
      })
        .then(function(user) {
          if (!user) {
            return res.send(401);
          }
          req.user = user;
          next();
        })
        .catch(function(err) {
          return next(err);
        });
    });
}


/**
 * If there is a user, appends it to the req
 * else req.user would be undefined
 */
 function appendUser() {
    return compose()
        // Attach user to request
        .use(function(req, res, next) {
            validateJwt(req, res, function(val) {
                if(_.isUndefined(val)) {
					
			        User.find({
			          where: {
			            _id: req.user._id
			          },
			  		include: [{
			  			model: Role}]
			        })
			        .then(function(user) {
			          if (!user) {
                          req.user = undefined;
                          return next();
			          } else {
			          req.user = user;
			          next();
				  }
			        })
			        .catch(function(err) {
						console.log("ERROR "+err)
			          return next(err);
			        });
					
			
                } else {
                    req.user = undefined;
                    next();
                }
            });
        });
}

/**
 * Takes the token cookie and adds the header
 * for it on the request
 */
 function addAuthHeaderFromCookie() {
    return compose()
        .use(function(req, res, next) {
            if(req.cookies.token) {
                req.headers.authorization = 'Bearer ' + _.trim(req.cookies.token, '\"');
            }
            return next();
        });
}
/**
 * Checks if the user role meets the minimum requirements of the route
 */
function hasRole(roleRequired) {
  if (!roleRequired) {
    throw new Error('Required role needs to be set');
  }

  return compose()
    .use(isAuthenticated())
    .use(function meetsRequirements(req, res, next) {
		
		var acceptedRoles = [].concat(roleRequired);
		
		var hasRole = false;
		for(var i = 0; i < acceptedRoles.length; i++){
			if ( _.find(req.user.Roles, function(r) {
			  return r.name === acceptedRoles[i];
			}) !== undefined) {
				hasRole = true;
			}
		}
		
      if (hasRole) {
        next();
      }
      else {
        res.send(403);
      }
    });
}

/**
 * Returns a jwt token signed by the app secret
 */
function signToken(id, exp) {
	var expires = (exp) ? exp : (60 *  60 * 24 * 7);
  return jwt.sign({ _id: id }, config.secrets.session, {
    expiresIn: exp
  });
}

/**
 * Set token cookie directly for oAuth strategies
 */
function setTokenCookie(req, res) {
  if (!req.user) {
    return res.json(404, {
      message: 'Something went wrong, please try again.'
    });
  }
  var token = signToken(req.user._id, req.user.role);
  res.cookie('token', token);
  res.redirect('/');
}

function generateInitials(name){
	
	var parts = name.split(" ");
	if(parts.length ===1){
		return parts[0].substring(0,4);
	} else if(parts.length ===2){
		return parts[0].substring(0,2)+parts[1].substring(0,2);
	} else {
		return parts[0].substring(0,1)+parts[1].substring(0,1)+parts[2].substring(0,2);
	}
	
};

function getRandomTwoDigit(){
	return Math.round(Math.random()*100);
}
/*
 function secureInclude() {
    return compose()
        // Attach user to request
        .use(function(req, res, next) {
			if (req.query.include) {
		
				var parsed = JSON.parse(req.query.include)
				console.log("###############")
				console.log(parsed)
				var temp =	_.map(parsed, function(n){
				var n =  JSON.parse(n);
		
				if(n.model === "User"){
			
					if(n.attributes ){

			      n.attributes =  _.difference(n.attributes , [ 'password', 'salt' ]);
		
					} else {
		
					n.attributes = ['_id',
						'Initialer',
						'email' ,
						'provider',
						'name',
						'Roles',
						'facebook',
						'preferred_language'];
			
					}
			
				}
				//n.model = models[n.model];
				
				})
				req.query.include = JSON.stringify(temp)

			}
			next();
        });
}
*/

exports.forgot = function(req, res){
	
return	models.User.findAll({where: {email: req.body.email}})
	.then(function(users){
		if(users.length === 0){
			throw new Error('not found')
		}
		var promises = [];
		for(var i =0; i< users.length; i++){
			var token = signToken(users[i]._id, 60 * 60 * 1);
			promises.push(mailService.sendRestPassWordMail(users[i].email,users[i].Initialer, token ));
		}
		
		return Promise.all(promises);
	})
	.then(function(){
		
		return res.sendStatus(200)
	})
	.catch(function(err){
		console.log(err)
		return (err.message === 'not found') ? res.status(404).json(err.message) : res.status(500).json(err)
	})
	
}

exports.createPendingUser = function(req, res){
	
	var redisClient = req.redis;
	
	
	var token = shortid.generate();
	var key = "pending_user_"+token;
	
	
	return redisClient.setAsync(key, JSON.stringify(req.body))
		.then(function() {
			return redisClient.expireAsync(key, 60 * 60 * 24)
		})
		.then(function(){
			return  mailService.sendNewUserConfirmationEmail(req.body, token)

		})
		.then(function(){
			return  res.sendStatus(200)
		})
		.catch(function(err) {
			console.log("error: " + err)
			res.sendStatus(500)
		})
	
	
/*	
return	models.User.findAll({where: {email: req.body.email}})
	.then(function(users){
		if(users.length === 0){
			throw new Error('not found')
		}
		var promises = [];
		for(var i =0; i< users.length; i++){
			var token = signToken(users[i]._id, 60 * 60 * 1);
			promises.push(mailService.sendRestPassWordMail(users[i].email,users[i].Initialer, token ));
		}
		
		return Promise.all(promises);
	})
	.then(function(){
		
		return res.sendStatus(200)
	})
	.catch(function(err){
		console.log(err)
		return (err.message === 'not found') ? res.status(404).json(err.message) : res.status(500).json(err)
	})
	*/
	
}

exports.generateInitials = generateInitials;
exports.getRandomTwoDigit = getRandomTwoDigit;
exports.appendUser = appendUser;
exports.addAuthHeaderFromCookie = addAuthHeaderFromCookie;
exports.isAuthenticated = isAuthenticated;
exports.hasRole = hasRole;
exports.signToken = signToken;
exports.setTokenCookie = setTokenCookie;
//exports.secureInclude = secureInclude;
