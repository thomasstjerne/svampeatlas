/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /taxons              ->  index
 * POST    /taxons              ->  create
 * GET     /taxons/:id          ->  show
 * PUT     /taxons/:id          ->  update
 * DELETE  /taxons/:id          ->  destroy
 */

'use strict';

var _ = require('lodash');
var config = require('../../../config/environment');
var models = require('../')
var Observation = models.Observation;
var Promise = require("bluebird");
var determinationController = require('../Determination/Determination.controller');

var nestedQueryParser = require("../nestedQueryParser")
var userTool = require("../userTool")
var wktparse = require('wellknown');
var moment = require('moment');

var PDFdocument = require('pdfkit');
var request = require("request");
var requestPromise = require("request-promise");

var mail = require('../../../components/mail/mail.service');

var crowdSourcedIdentificationConstants = determinationController.getCrowsourcedIdentificationConstants();



function getDefaulQuery(req) {
	return {
		where: {
			_id: req.params.id
		},
		include: [{
				model: models.Determination,
				as: "PrimaryDetermination",
				include: [{
					model: models.Taxon,
					as: "Taxon",
					include: [{
						model: models.Taxon,
						as: "acceptedTaxon",
						include: [{
							model: models.TaxonDKnames,
							as: "Vernacularname_DK"
						}]
					}]
				}, {
					model: models.User,
					as: 'User',
					attributes: ['_id', 'email', 'Initialer', 'name']
				}, {
					model: models.User,
					as: 'Validator',
					attributes: ['_id', 'Initialer', 'name']
				}]
			}, {
				model: models.Determination,
				as: 'Determinations',
				include: [{
						model: models.Taxon,
						as: "Taxon",
						include: [{
							model: models.Taxon,
							as: "acceptedTaxon",
							include: [{
								model: models.TaxonDKnames,
								as: "Vernacularname_DK"
							}]
						}]
					}, {
						model: models.User,
						as: 'User',
						attributes: ['_id', 'email', 'Initialer', 'name']
					}, {
						model: models.User,
						as: 'Validator',
						attributes: ['_id', 'Initialer', 'name']
					}, {
						model: models.DeterminationVote,
						as: 'Votes',
						attributes: ['_id', 'user_id', 'createdAt', 'score']
					},

				]

			},

			{
				model: models.User,
				as: 'PrimaryUser',
				attributes: ['Initialer', 'name']
			}, {
				model: models.Locality,
				as: 'Locality'
			}, {
				model: models.GeoNames,
				as: 'GeoNames'
			},

			{
				model: models.ObservationImage,
				as: 'Images',
				include: [{
					model: models.User,
					as: "Photographer",
					attributes: ['name', 'Initialer', 'photopermission']
				}]
			}, {
				model: models.ObservationForum,
				as: 'Forum',
				include: [{
					model: models.User,
					as: "User",
					attributes: ['name', 'Initialer', 'facebook']
				}]
			}, {
				model: models.PlantTaxon,
				as: 'associatedTaxa'
			}, {
				model: models.User,
				as: 'users',
				attributes: ['_id', 'email', 'Initialer', 'name']
			}, {
				model: models.Substrate,
				as: 'Substrate'
			}, {
				model: models.VegetationType,
				as: 'VegetationType'
			}, {
				model: models.DnaSequence,
				as: 'DnaSequence',
				include: [{
					model: models.User,
					as: "User",
					attributes: ['name', 'Initialer']
				}]
			},

		]
	};

}

function handleError(res, statusCode) {
	statusCode = statusCode || 500;
	return function(err) {
		console.log(err);
		res.status(statusCode).send(err);
	};
}

function responseWithResult(res, statusCode) {
	statusCode = statusCode || 200;
	return function(entity) {
		if (entity) {
			return res.status(statusCode).json(entity)
		}
	};
}

function handleEntityNotFound(res) {
	return function(entity) {
		if (!entity) {
			res.send(404);
			return null;
		}
		return entity;
	};
}

function saveUpdates(updates) {
	return function(entity) {
		return entity.updateAttributes(updates)
			.then(function(updated) {
				return updated;
			});
	};
}

function removeEntity(res) {
	return function(entity) {
		if (entity) {
			return entity.destroy()
				.then(function() {
					return res.send(204);
				});
		}
	};
}

function cacheResult(req, value) {
	var redisClient = req.redis;

	return redisClient.setAsync(req.query.cachekey, value)
		.then(function() {
			return redisClient.expireAsync(req.query.cachekey, config.redisTTL[req.query.cachekey])
		})
		.catch(function(err) {
			console.log("error: " + err)
		})

}

function cacheResultByUrl(req, value) {
	var redisClient = req.redis;
	var ttl = req.ttl;
	return redisClient.setAsync(req.originalUrl, value)
		.then(function() {
			return redisClient.expireAsync(req.originalUrl, ttl)
		})
		.catch(function(err) {
			console.log("error: " + err)
		})

}

// Get list of Observations
exports.index = function(req, res) {


	if (!req.query.limit) {
		req.query.limit = 10000;
	}
	if (!req.query.offset) {
		req.query.offset = 0;
	}
	var query = {
		offset: parseInt(req.query.offset),
		limit: parseInt(req.query.limit),
		where: {},
		attributes: {
			exclude: ['noteInternal']
		}
	};
	if (req.query.order) {
		query.order = req.query.order;
	}
	if (req.query._order) {
		query.order = JSON.parse(req.query._order);
	}

	if (req.query.where) {
		_.merge(query.where, JSON.parse(req.query.where));
	}

	if (req.query.geometry || req.query.selectedMonths || query.where.createdAt) {

		query.where.$and = [];
	}
	if (req.query.geometry) {
		query.where.$and.push(models.sequelize.fn('ST_Contains', models.sequelize.fn('GeomFromText', wktparse.stringify(JSON.parse(req.query.geometry))), models.sequelize.col('geom')));
	}

	/*
	if (req.query.municipalityid) {
	
		query.where.$and.push(models.sequelize.fn('ST_Contains', models.sequelize.literal("(SELECT geom FROM Areas WHERE _id="+req.query.municipalityid+")"), models.sequelize.col('Observation.geom')));
	}
	*/

	if (req.query.selectedMonths) {
		query.where.$and.push(models.sequelize.literal('MONTH(observationDate) IN (' + req.query.selectedMonths.toString() + ')'));
	}


	if (query.where.createdAt && !query.where.createdAt.$between && !query.where.createdAt.$lte && !query.where.createdAt.$gte) {
		//query.where.createdAt = models.sequelize.fn('DATE', models.sequelize.col('createdAt'));
		query.where.$and.push(models.sequelize.literal("DATE(Observation.createdAt) = '" + query.where.createdAt.toString() + "'"));
		delete query.where.createdAt;
	}
	if (req.query.group) {

		query['group'] = req.query.group

	};



	if (req.query.include) {


		var parsed = JSON.parse(req.query.include)
		query['include'] = _.map(parsed, function(n) {
			var n = JSON.parse(n);

			if (n.model === "User") {

				n = userTool.secureUser(n);

			}


			if (n.model === 'DeterminationView' && n.include) {
				n.include = JSON.parse(n.include);
				for (var i = 0; i < n.include.length; i++) {

					n.include[i] = JSON.parse(n.include[i])
					if (n.include[i].model === "User") {

						n.include[i] = userTool.secureUser(n.include[i]);

					};
					n.include[i].model = models[n.include[i].model]


					//n.include[i].where = JSON.parse(n.include[i].where)

				}

			}

			n.model = models[n.model];
			return n;
		})


	} else {
		query['include'] = [{
				model: models.DeterminationView,
				as: "DeterminationView",
				attributes: ['Taxon_FullName', 'Taxon_vernacularname_dk', 'Taxon_RankID']
			}, {
				model: models.User,
				as: 'PrimaryUser',
				attributes: ['email', 'Initialer', 'name']
			}, {
				model: models.Locality,
				as: 'Locality'
			}, {
				model: models.ObservationImage,
				as: 'Images',
				separate: true,
				offset: 0,
				limit: 10
			}, {
				model: models.ObservationForum,
				as: 'Forum',
				separate: true,
				offset: 0,
				limit: 10

			}

		]
	}
	var activeThreadsPromise;

	if (req.user && Boolean(req.query.activeThreadsOnly)) {

		activeThreadsPromise = activeThreads(req.user)
	} else if (req.user && req.query.recentlyCommented) {

		activeThreadsPromise = recentlyCommented(req.user, req.query.recentlyCommented)
	} else if (req.user && req.query.validationStatusUpdatedSince) {

		activeThreadsPromise = validationStatusUpdatedSince(req.user, req.query.validationStatusUpdatedSince)
	} else {
		activeThreadsPromise = Promise.resolve(false)
	}
	console.log(query);
	if (query.group === undefined && req.query.nocount === undefined) {
		activeThreadsPromise.then(function(observationids) {
			if (observationids !== false) {
				query.where._id = {
					$in: observationids
				}
			};

			return Observation.findAndCount(query)
		})

		.then(function(taxon) {
				res.set('count', taxon.count);
				if (req.query.offset !== undefined) {
					res.set('offset', req.query.offset);
				};
				if (req.query.limit !== undefined) {
					res.set('limit', req.query.limit);
				};
				return res.status(200).json(taxon.rows)
			})
			.catch(handleError(res));
	} else {
		activeThreadsPromise.then(function(observationids) {
			if (observationids !== false) {
				query.where._id = {
					$in: observationids
				}
			};
			return Observation.findAll(query)
		})

		.then(function(taxon) {

				if (req.query.offset !== undefined) {
					res.set('offset', req.query.offset);
				};
				if (req.query.limit !== undefined) {
					res.set('limit', req.query.limit);
				};
				if (req.query.cachekey) {
					return cacheResult(req, JSON.stringify(taxon)).then(function() {
						return res.status(200).json(taxon)
					})
				} else {
					return res.status(200).json(taxon)
				}

			})
			.catch(handleError(res));
	}



};


exports.indexSpeciesList = function(req, res) {

	if (!req.query.limit) {
		//	req.query.limit = 10000;
	}
	if (!req.query.offset) {
		//	req.query.offset = 0;
	}

	var query = {

		where: {},
		attributes: [
			[models.sequelize.fn('count', models.sequelize.fn('distinct', models.sequelize.col('Observation._id'))), 'observationCount'], 'primaryuser_id', 'locality_id'
		],
		group: "DeterminationView.Taxon_id"
	};
	if (req.query.order) {
		query.order = req.query.order;
	}
	if (req.query._order) {
		query.order = JSON.parse(req.query._order);

		if (query.order[0][0] === 'observationCount') {
			query.order[0][0] = models.sequelize.col('observationCount')
		}
	}

	if (req.query.geometry || req.query.selectedMonths || query.where.createdAt) {

		query.where.$and = [];
	}
	if (req.query.geometry) {
		query.where.$and.push(models.sequelize.fn('ST_Contains', models.sequelize.fn('GeomFromText', wktparse.stringify(JSON.parse(req.query.geometry))), models.sequelize.col('geom')));
	}

	/*
	if (req.query.municipalityid) {
	
		query.where.$and.push(models.sequelize.fn('ST_Contains', models.sequelize.literal("(SELECT geom FROM Areas WHERE _id="+req.query.municipalityid+")"), models.sequelize.col('Observation.geom')));
	}
	*/

	if (req.query.selectedMonths) {
		query.where.$and.push(models.sequelize.literal('MONTH(observationDate) IN (' + req.query.selectedMonths.toString() + ')'));
	}


	if (query.where.createdAt && !query.where.createdAt.$between && !query.where.createdAt.$lte && !query.where.createdAt.$gte) {
		//query.where.createdAt = models.sequelize.fn('DATE', models.sequelize.col('createdAt'));
		query.where.$and.push(models.sequelize.literal("DATE(Observation.createdAt) = '" + query.where.createdAt.toString() + "'"));
		delete query.where.createdAt;
	}

	if (req.query.where) {
		_.merge(query.where, JSON.parse(req.query.where));
	}
	/*
		if(req.query.group){
			
			query['group'] =	JSON.parse(req.query.group)
			
		}; */

	if (req.query.include) {


		var parsed = JSON.parse(req.query.include)
		query['include'] = _.map(parsed, function(n) {
			var n = JSON.parse(n);

			if (n.model === "User") {

				n = userTool.secureUser(n);

			}

			// special case for mycokeyattributes included on determinationView
			/*	
				if(n.model === 'DeterminationView' && n.include){
				//	n.include = JSON.parse(n.include);
					for (var i = 0; i < n.include.length; i++){
						n.include[i].model = models[n.include[i].model]
						n.include[i].where = JSON.parse(n.include[i].where)
						
					}
					console.log("###########")
					console.log(n.include)
					console.log("###########")
				}
				*/
			n.model = models[n.model];
			return n;
		})


	} else {
		query['include'] = [{
				model: models.DeterminationView,
				as: "DeterminationView",
				attributes: ['Taxon_FullName', 'Taxon_vernacularname_dk', 'Taxon_RankID']
			}, {
				model: models.User,
				as: 'PrimaryUser',
				attributes: ['email', 'Initialer', 'name', '_id']
			}, {
				model: models.Locality,
				as: 'Locality'
			}, {
				model: models.ObservationImage,
				as: 'Images',
				separate: true,
				offset: 0,
				limit: 10
			}, {
				model: models.ObservationForum,
				as: 'Forum',
				separate: true,
				offset: 0,
				limit: 10

			}

		]
	}
	var activeThreadsPromise;
	if (req.user && Boolean(req.query.activeThreadsOnly)) {

		activeThreadsPromise = activeThreads(req.user)
	} else if (req.user && req.query.recentlyCommented) {

		activeThreadsPromise = recentlyCommented(req.user, req.query.recentlyCommented)
	} else {
		activeThreadsPromise = Promise.resolve(false)
	}
	console.log(query);

	activeThreadsPromise.then(function(observationids) {
		if (observationids !== false) {
			query.where._id = {
				$in: observationids
			}
		};

		return Observation.findAndCount(query)
	})

	.then(function(taxon) {
			res.set('count', taxon.count.length);
			if (req.query.offset !== undefined) {
				res.set('offset', req.query.offset);
			};
			if (req.query.limit !== undefined) {
				res.set('limit', req.query.limit);
			};
			return res.status(200).json(taxon.rows)
		})
		.catch(handleError(res));




};




function activeThreads(user) {

	return models.sequelize.query(
		'select distinct o.observation_id from ObservationForum o JOIN' +
		' (SELECT observation_id, user_id, createdAt FROM ObservationForum WHERE user_id = :userid group by observation_id) a JOIN' +
		' (SELECT s1.observation_id, s1.user_id, s1.createdAt' +
		' FROM ObservationForum s1' +
		' LEFT JOIN ObservationForum s2 ON s1.observation_id = s2.observation_id AND s1.createdAt < s2.createdAt' +
		' WHERE s2.observation_id IS NULL) b' +
		' ON o.observation_id= a.observation_id AND a.user_id <> b.user_id AND b.observation_id = a.observation_id', {
			replacements: {
				userid: user._id
			},
			type: models.sequelize.QueryTypes.SELECT
		}
	).then(function(observationids) {

		return _.map(observationids, function(o) {
			return o.observation_id
		})

	})
}


function recentlyCommented(user, since) {

	return models.sequelize.query(
		'SELECT o._id FROM Observation o JOIN ObservationForum of1 ON o._id = of1.observation_id' +
		' LEFT OUTER JOIN ObservationForum of2 ON o._id = of2.observation_id AND' +
		' (of1.createdAt < of2.createdAt OR of1.createdAt = of2.createdAt AND of1._id > of2._id)' +
		' WHERE of2._id IS NULL AND of1.user_id <> o.primaryuser_id AND o.primaryuser_id = :userid AND of1.createdAt > :created', {
			replacements: {
				userid: user._id,
				created: since
			},
			type: models.sequelize.QueryTypes.SELECT
		}
	).then(function(observationids) {

		return _.map(observationids, function(o) {
			return o._id
		})

	})
}

function validationStatusUpdatedSince(user, since) {

	var sql = 'SELECT o._id from Observation o JOIN Determination d on o.primarydetermination_id = d._id WHERE o.primaryuser_id = :userid AND ((d.validator_id IS NOT NULL AND d.validator_id <> :userid AND d.updatedAt > :fromdate) OR (d.createdByUser IS NOT NULL AND d.createdByUser <> :userid AND d.createdAt > :fromdate) OR (d.score >= ' + crowdSourcedIdentificationConstants.ACCEPTED_SCORE + '  AND d.updatedAt > d.createdAt AND d.updatedAt > :fromdate) )';

	return models.sequelize.query(
		sql, {
			replacements: {
				userid: user._id,
				fromdate: since
			},
			type: models.sequelize.QueryTypes.SELECT
		}
	).then(function(observationids) {

		return _.map(observationids, function(o) {
			return o._id
		})

	})
}


exports.showSimple = function(req, res) {
	var userIsValidator = (req.user) ? userTool.hasRole(req.user, 'validator') : false;

	var query = getDefaulQuery(req);

	if (!userIsValidator) {
		query.attributes = {
			exclude: ['noteInternal']
		};
	};

	Observation.find(query)

	.then(handleEntityNotFound(res))
		.then(function(obj) {
			var parsed = {};

			parsed.Taxon = _.get(obj, 'PrimaryDetermination.Taxon.acceptedTaxon.FullName');
			parsed.Author = _.get(obj, 'PrimaryDetermination.Taxon.acceptedTaxon.Author');
			parsed.Leg = obj.users.map(function(u) {
				return u.name
			}).join(', ');
			parsed.Det = _.get(obj, 'PrimaryDetermination.User.name');
			parsed.Date = obj.observationDate;
			parsed.Day = obj.observationDate.getDate(); //obj.observationDate.split("T")[0].split("-")[2];
			parsed.Month = obj.observationDate.getMonth() + 1; //obj.observationDate.split("T")[0].split("-")[1];
			parsed.Year = obj.observationDate.getFullYear(); //obj.observationDate.split("T")[0].split("-")[0];
			parsed.CollNo = obj.fieldnumber;
			parsed.AtlasNo = obj._id;
			parsed.Latitude = obj.decimalLatitude;
			parsed.Longitude = obj.decimalLongitude;
			parsed.Precision = obj.accuracy;
		
			parsed.Notes = obj.note
			
			if(req.query.locale && req.query.locale === "en"){
				parsed.Substrate = _.get(obj, 'Substrate.name_uk');
				parsed.Vegetationtype = _.get(obj, 'VegetationType.name_uk');
				parsed.Host = obj.associatedTaxa.map(function(t) {
					return t.DKandLatinName
				}).join(', ');
				parsed.Locality = (obj.Locality) ? obj.Locality.name : obj.verbatimLocality;
				parsed.Country = (obj.Locality) ? 'Denmark' : obj.GeoNames.countryName;
			} else {
				parsed.Substrat = _.get(obj, 'Substrate.name');
				parsed.Vegetationstype = _.get(obj, 'VegetationType.name');
				parsed.Vaert = obj.associatedTaxa.map(function(t) {
					return t.DKandLatinName
				}).join(', ');
				parsed.Lokalitet = (obj.Locality) ? obj.Locality.name : obj.verbatimLocality;
				parsed.Land = (obj.Locality) ? 'Denmark' : obj.GeoNames.countryName;
			}

			return res.status(200).json(parsed)
		})

	.
	catch(handleError(res));
};
// Get a single observation
exports.show = function(req, res) {
	var userIsValidator = (req.user) ? userTool.hasRole(req.user, 'validator') : false;

	var query = getDefaulQuery(req);

	if (!userIsValidator) {
		query.attributes = {
			exclude: ['noteInternal']
		};
	};

	Observation.find(query)

	.then(handleEntityNotFound(res))
		.then(function(obs) {
			return res.status(200).json(obs)
		})

	.
	catch(handleError(res));
};






// Creates a new Observation in the DB.
exports.create = function(req, res) {
	var userIsValidator = (req.user) ? userTool.hasRole(req.user, 'validator') : false;
	var determination = req.body.determination;
	var observation = req.body;
	if (!userIsValidator) {
		delete observation.noteInternal;
	};
	delete observation._id;
	
	var logObject = {
		User: {
			_id: req.user._id,
			name: req.user.name,
			initials: req.user.Initialer
		},
		_eventType: 'NEW OBSERVATION WITH INITIAL DETERMINATION'
	};
	observation.primaryuser_id = req.user._id;
	observation.geom = models.sequelize.fn('GeomFromText', 'POINT (' + req.body.decimalLongitude + ' ' + req.body.decimalLatitude + ')');

	return models.sequelize.transaction(function(t) {

			var gnames = (req.body.geoname) ? models.GeoNames.upsert(req.body.geoname, {
				transaction: t
			}) : Promise.resolve(true);

			return gnames.then(function(gname) {
					return models.Observation.create(req.body, {
						transaction: t
					})
				}).then(function(obs) {


					return determinationController.createDetermination(obs, determination, req.user, t, logObject);

				})
				.spread(function(det, obs) {

					obs.primarydetermination_id = det._id;
					var associated = _.map(req.body.associatedOrganisms, function(a) {
						return {
							observation_id: obs._id,
							planttaxon_id: a._id
						}
					})
					var finders = _.map(req.body.users, function(u) {
						return {
							observation_id: obs._id,
							user_id: u._id
						}
					})

					return [obs.save({
							transaction: t
						}), det,
						models.ObservationPlantTaxon.bulkCreate(associated, {
							transaction: t
						}), models.ObservationUser.bulkCreate(finders, {
							transaction: t
						}), models.ObservationSubscriber.bulkCreate(finders, {
							transaction: t
						})
					];
				})
				.spread(function(obs, det) {
					return [obs, models.DeterminationLog.create({
						eventType: logObject._eventType,
						user_id: req.user._id,
						determination_id: det._id,
						observation_id: obs._id,
						logObject: JSON.stringify(logObject)
					}, {
						transaction: t
					})]
				})
				.spread(function(obs) {
					return obs;
				})
				.
			catch((err) => {
				throw err
			});

		}).then(function(obs) {

			return res.status(201).json(obs)
		})
		.
	catch((err) => {
		var statusCode = (err.message === "LOCALITY_MISSING") ? 422 : 500;
		console.log(err);

		return res.status(statusCode).send(err.message);
	});



};






// Updates an existing taxon in the DB.
exports.update = function(req, res) {


	var userIsValidator = userTool.hasRole(req.user, 'validator');
	var observation = req.body;

	if (!userIsValidator) {
		delete observation.noteInternal;
	};

	return models.sequelize.transaction(function(t) {

			var gnames = (req.body.geoname) ? models.GeoNames.upsert(req.body.geoname, {
				transaction: t
			}) : Promise.resolve(true);

			return gnames.then(function(gname) {
				return models.Observation.find({
					where: {
						_id: req.params.id
					}
				}, {
					transaction: t
				})


			}).then(function(obs) {


				if (!obs) {
					res.send(404);
				};

				if (req.user._id !== obs.primaryuser_id && !userIsValidator) {

					throw new Error("Forbidden")
				}

				if (obs.decimalLatitude !== req.body.decimalLatitude || obs.decimalLongitude !== req.body.decimalLongitude) {
					obs.set('geom', models.sequelize.fn('GeomFromText', 'POINT (' + req.body.decimalLongitude + ' ' + req.body.decimalLatitude + ')'));
				}
				// update attributes
				obs.set(req.body);
				if (req.body.geoname && obs.locality_id !== null) {
					obs.set('locality_id', null)
				}
				if (req.body.locality_id && obs.geonameId !== null) {
					obs.set('geonameId', null);
					obs.set('verbatimLocality', null);
				}


				if (obs.changed() && obs.changed().indexOf('observationDate') > -1 && moment(req.body.observationDate).isValid()) {
					obs.set('observationDateAccuracy', 'day');
				};

				var changed = obs.changed();


				return [obs.save({
					transaction: t
				}), obs.setAssociatedTaxa(_.map(req.body.associatedOrganisms, function(e) {
					return e._id
				}), {
					transaction: t
				}), obs.setUsers(_.map(req.body.users, function(e) {
					return e._id
				}), {
					transaction: t
				}), changed];

			})

			.spread(function(obs, associated, users, changed) {
					var json = {};
					_.each(changed, function(e) {
						json[e] = req.body[e];
					})
					if (associated.length > 0) {
						json.associatedOrganisms = _.map(req.body.associatedOrganisms, function(e) {
							return {
								_id: e._id,
								DKandLatinName: e.DKandLatinName
							}
						});
					}
					if (users.length > 0) {
						json.users = _.map(req.body.users, function(e) {
							return {
								_id: e._id,
								name: e.name,
								Initialer: e.Initialer
							}
						});
					};

					var log = (_.isEmpty(json)) ? null : models.ObservationLog.create({
						eventname: 'Updated fields',
						oldvalues: JSON.stringify(json),
						user_id: req.user._id,
						observation_id: req.params.id
					}, {
						transaction: t
					});

					return [obs, log];
				})
				.spread(function(obs, log) {
					return obs;
				})


		}).then(function(obs) {

			return res.status(200).json(obs)
		})
		.
	catch(function(err) {
		var statusCode = (err.message === 'Forbidden') ? 403 : 500;
		console.log(err);

		res.status(statusCode).send(err.message);
	});

};


exports.updatePrimaryDetermination = (req, res) => {

	return models.Observation.find({
			where: {
				_id: req.params.id
			},
			include: [{
				model: models.Determination,
				as: "PrimaryDetermination",
				include: [{
					model: models.Taxon,
					as: "Taxon",
					include: [{
						model: models.Taxon,
						as: "acceptedTaxon",
						include: [{
							model: models.TaxonDKnames,
							as: "Vernacularname_DK"
						}]
					}]
				}, {
					model: models.User,
					as: 'User',
					attributes: ['_id', 'email', 'Initialer', 'name']
				}, {
					model: models.User,
					as: 'Validator',
					attributes: ['_id', 'Initialer', 'name']
				}]
			}, {
				model: models.Determination,
				as: 'Determinations',
				include: [{
						model: models.Taxon,
						as: "Taxon",
						include: [{
							model: models.Taxon,
							as: "acceptedTaxon",
							include: [{
								model: models.TaxonDKnames,
								as: "Vernacularname_DK"
							}]
						}]
					}, {
						model: models.User,
						as: 'User',
						attributes: ['_id', 'email', 'Initialer', 'name']
					}, {
						model: models.User,
						as: 'Validator',
						attributes: ['_id', 'Initialer', 'name']
					}, {
						model: models.DeterminationVote,
						as: 'Votes'
					},

				]

			}]
		}).then((obs) => {

			var newDetermination = _.find(obs.Determinations, (det) => {
				return det._id === req.body._id;
			})
			var oldDetermination = obs.PrimaryDetermination;
			if (!newDetermination) {
				throw new Error("Not found");
			} else {
				newDetermination.validation = "Godkendt";
				newDetermination.validator_id = req.user._id;
				return [obs.setPrimaryDetermination(newDetermination), newDetermination.save(), oldDetermination]
			}
		})
		.spread((obs, newDetermination, oldDetermination) => {

			var desc = "New determination_id: " + newDetermination._id + "; new taxon: " + newDetermination.Taxon.acceptedTaxon.FullName + "; old determination_id: " + oldDetermination._id + "; old taxon " + oldDetermination.Taxon.acceptedTaxon.FullName

			return models.ObservationLog.create({
				eventname: "New primary determination",
				oldvalues: JSON.stringify({
					"primarydetermination_id": oldDetermination._id
				}),
				description: desc,
				user_id: req.user._id,
				observation_id: req.params.id
			})

		})

	.then(() => {
		res.send(204);
	}).
	catch(function(err) {
		var statusCode = (err === "Not found") ? 404 : 500;
		console.log(err);

		res.status(statusCode).send(err);
	});
}

// Deletes a taxon from the DB.
exports.destroy = function(req, res) {

	var userIsValidator = userTool.hasRole(req.user, 'validator');

	return models.sequelize.transaction(function(t) {
			return Observation.find({
					where: {
						_id: req.params.id
					},
					include: [{
							model: models.DeterminationView,
							as: "DeterminationView",
							attributes: ['Taxon_FullName', 'Taxon_vernacularname_dk', 'Taxon_RankID', 'Determination_user_id', 'Determination_validation', 'Determination_validator_id'],
							include: [{
								model: models.User,
								as: 'Determiner',
								attributes: ['email', 'Initialer', 'name']
							}]
						}, {
							model: models.User,
							as: 'PrimaryUser',
							attributes: ['email', 'Initialer', 'name']
						}, {
							model: models.Locality,
							as: 'Locality'
						}, {
							model: models.ObservationImage,
							as: 'Images',
							separate: true,
							offset: 0,
							limit: 10
						}, {
							model: models.ObservationForum,
							as: 'Forum',
							separate: true,
							offset: 0,
							limit: 10

						}

					]

				}, {
					transaction: t
				})
				.then(function(obs) {

					if (!obs) {
						res.send(404);
					} else if (!userIsValidator && !(req.user._id === obs.primaryuser_id && obs.createdAt > moment().subtract(2, 'days'))) {
						throw new Error("Forbidden");
					}
					var serializedObs = JSON.stringify(obs);

					return [obs, models.ObservationLog.create({
						eventname: 'Deleted observation',
						oldvalues: serializedObs,
						user_id: req.user._id,
						observation_id: req.params.id
					}, {
						transaction: t
					})];
				})
				.spread(function(obs) {
					var q = {
						where: {
							observation_id: req.params.id
						},
						transaction: t
					};
					obs.primarydetermination_id = null;

					return [obs.save({
							transaction: t
						}),
						models.DeterminationVote.destroy(q),
						models.sequelize.query(
							'DELETE ObservationEventMentions FROM ObservationEventMentions ' +
							'INNER JOIN ObservationEvents on ObservationEventMentions.observationevent_id = ObservationEvents._id ' +
							'WHERE ObservationEvents.observation_id = :observation_id', {
								replacements: {
									observation_id: obs._id
								},
								type: models.sequelize.QueryTypes.DELETE
							})
					];



				})
				.spread(function(obs, deleted) {


					var q = {
						where: {
							observation_id: req.params.id
						},
						transaction: t
					};
					return [
						models.ObservationArea.destroy(q),
						models.Determination.destroy(q),
						models.ObservationForum.destroy(q),
						models.ObservationImage.destroy(q),
						models.ObservationPlantTaxon.destroy(q),
						models.ObservationUser.destroy(q),
						models.ObservationEvent.destroy(q),
						models.DnaSequence.destroy(q),
						models.ObservationSubscriber.destroy(q)

					]

				}).then(function() {

					return Observation.destroy({
						where: {
							_id: req.params.id
						},
						transaction: t

					})
				})

		})
		.then(function() {
			res.send(204);
		})
		.
	catch(function(err) {
		var statusCode = (err.message === 'Forbidden') ? 403 : 500;
		console.log(err);

		res.status(statusCode).send(err.message);
	});



};

exports.getCount = function(req, res) {

	var commSql = (req.query.communityApproved) ? ' AND (d.score >= ' + determinationController.Constants.ACCEPTED_SCORE + ' AND d.validation <> "Godkendt") AND d.baseScore < ' + determinationController.Constants.ACCEPTED_SCORE : "";
	var groups = {
		'Year': 'select year(observationDate) as year, count(*) as count from Observation o, Determination d WHERE o.primarydetermination_id=d._id' + commSql + ' group by year(observationDate)',
		'Decade': 'select 10 * FLOOR( YEAR(observationDate) / 10 ) AS decade, count(*)  as count from Observation o, Determination d WHERE o.primarydetermination_id=d._id' + commSql + ' group by decade',
		'YEARWEEK': 'SELECT YEARWEEK(observationDate) as YEARWEEK, COUNT(o._id) as count FROM Observation o, Determination d WHERE o.primarydetermination_id=d._id' + commSql + ' AND observationDate > DATE_SUB(NOW(), INTERVAL :timeAgo WEEK) GROUP BY YEARWEEK(observationDate)'
	}
	var sql = (req.query.group) ? groups[req.query.group] : 'select count(*) as count from Observation o, Determination d WHERE o.primarydetermination_id=d._id' + commSql;


	return models.sequelize.query(sql, {
		replacements: {
			timeAgo: req.query.timeAgo || ""
		},
		type: models.sequelize.QueryTypes.SELECT
	})

	.then(function(result) {

		if (req.query.cached) {
			return cacheResultByUrl(req, JSON.stringify(result)).then(function() {

				return res.status(200).json(result)
			})
		} else {
			return res.status(200).json(result)
		}
	}).catch(handleError(res));


};

exports.getSpeciesCount = function(req, res) {

	if (['WEEK', 'MONTH', 'YEAR', 'YEARWEEK'].indexOf(req.query.timeIntervalType) === -1) {
		return res.sendStatus(400);
	}

	var sql;
	if (req.query.communityApproved) {
		sql = `SELECT ${req.query.timeIntervalType}(o.observationDate) as ${req.query.timeIntervalType},  count(distinct d.taxon_id) as speciescount  FROM Observation o, Determination d, Taxon t WHERE o.primarydetermination_id=d._id AND d.taxon_id = t._id AND t.RankID >= 9950 AND (d.score >= ${determinationController.Constants.ACCEPTED_SCORE} AND d.validation <> "Godkendt") AND d.baseScore < ${determinationController.Constants.ACCEPTED_SCORE} AND o.observationDate > DATE_SUB(NOW(), INTERVAL :timeAgo ${(req.query.timeIntervalType ==='YEARWEEK') ? 'WEEK': req.query.timeIntervalType}) GROUP BY ${req.query.timeIntervalType}(o.observationDate)`
	} else if (req.query.expertApproved) {
		sql = `SELECT ${req.query.timeIntervalType}(o.observationDate) as ${req.query.timeIntervalType},  count(distinct d.taxon_id) as speciescount  FROM Observation o, Determination d, Taxon t WHERE o.primarydetermination_id=d._id AND d.taxon_id = t._id AND t.RankID >= 9950 AND  d.validation = "Godkendt" AND o.observationDate > DATE_SUB(NOW(), INTERVAL :timeAgo ${(req.query.timeIntervalType ==='YEARWEEK') ? 'WEEK': req.query.timeIntervalType}) GROUP BY ${req.query.timeIntervalType}(o.observationDate)`
	} else if (req.query.notApproved) {
		sql = `SELECT ${req.query.timeIntervalType}(o.observationDate) as ${req.query.timeIntervalType},  count(distinct d.taxon_id) as speciescount  FROM Observation o, Determination d, Taxon t WHERE o.primarydetermination_id=d._id AND d.taxon_id = t._id AND t.RankID >= 9950 AND (d.score < ${determinationController.Constants.ACCEPTED_SCORE} AND d.validation <> "Godkendt") AND o.observationDate > DATE_SUB(NOW(), INTERVAL :timeAgo ${(req.query.timeIntervalType ==='YEARWEEK') ? 'WEEK': req.query.timeIntervalType}) GROUP BY ${req.query.timeIntervalType}(o.observationDate)`
	} else {
		sql = `SELECT ${req.query.timeIntervalType}(o.observationDate) as ${req.query.timeIntervalType},  count(distinct d.taxon_id) as speciescount  FROM Observation o, Determination d, Taxon t WHERE o.primarydetermination_id=d._id AND d.taxon_id = t._id AND t.RankID >= 9950 AND (d.score >= ${determinationController.Constants.ACCEPTED_SCORE} OR d.validation = "Godkendt") AND o.observationDate BETWEEN DATE_SUB(NOW(), INTERVAL :timeAgo ${(req.query.timeIntervalType ==='YEARWEEK') ? 'WEEK': req.query.timeIntervalType}) AND DATE_SUB(NOW(), INTERVAL :limit ${(req.query.timeIntervalType ==='YEARWEEK') ? 'WEEK': req.query.timeIntervalType}) GROUP BY ${req.query.timeIntervalType}(o.observationDate)`
	}


	return models.sequelize.query(sql, {
		replacements: {
			timeAgo: req.query.timeAgo,
			limit: (req.query.limit) ? parseInt(req.query.timeAgo) - parseInt(req.query.limit) : 0
		},
		type: models.sequelize.QueryTypes.SELECT
	})

	.then(function(result) {

		if (req.query.cached) {
			return cacheResultByUrl(req, JSON.stringify(result)).then(function() {

				return res.status(200).json(result)
			})
		} else {
			return res.status(200).json(result)
		}
	}).catch(handleError(res));


};

exports.getUserCount = function(req, res) {

	if (['WEEK', 'MONTH', 'YEAR', 'YEARWEEK'].indexOf(req.query.timeIntervalType) === -1) {
		return res.sendStatus(400);
	}


	var sql = `SELECT ${req.query.timeIntervalType}(o.observationDate) as ${req.query.timeIntervalType},  count(distinct o.primaryuser_id) as usercount  FROM Observation o WHERE  o.observationDate > DATE_SUB(NOW(), INTERVAL :timeAgo ${(req.query.timeIntervalType ==='YEARWEEK') ? 'WEEK': req.query.timeIntervalType}) GROUP BY ${req.query.timeIntervalType}(o.observationDate)`

	return models.sequelize.query(sql, {
		replacements: {
			timeIntervalType: req.query.timeIntervalType,
			timeAgo: req.query.timeAgo
		},
		type: models.sequelize.QueryTypes.SELECT
	})

	.then(function(result) {

		if (req.query.cached) {
			return cacheResultByUrl(req, JSON.stringify(result)).then(function() {

				return res.status(200).json(result)
			})
		} else {
			return res.status(200).json(result)
		}
	}).catch(handleError(res));


};

/*
function wait(ms){
   var start = new Date().getTime();
   var end = start;
   while(end < start + ms) {
     end = new Date().getTime();
  }
}
*/

exports.addUserToObs = function(req, res) {


	return Observation.find({
			where: {
				_id: req.params.id
			}
		})
		.then(function(obs) {

			if (!obs) {
				throw new Error("Not found")
			}
			if (req.user._id !== req.body._id) {
				throw new Error('Forbidden');
			} else {
				return models.ObservationUser.upsert({
					observation_id: req.params.id,
					user_id: req.user._id
				})
			}
		})
		.then(function() {
			return res.send(201);
		})
		.
	catch(function(err) {
		var statusCode;
		if (err.message === 'Forbidden') {
			statusCode = 403;
		} else if (err === "Not found") {
			statusCode = 404;
		} else {
			statusCode = 500;
		}
		console.log(err);

		res.status(statusCode).send(err.message);
	});
}

exports.deleteUserFromObs = function(req, res) {

	return Observation.find({
			where: {
				_id: req.params.id
			}
		})
		.then(function(obs) {
			if (!obs) {
				throw new Error("Not found");
			}
			if (parseInt(req.user._id) !== parseInt(req.params.userid)) {
				console.log('req.user._id ' + req.user._id + ' req.params ' + JSON.stringify(req.params))
				throw new Error('Forbidden');
			} else {
				return models.ObservationUser.destroy({
					where: {
						observation_id: req.params.id,
						user_id: req.user._id
					}
				})
			}
		})
		.then(function() {
			return res.send(204);
		})
		.
	catch(function(err) {
		var statusCode;
		if (err.message === 'Forbidden') {
			statusCode = 403;
		} else if (err === "Not found") {
			statusCode = 404;
		} else {
			statusCode = 500;
		}
		console.log(err);

		res.status(statusCode).send(err.message);
	});
}

exports.addObservationToFrontPageAsNewDK = function(req, res) {
	var redisClient = req.redis;
	var now = Date.now();
	var ttl = parseInt(req.body.ttl) * 1000 * 60 * 60 * 24; // ttl in days calculated as millisec
	//var ttl = parseInt(req.body.ttl) * 60 * 10 * 1000; // 10 min for testing
	var score = now + ttl;



	return redisClient.zaddAsync('new_dk_frontpage_observations', score, req.params.id)
		.then(function() {
			// clean up expired keys
			return redisClient.zremrangebyscoreAsync('new_dk_frontpage_observations', '-inf', now)
				//return true;
		})
		.then(function() {
			// clean up expired keys
			res.sendStatus(200);
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})

}

exports.removeObservationFromFrontPageAsNewDK = function(req, res) {
	var redisClient = req.redis;


	return redisClient.zremAsync('new_dk_frontpage_observations', req.params.id)

	.then(function() {
			// clean up expired keys
			res.sendStatus(200);
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})

}

exports.getObservationFromFrontPageAsNewDK = function(req, res) {
	var redisClient = req.redis;
	var now = Date.now();

	return redisClient.zremrangebyscoreAsync('new_dk_frontpage_observations', '-inf', now).then(function() {
		return redisClient.zscoreAsync('new_dk_frontpage_observations', req.params.id)
	})


	.then(function(obs) {

			if (obs) {
				res.status(200).json(obs);
			} else {
				res.sendStatus(404);
			}
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})

}

exports.getObservationIdsSelectedForFrontpageAsNewDK = function(req, res) {
	var redisClient = req.redis;

	var now = Date.now();
	redisClient.zrangebyscoreAsync('new_dk_frontpage_observations', now, '+inf')
		.then(function(obsids) {
			req.query.where = JSON.stringify({
					_id: obsids
				})
				//return res.status(200).json(obsids);
			return exports.index(req, res)
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})
}



// --------------

exports.addObservationToFrontPage = function(req, res) {
	var redisClient = req.redis;
	var now = Date.now();
	var ttl = parseInt(req.body.ttl) * 1000 * 60 * 60 * 24; // ttl in days calculated as millisec
	//var ttl = parseInt(req.body.ttl) * 60 * 10 * 1000; // 10 min for testing
	var score = now + ttl;



	return redisClient.zaddAsync('selected_frontpage_observations', score, req.params.id)
		.then(function() {
			// clean up expired keys
			return redisClient.zremrangebyscoreAsync('selected_frontpage_observations', '-inf', now)
				//return true;
		})
		.then(function() {
			// clean up expired keys
			res.sendStatus(200);
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})

}

exports.removeObservationFromFrontPage = function(req, res) {
	var redisClient = req.redis;


	return redisClient.zremAsync('selected_frontpage_observations', req.params.id)

	.then(function() {
			// clean up expired keys
			res.sendStatus(200);
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})

}

exports.getObservationFromFrontPage = function(req, res) {
	var redisClient = req.redis;
	var now = Date.now();

	return redisClient.zremrangebyscoreAsync('selected_frontpage_observations', '-inf', now).then(function() {
		return redisClient.zscoreAsync('selected_frontpage_observations', req.params.id)
	})


	.then(function(obs) {

			if (obs) {
				res.status(200).json(obs);
			} else {
				res.sendStatus(404);
			}
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})

}

exports.getObservationIdsSelectedForFrontpage = function(req, res) {
	var redisClient = req.redis;

	var now = Date.now();
	redisClient.zrangebyscoreAsync('selected_frontpage_observations', now, '+inf')
		.then(function(obsids) {
			req.query.where = JSON.stringify({
					_id: obsids
				})
				//return res.status(200).json(obsids);
			return exports.index(req, res)
		})
		.catch(function(err) {
			console.log("error: " + err)
			return res.sendStatus(500);
		})
}




exports.notifyValidator = function(req, res) {
	var query = getDefaulQuery(req);

	Observation.find(query)
		.then(handleEntityNotFound(res))
		.then(function(obs) {

			return mail.notifyValidator(req.user, obs, req.body.message)
		})
		.then(function() {
			res.sendStatus(200);
		})
		.
	catch(handleError(res));


}

exports.generateCapsule = function(req, res) {


	var query = getDefaulQuery(req);

	query.include[0].include.push({
		model: models.DeterminationVote,
		as: 'Votes',
		attributes: ['_id', 'user_id', 'createdAt', 'score'],
		include: [{
			model: models.User,
			as: "User",
			attributes: ['_id', 'name', 'Initialer'],
		}]
	})


	Observation.find(query)
		.then(handleEntityNotFound(res))
		.then(function(obs) {

			getPdfCapsule(req, res, obs)
		})
		.
	catch(handleError(res));


};

function getPdfCapsule(req, res, obs) {

	var doc = new PDFdocument({
		layout: 'landscape',
		size: 'A4'
	});

	doc.pipe(res);


	doc.rotate(180, {
		origin: [doc.x, doc.y]
	});


	doc
		.fontSize(14)
		.text(obs.PrimaryDetermination.Taxon.acceptedTaxon.FullName + " " + obs.PrimaryDetermination.Taxon.acceptedTaxon.Author, -1320, 100, {
			align: 'center'
		});

	if (obs.PrimaryDetermination.Taxon.acceptedTaxon.Vernacularname_DK) {
		doc
			.fontSize(14)
			.text(obs.PrimaryDetermination.Taxon.acceptedTaxon.Vernacularname_DK.vernacularname_dk, -1320, 115, {
				align: 'center'
			});
	}



	doc
		.fontSize(14)
		.text('DMS-' + obs._id, -165, 70);
	doc.image(config.staticImagePath + 'LogoSmallest.png', -495, 70, {
		height: 22
	})
	doc
		.fontSize(14)
		.text('Danmarks svampeatlas', -470, 70);

	doc
		.fontSize(8)
		.text('Danish Fungal Atlas');

	doc.rotate(180);
	if (obs.Images.length > 0) {
		doc.image(config.uploaddir + obs.Images[0].name + ".JPG", 70, -55, {
			fit: [210, 140]
		})
	}

	if (obs.Images.length > 1) {
		doc.image(config.uploaddir + obs.Images[1].name + ".JPG", 280, -55, {
			fit: [210, 140]
		})
	}

	// vandrette linjer
	doc.moveTo(-140, -65)
		.lineTo(700, -65)
		.dash(5, {
			space: 10
		})
		.stroke()

	doc.moveTo(-140, 220)
		.lineTo(700, 220)
		.dash(5, {
			space: 10
		})
		.stroke()

	// lodrette

	doc.moveTo(60, -150)
		.lineTo(60, 480)
		.dash(5, {
			space: 10
		})
		.stroke()

	doc.moveTo(500, -150)
		.lineTo(500, 480)
		.dash(5, {
			space: 10
		})
		.stroke()

	doc.rotate(180);
	var locality = (obs.locality_id !== null) ? 'Denmark, ' + obs.Locality.name : obs.verbatimLocality
	doc
		.fontSize(10)
		.text('Locality: ' + locality, -480, -365)
		.moveDown(0.5)

	doc
		.fontSize(10)
		.text('Latitude: ' + obs.decimalLatitude + " Longitude: " + obs.decimalLongitude + " Accuracy: " + obs.accuracy + " m")
		.moveDown(0.5)

	doc

		.text('Date: ' + obs.observationDate.getDate() + '/' + (obs.observationDate.getMonth() + 1) + '/' + obs.observationDate.getFullYear() + ' Reported by: ' + obs.PrimaryDetermination.User.name)
		.moveDown(0.5)


	doc
		.fontSize(10)
		.text('Det: ' + obs.PrimaryDetermination.User.name)
		.moveDown(0.5)
	if (obs.PrimaryDetermination.validation === "Godkendt" && obs.PrimaryDetermination.Validator && obs.PrimaryDetermination.Validator._id !== obs.PrimaryDetermination.User._id) {



		doc
			.text('Conf: ' + obs.PrimaryDetermination.Validator.name)
			.moveDown(0.5)


	} else if (obs.PrimaryDetermination.Votes.length > 0 && parseInt(obs.PrimaryDetermination.score) >= crowdSourcedIdentificationConstants.ACCEPTED_SCORE) {


		obs.PrimaryDetermination.Votes.sort(function(a, b) {
			return b.score - a.score
		})

		var sliced = obs.PrimaryDetermination.Votes.slice(0, 3);

		var conf = _.reduce(sliced, function(prev, v) {

			var usr = (prev !== "") ? ", " + v.User.name : v.User.name;

			return prev + usr;
		}, "")

		doc
			.text('Conf: ' + conf)
			.moveDown(0.5)


	};
	var desc = "";
	if (obs.users.length > 0) {
		desc += _.reduce(obs.users, function(prev, u) {

			var usr = (prev !== "") ? ", " + u.name : u.name;

			return prev + usr;
		}, "")
	} else if (obs.verbatimLeg) {
		desc += obs.verbatimLeg;
	};
	doc
		.text('Leg: ' + desc)
		.moveDown(0.5)



	var hosts = (obs.associatedTaxa.length === 1) ? "Host: " : "Hosts: ";
	if (obs.associatedTaxa.length > 0) {
		hosts += _.reduce(obs.associatedTaxa, function(prev, u) {

			var usr = (prev !== "") ? ", " + u.DKandLatinName : u.DKandLatinName;

			return prev + usr;
		}, "")

		doc

			.text(hosts)

		.moveDown(0.5)
	}
	doc

		.text("Substrate: " + obs.Substrate.name_uk)

	.moveDown(0.5)
	doc

		.text("https://svampe.databasen.org/observations/" + obs._id, -480, -235)




	requestPromise({
			url: 'https://maps.googleapis.com/maps/api/staticmap?center=' + obs.decimalLatitude + ',' + obs.decimalLongitude + '&zoom=10&size=415x125&maptype=roadmap&markers=' + obs.decimalLatitude + ',' + obs.decimalLongitude + "&key=" + config.google.maps.apikey,
			// Prevents Request from converting response to string
			encoding: null

		})
		.then(function(body) {
			//console.log(response);
			doc.rotate(180);
			doc.image(body, 70, 90, {
				width: 415
			})

			return requestPromise({
				url: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=http://svampe.databasen.org/observations/' + obs._id,
				// Prevents Request from converting response to string
				encoding: null

			})
		})
		.then(function(body) {
			doc.rotate(180);
			doc.image(body, -120, -280, {
				width: 50
			})

			doc.end();
		})
		.catch(function(err) {
			console.log(err)
			doc.end();
		})




}
