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
var soap = require('soap');
var wsdl = "http://www.indexfungorum.org/ixfwebservice/fungus.asmx?WSDL";
var models = require('../')
var Taxon = models.Taxon;
var Promise = require("bluebird");
Promise.promisifyAll(soap);
var nestedQueryParser = require("../nestedQueryParser")



function cacheResult(req, value) {
	var redisClient = req.redis;
	var cachekey;
	if(req.query.cachekey){
		cachekey = req.query.cachekey
	} else if(req.body.cachekey){
		cachekey = req.body.cachekey
	}
	return redisClient.setAsync(cachekey, value)
		.then(function() {
			return (config.redisTTL[cachekey]) ? redisClient.expireAsync(cachekey, config.redisTTL[cachekey]) : true;
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

// Get list of taxons
exports.index = function(req, res) {



	var query = {
		offset: req.query.offset,
		limit: req.query.limit,
		where: {}
	};
	
	if (req.query.order) {
		query.order = req.query.order;
	}
	if (req.query._order) {
		query.order = JSON.parse(req.query._order);
	}

	if (req.query.acceptedTaxaOnly) {
		_.merge(query.where, {
			_id: {
				$eq: models.sequelize.col("Taxon.accepted_id")
			}
		});

	}

	if (req.query.where) {
		_.merge(query.where, JSON.parse(req.query.where));
	}


	if (req.query.include) {
		var include = JSON.parse(req.query.include)

		query['include'] = _.map(include, function(n) {
			
			n.model = models[n.model];
			if (n.where) {
				n.where = JSON.parse(n.where);

				if (n.where.$and && n.where.$and.length > 0) {

					for (var i = 0; i < n.where.$and.length; i++) {
						n.where.$and[i] = JSON.parse(n.where.$and[i]);
					}
				}
				
				
				/*
				if(n.model === "TaxonomyTag"){
							n.where._id = JSON.parse(n.where._id);
				
				}
				*/

				//	n.where = nestedQueryParser.parseQueryString(n.where)

			}
			
			// Allow only one 2nd level include and NOT user (which has sensitive information)
			if(n.include){
				var nestedinclude = JSON.parse(n.include);
					
				if(nestedinclude.model !== 'User'){
					nestedinclude.model = models[nestedinclude.model];
					nestedinclude.where = JSON.parse(nestedinclude.where);
					n.include = nestedinclude;
					
					
				}
			}
			
			return n;
		});
		
	
	}
	if(req.query.nocount !== undefined){
	Taxon.findAll(query)
		.then(function(taxon) {
			//res.set('count', taxon.count);
			if (req.query.offset) {
				res.set('offset', req.query.offset);
			};
			if (req.query.limit) {
				res.set('limit', req.query.limit);
			};
			return res.status(200).json(taxon)
		})
		.
	catch (handleError(res));
	} else {
Taxon.findAndCount(query)
		.then(function(taxon) {
			res.set('count', taxon.count);
			if (req.query.offset) {
				res.set('offset', req.query.offset);
			};
			if (req.query.limit) {
				res.set('limit', req.query.limit);
			};
			return res.status(200).json(taxon.rows)
		})
		.
	catch (handleError(res));
	}

	
/*	Taxon.findAndCount(query)
		.then(function(taxon) {
			res.set('count', taxon.count);
			if (req.query.offset) {
				res.set('offset', req.query.offset);
			};
			if (req.query.limit) {
				res.set('limit', req.query.limit);
			};
			return res.status(200).json(taxon.rows)
		})
		.
	catch (handleError(res)); */
	
};


// Get a single taxon
exports.show = function(req, res) {
	Taxon.find({
		where: {
			_id: req.params.id
		},
		include: [{
				model: models.TaxonDKnames,
				as: "Vernacularname_DK"
			},{
				model: models.TaxonDKnames,
				as: "DanishNames"
			},
			{
				model: models.TaxonImages,
				as: "images"
			}, {
				model: models.TaxonSpeciesHypothesis,
				as: 'specieshypothesis'
			},
			{
				model: models.Taxon,
				as: "synonyms"
			}, {
				model: models.Taxon,
				as: "Parent"
			}, {
				model: models.Taxon,
				as: "acceptedTaxon"
			}, {
				model: models.TaxonAttributes,
				as: "attributes"
			}, {
				model: models.Naturtype,
				as: 'naturtyper'
			}, {
				model: models.ErnaeringsStrategi,
				as: 'nutritionstrategies'
			}, {
				model: models.TaxonomyTag,
				as: 'tags'
			},
			{
							model: models.MycokeyCharacterView,
							as: 'character1'
						}

		]
	})
		.then(handleEntityNotFound(res))
		.then(responseWithResult(res))
		.
	catch (handleError(res));
};

exports.showAcceptedTaxon = function(req, res) {
	
	Taxon.find({
	where: {
		_id: req.params.id
	}
	})
	.then(
		function(tx){
			
	return	Taxon.find({
		where: {
			_id: tx.accepted_id
		},
		include: [{
				model: models.TaxonDKnames,
				as: "Vernacularname_DK",
			required: false
			},{
				model: models.TaxonDKnames,
				as: "DanishNames",
				required: false
			},
			{
				model: models.TaxonRedListData,
				as: "redlistdata",
				where: {year: 2009},
				required: false
			},
			{
				model: models.TaxonImages,
				as: "images",
				required: false
			}, 
			 {
				model: models.Taxon,
				as: "Parent"
			}, {
				model: models.Taxon,
				as: "synonyms",
				required: false,
				include: [{
				model: models.TaxonImages,
				as: "images",
					required: false
			}]
			}, {
				model: models.TaxonAttributes,
				as: "attributes"
			}

		]
	})})
		.then(handleEntityNotFound(res))
		.then(responseWithResult(res))
		.
	catch (handleError(res));
};

exports.showSiblings = function(req, res) {
	Taxon.find({
		where: {
			_id: req.params.id
		}
	})
		.then(handleEntityNotFound(res))
		.then(function(taxon) {
			return Taxon.findAll({
				where: models.Sequelize.and({
						_id: {
							ne: taxon._id
						}
					}, {
						parent_id: taxon.parent_id
					}

				),
				include: [{
					model: models.TaxonAttributes,
					as: "attributes",
					where: models.Sequelize.and({
						diagnose: {
							ne: null
						}
					}, {
						diagnose: {
							ne: ""
						}
					})
				}]
			})
		})
		.then(responseWithResult(res))
		.
	catch (handleError(res));
};


exports.updateSystematics = function(req, res) {
	Taxon.find({
		where: {
			_id: req.params.id
		}
	})
		.then(function(taxon) {

			soap.createClient(wsdl, function(err, client) {
				if (err) throw err;

				client.NameByKey({
					NameKey: taxon.FunIndexNumber
				}, function(err, result) {
					if (err) {
						res.status(500).json(err.message)
					};
					var r = result.NameByKeyResult.NewDataSet.IndexFungorum;
					if (r !== undefined) {
						var systematicPath = r.Kingdom_x0020_name + ", " + r.Phylum_x0020_name + ", " + r.Subphylum_x0020_name + ", " + r.Class_x0020_name + ", " + r.Subclass_x0020_name + ", " + r.Order_x0020_name + ", " + r.Family_x0020_name + ", " + r.Genus_x0020_name;
						var FunIndexCurrUseNumber = r.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
						taxon.FunIndexCurrUseNumber = FunIndexCurrUseNumber;
						taxon.SystematicPath = systematicPath;
						taxon.save().then(function() {
							res.status(200).json(taxon);
						})
					} else {
						res.status(200).json("Taxon not found in Index Fungorum");
					}

				});
			});

		})
		.
	catch (handleError(res));
};

function getSystematicPath(r, rankName){
	var systematicPath = "";
	if(r.Kingdom_x0020_name) {
		systematicPath += r.Kingdom_x0020_name;
		if(rankName === "regn.") return systematicPath;
	};
	if(r.Phylum_x0020_name) {
		systematicPath += (", "+r.Phylum_x0020_name);
		if(rankName === "phyl.") return systematicPath;
	};
	if(r.Subphylum_x0020_name) {
		systematicPath += (", "+r.Subphylum_x0020_name);
		if(rankName === "subphyl.") return systematicPath;
	};
	if(r.Class_x0020_name) {
		systematicPath += (", "+r.Class_x0020_name);
		if(rankName === "class.") return systematicPath;
	};
	if(r.Subclass_x0020_name) {
		systematicPath += (", "+r.Subclass_x0020_name);
		if(rankName === "subclass.") return systematicPath;
	};
	if(r.Order_x0020_name) {
		systematicPath += (", "+r.Order_x0020_name);
		if(rankName === "ord.") return systematicPath;
	};
	if(r.Family_x0020_name) {
		systematicPath += (", "+r.Family_x0020_name);
		if(rankName === "fam.") return systematicPath;
	};
	if(r.Genus_x0020_name) {
		systematicPath += (", "+r.Genus_x0020_name);
		if(rankName === "gen.") return systematicPath;
	};
	
	return systematicPath;
};

exports.getSystematicPath = getSystematicPath;
// Updates all genera with correct systematic path and currentuse idx
exports.updateAllSystematicsById = function(req, res) {
	Taxon.findAll({
		where: 
			models.Sequelize.or(
				{ RankName:  "genus"},
				{ RankName:  "gen."}
			)
		
			
		
	})
		.then(function(taxa) {
			
			return soap.createClientAsync(wsdl).then(function(client) {
				
				Promise.promisifyAll(client)
				Promise.reduce(taxa, function(previous, taxon) {
					return client.NameByKeyAsync({
						NameKey: taxon.FunIndexNumber
					}).then(function(result) {

						var r = result[0].NameByKeyResult.NewDataSet.IndexFungorum;

						if (r !== undefined) {
							console.log("updating "+taxon.TaxonName+ " FunId: "+r.RECORD_x0020_NUMBER);
							/*
							var FunIndexCurrUseNumber = r.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
							if (FunIndexCurrUseNumber) {
								taxon.FunIndexCurrUseNumber = FunIndexCurrUseNumber;
							};
							*/
							var FunIndexTypificationNumber = parseInt(r.TYPIFICATION_x0020_DETAILS);
							
							if (FunIndexTypificationNumber) {
								taxon.FunIndexTypificationNumber = FunIndexTypificationNumber;
							} else {
								taxon.FunIndexTypificationNumber = 0;
							}
							
							taxon.SystematicPath = getSystematicPath(r, "gen.");
							
						//	taxon.RankName = r.INFRASPECIFIC_x0020_RANK;
							return taxon.save();
						} else {
							return 1;
						};


					});
				}, 0)
					.then(function(total) {
						res.status(200).json("Processed " + taxa.length + " taxa");
					}).
				catch (function(err) {
					console.log(JSON.stringify(err))
				});

			});

		}).catch (handleError(res));
};

// Updates all supergeneric with correct systematic path and currentuse idx
exports.updateAllSystematicsByTypificationId = function(req, res) {
	Taxon.findAll({
		where: 
			models.Sequelize.and(
				{ FunIndexTypificationNumber: {ne: 0} }, { SystematicPath: { like: ",%"} },
			      { RankName: {ne: "genus"} },
			      { RankName: {ne: "species"} },
				{ RankName: {ne: "supergeneric rank"} }
			    )
		
	})
		.then(function(taxa) {
			
			return soap.createClientAsync(wsdl).then(function(client) {
				
				Promise.promisifyAll(client)
				Promise.reduce(taxa, function(previous, taxon) {
					return client.NameByKeyAsync({
						NameKey: taxon.FunIndexTypificationNumber
					}).then(function(result) {

						var r = result[0].NameByKeyResult.NewDataSet.IndexFungorum;
						console.log("Processing: _id "+taxon._id);
						if (r !== undefined) {
							/*
							var FunIndexCurrUseNumber = r.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
							if (FunIndexCurrUseNumber) {
								taxon.FunIndexCurrUseNumber = FunIndexCurrUseNumber;
							};
							*/
							taxon.SystematicPath = getSystematicPath(r, taxon.RankName);
						//	taxon.RankName = r.INFRASPECIFIC_x0020_RANK;
							return taxon.save();
						} else {
							return 1;
						};


					});
				}, 0)
					.then(function(total) {
						res.status(200).json("Processed " + taxa.length + " taxa");
					}).
				catch (function(err) {
					console.log(JSON.stringify(err))
				});

			});

		}).catch (handleError(res));
};

function findCurrentUseTaxon(soapResult){
	
	if( Object.prototype.toString.call( soapResult ) === '[object Array]' ) {
		var currentTaxon = _.find(soapResult, function(taxon) {
  		  	return taxon.RECORD_x0020_NUMBER === taxon.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
		});
		
		return (currentTaxon !== undefined) ?  currentTaxon : soapResult[0];
		
	} else {
		return soapResult;
	}
	
}
// Updates all genera with correct systematic path and currentuse idx
exports.updateAllFUNIdsByNameMatch = function(req, res) {
	var where = (req.params.taxonrank === "genus") ? models.Sequelize.and(
			      { RankName: "sp."},
				{ FunIndexNumber: { gt: 1000000} }
				
			    ) : {
			RankName: "supergeneric rank"
		};
	/*
	Taxon.findAll({
		where: {
			RankName: "supergeneric rank"
		}
	}) */
	Taxon.findAll({
		where: where
	})
		.then(function(taxa) {
			
			return soap.createClientAsync(wsdl).then(function(client) {
				
				Promise.promisifyAll(client);
		
				Promise.reduce(taxa, function(previous, taxon) {
					var nameParts = taxon.FullName.split(" ");
					return client.NameSearchAsync({
						SearchText: nameParts[0] +" "+ nameParts[1],
						AnywhereInText: false,
						MaxNumber: 25
					}).then(function(result) {
						
						var r = findCurrentUseTaxon(result[0].NameSearchResult.NewDataSet.IndexFungorum);

						if (r !== undefined) {
							console.log("updating "+taxon.TaxonName+ " FunId: "+r.RECORD_x0020_NUMBER);
							var FunIndexCurrUseNumber = r.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
							
							if (FunIndexCurrUseNumber) {
								taxon.FunIndexCurrUseNumber = FunIndexCurrUseNumber;
							} else {
								taxon.FunIndexCurrUseNumber = 0;
							}
							
							var FunIndexTypificationNumber = parseInt(r.TYPIFICATION_x0020_DETAILS);
							
							if (FunIndexTypificationNumber) {
								taxon.FunIndexTypificationNumber = FunIndexTypificationNumber;
							} else {
								taxon.FunIndexTypificationNumber = 0;
							}
							taxon.FullName = r.NAME_x0020_OF_x0020_FUNGUS +" "+r.AUTHORS;
							taxon.Author = r.AUTHORS; 
							taxon.RankName = r.INFRASPECIFIC_x0020_RANK;
							taxon.FunIndexNumber = r.RECORD_x0020_NUMBER;
							taxon.GUID = r.UUID;
							return taxon.save();
						} else {
							return 1;
						};


					});
				}, 0)
					.then(function(total) {
						res.status(200).json("Processed " + taxa.length + " taxa");
					}).
				catch (function(err) {
					console.log(JSON.stringify(err))
				});

			});

		}).catch (handleError(res));
};


// Updates all genera with correct systematic path and currentuse idx
exports.syncAllFUNIdsByNameMatch = function(req, res) {
	Taxon.findAll({
		where: models.Sequelize.and(
				{ FunIndexNumber: 0 },
			      { RankName: {ne: "genus"} },
			{ RankName: {ne: "gen."} },
			      { RankName: {ne: "species"} },
			{ RankName: {ne: "sp."} },
				{ RankName: {ne: "supergeneric rank"} }
			    )
	})
		.then(function(taxa) {
			
			return soap.createClientAsync(wsdl).then(function(client) {
				
				Promise.promisifyAll(client);
		
				Promise.reduce(taxa, function(previous, taxon) {
					return client.NameSearchAsync({
						SearchText: taxon.TaxonName,
						AnywhereInText: false,
						MaxNumber: 25
					}).then(function(result) {
						
						var r = findCurrentUseTaxon(result[0].NameSearchResult.NewDataSet.IndexFungorum);

						if (r !== undefined) {
							console.log("updating "+taxon.TaxonName+ " FunId: "+r.RECORD_x0020_NUMBER);
							var FunIndexCurrUseNumber = r.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
							
							if (FunIndexCurrUseNumber) {
								taxon.FunIndexCurrUseNumber = FunIndexCurrUseNumber;
							} else {
								taxon.FunIndexCurrUseNumber = 0;
							}
							
							var FunIndexTypificationNumber = parseInt(r.TYPIFICATION_x0020_DETAILS);
							
							if (FunIndexTypificationNumber) {
								taxon.FunIndexTypificationNumber = FunIndexTypificationNumber;
							} else {
								taxon.FunIndexTypificationNumber = 0;
							}
							taxon.FullName = r.NAME_x0020_OF_x0020_FUNGUS +" "+r.AUTHORS;
							taxon.Author = r.AUTHORS; 
							taxon.GUID = r.UUID;
							taxon.FunIndexNumber = r.RECORD_x0020_NUMBER;
							taxon.Author = r.AUTHORS;
							return taxon.save();
						} else {
							return 1;
						};


					});
				}, 0)
					.then(function(total) {
						res.status(200).json("Processed " + taxa.length + " taxa");
					}).
				catch (function(err) {
					console.log(JSON.stringify(err))
				});

			});

		}).catch (handleError(res));
};

// Updates all genera with correct systematic path and currentuse idx
exports.syncAllFUNIdsByNameMatchForNewParentSpecies = function(req, res) {
	Taxon.findAll({
		where: models.Sequelize.and(
				{ isAccepted: 0 },
			     
			{ RankName:  "species" }

			    )
	})
		.then(function(taxa) {
			
			return soap.createClientAsync(wsdl).then(function(client) {
				
				Promise.promisifyAll(client);
		
				Promise.reduce(taxa, function(previous, taxon) {
					return client.NameSearchAsync({
						SearchText: taxon.FullName,
						AnywhereInText: false,
						MaxNumber: 25
					}).then(function(result) {
						
						var r = findCurrentUseTaxon(result[0].NameSearchResult.NewDataSet.IndexFungorum);

						if (r !== undefined) {
							console.log("updating "+taxon.TaxonName+ " FunId: "+r.RECORD_x0020_NUMBER);
							var FunIndexCurrUseNumber = r.CURRENT_x0020_NAME_x0020_RECORD_x0020_NUMBER;
							
							if (FunIndexCurrUseNumber) {
								taxon.FunIndexCurrUseNumber = FunIndexCurrUseNumber;
							} else {
								taxon.FunIndexCurrUseNumber = 0;
							}
							
							var FunIndexTypificationNumber = parseInt(r.TYPIFICATION_x0020_DETAILS);
							
							if (FunIndexTypificationNumber) {
								taxon.FunIndexTypificationNumber = FunIndexTypificationNumber;
							} else {
								taxon.FunIndexTypificationNumber = 0;
							}
							
							taxon.FullName = r.NAME_x0020_OF_x0020_FUNGUS +" "+r.AUTHORS;
							taxon.FunIndexNumber = r.RECORD_x0020_NUMBER;
							taxon.Author = r.AUTHORS;
							taxon.GUID = r.UUID;
							return taxon.save();
						} else {
							return 1;
						};


					});
				}, 0)
					.then(function(total) {
						res.status(200).json("Processed " + taxa.length + " taxa");
					}).
				catch (function(err) {
					console.log(JSON.stringify(err))
				});

			});

		}).catch (handleError(res));
};

// Creates a new taxon in the DB.
exports.create = function(req, res) {
	var parent_id = req.body.Parent._id;
	var newTaxon = req.body;
	newTaxon.parent_id = parent_id;
	newTaxon.Path = "XXXXX"; // a dummy path which will be changed once we have the ID - everything is wrapped in a transaction.
	models.sequelize.transaction(function(t) {

		return Taxon.find({
			where: {
				_id: parent_id
			}
		}, {
			transaction: t
		})
			.then(function(parent) {

				return [Taxon.create(newTaxon, {
					transaction: t
				}), parent];
			})
			.spread(function(taxon, parent) {
				taxon.SystematicPath = parent.SystematicPath + ", " + taxon.TaxonName;
				taxon.Path = parent.Path + ", " + taxon._id;
				taxon.accepted_id = taxon._id;
				return taxon.save({
					transaction: t
				});
			})
			.then(function(taxon) {
		
				return [taxon, models.TaxonAttributes.create({
	
					taxon_id: taxon._id
			
				})]
			})
			.spread(function(taxon) {
		
				return [taxon, models.TaxonLog.create({
					eventname: "New taxon",
					description: taxon.FullName + " (id: "+taxon._id+") was added to our database. Datasource: "+newTaxon.dataSource,
					user_id: req.user._id,
					taxon_id: taxon._id
			
				})]
			})


	})
	
		.spread(function(taxon) {
			return Taxon.find({
				where: {
					_id: taxon._id
				},
				include: [{
						model: models.TaxonImages,
						as: "images"
					}, {
						model: models.Taxon,
						as: "synonyms"
					}, {
						model: models.Taxon,
						as: "Parent"
					}, {
						model: models.Taxon,
						as: "acceptedTaxon"
					}, {
						model: models.TaxonAttributes,
						as: "attributes"
					}

				]
			})
		})

	.then(function(taxon) {

		return res.status(201).json(taxon);
	})
		.
	catch (handleError(res));
};



// Updates an existing taxon in the DB.
exports.update = function(req, res) {

	Taxon.find({
		where: {
			_id: req.params.id
		}
	})
		.then(function(taxon) {
			if (!taxon) {
				res.send(404);
			};
			var oldFunIndexNumber = taxon.FunIndexNumber;
			for (var i = 0; i < taxon.attributes.length; i++) {
				taxon.set(taxon.attributes[i], req.body[taxon.attributes[i]])
			}
			var changed = taxon.changed().toString();

			return [taxon.save(), changed, oldFunIndexNumber];

		})
		.spread(function(taxon, changed, oldFunIndexNumber) {
			if (changed.indexOf("FunIndexNumber") > -1) {
				if(taxon.FunIndexNumber === null){
					return [taxon, models.TaxonLog.create({
					eventname: "Detached Index Fungorum record",
					description: "Old record was: " + oldFunIndexNumber,
					user_id: req.user._id,
					taxon_id: taxon._id

				})]
			} else {
				return [taxon, models.TaxonLog.create({
				eventname: "Changed Index Fungorum record",
				description: "Old record was: " + oldFunIndexNumber + " , new record is: " + taxon.FunIndexNumber,
				user_id: req.user._id,
				taxon_id: taxon._id
					})]
			}
			
			} else if (changed.indexOf("RankID") > -1) {
				return [taxon, models.TaxonLog.create({
					eventname: "Changed taxonomic rank",
					description: "New rank: " + taxon.RankName + ", rank level: " + taxon.RankID,
					user_id: req.user._id,
					taxon_id: taxon._id

				})]
			} else if (changed.indexOf("accepted_id") > -1) {
				return [taxon, models.TaxonLog.create({
					eventname: "Detached synonym",
					description: taxon.FullName + " is no longer a synonym ",
					user_id: req.user._id,
					taxon_id: taxon._id

				})]
			} else {
				return [taxon, models.TaxonLog.create({
					eventname: "Updated taxon",
					description: "Field(s): " + changed,
					user_id: req.user._id,
					taxon_id: taxon._id

				})]
			}

		})
		.spread(function(taxon) {
			
			return Taxon.find({
				where: {
					_id: taxon._id
				},
				include: [{
						model: models.TaxonAttributes,
						as: "attributes"
					},
					{
						model: models.TaxonImages,
						as: "images"
					}, {
						model: models.Taxon,
						as: "synonyms"
					}, {
						model: models.Taxon,
						as: "Parent"
					}, {
						model: models.Taxon,
						as: "acceptedTaxon"
					}

				]
			})
		})
		.then(function(taxon) {

			return res.status(200).json(taxon);

		})

	.
	catch (handleError(res));
};


// Deletes a taxon from the DB.
exports.destroy = function(req, res) {
	Taxon.find({
		where: {
			_id: req.params.id
		}
	})
		.then(handleEntityNotFound(res))
		.then(removeEntity(res))
		.
	catch (handleError(res));
};

exports.addSynonym = function(req, res) {
	var synonymTaxon = req.body;

	models.sequelize.transaction(function(t) {
		return Taxon.update({
			accepted_id: req.params.id,
			vernacularname_dk_id: null
		} /* set attributes' value */ , {
			where: {
				$or: [{accepted_id: synonymTaxon._id}, {_id: synonymTaxon._id}]
			}
		} /* where criteria */ , {
			transaction: t
		})

		.then(function(affectedRows) {

			return models.TaxonLog.create({
				eventname: "Synonymised taxon",
				description: "New accepted taxon id: " + req.params.id + ", affected " + affectedRows + " taxa (including existing synonyms of " + synonymTaxon.FullName + ")",
				user_id: req.user._id,
				taxon_id: synonymTaxon._id

			}, {
				transaction: t
			});


		})
			.then(function() {

				return models.TaxonRedListData.count({
						where: {
							taxon_id: req.params.id
						}

					},

					{
						transaction: t
					}
				);

			})
			.then(function(count) {

				if (count === 0){
					return models.TaxonRedListData.update({
						taxon_id: req.params.id
					}, {
						where: {
							taxon_id: synonymTaxon._id
						}
					}, {
						transaction: t
					})}
					else return true;
			})
			.then(function() {

					return models.TaxonDKnames.update({
						taxon_id: req.params.id
					}, {
						where: {
							taxon_id: synonymTaxon._id
						}
					}, {
						transaction: t
					})
			})
			.then(function() {

					return models.TaxonImages.update({
						taxon_id: req.params.id
					}, {
						where: {
							taxon_id: synonymTaxon._id
						}
					}, {
						transaction: t
					})
			})
			.then(function() {
		
					return [models.TaxonAttributes.find({
						where : {taxon_id: req.params.id}
					}, {
						transaction: t
					}),
					models.TaxonAttributes.find({
											where: {taxon_id: synonymTaxon._id}
										}, {
											transaction: t
										})
				]
			})
			.spread(function(taxonAttrs, synonymTaxonAttrs){
				
				_.each(synonymTaxonAttrs.dataValues, function(value, key) {
					
					if(key !== 'taxon_id' && value && !taxonAttrs.get(key)){
						taxonAttrs.set(key, value);
						
						
					}
				});
				
				return taxonAttrs.save({
											transaction: t
										})
			})

	})

	.then(function() {
		return Taxon.find({
			where: {
				_id: synonymTaxon._id
			},
			include: [{
					model: models.TaxonAttributes,
					as: "attributes"
				},{
					model: models.TaxonImages,
					as: "images"
				},{
					model: models.TaxonDKnames,
					as: "Vernacularname_DK"
				},
				 {
					model: models.Taxon,
					as: "synonyms"
				}, {
					model: models.Taxon,
					as: "Parent"
				}, {
					model: models.Taxon,
					as: "acceptedTaxon"
				}

			]

		})
	})
		.then(function(taxon) {

			return res.status(201).json(taxon);

		}).
	catch (handleError(res));
};


exports.setCurrentDkName = function(req, res) {
	
	  models.sequelize.transaction(function(t) {
		return Taxon.find({
			where: {
				_id: req.params.id
			},
			
			include: [{
				model: models.TaxonDKnames,
				as: "Vernacularname_DK"
			}, {
				model: models.TaxonDKnames,
				as: "DanishNames"
			}],
			
			transaction: t
		})
			.then(function(taxon) {
				
				
				var newname = (req.body.vernacularname_dk) ? req.body.vernacularname_dk : "null";
				
				var oldname = (taxon.Vernacularname_DK) ? taxon.Vernacularname_DK.vernacularname_dk : undefined;
				

				
				//var oldname = taxon.Vernacularname_DK.vernacularname_dk.toString();
				//var newname = req.body;
				taxon.vernacularname_dk_id = (req.body._id) ? req.body._id : null;
					

					
					return [taxon.save({
								transaction: t
							})
							, oldname, newname];
					
				


			})
			
			.spread(function(taxon, oldval, newval) {
		
				return models.TaxonLog.create({
					eventname: "Changed danish name",
					description: "New name: " + newval + ", old name: " + oldval + ".",
					user_id: req.user._id,
					taxon_id: req.params.id

				}, {
					transaction: t
				});


			})
			


	})
	
		.then(function() {

			return res.status(201).json();

		}).
	catch (handleError(res));
};




exports.setParent = function(req, res) {

	var parentTaxon = req.body;

	Taxon.find({
		where: {
			_id: req.params.id
		},
		include: [{
			model: models.Taxon,
			as: "Parent"
		}]
	}).then(function(taxon) {
		
		if (taxon.Parent === null) {
			
			taxon.SystematicPath = parentTaxon.SystematicPath + ", " + taxon.TaxonName;
			taxon.Path = parentTaxon.Path + ", " + taxon._id;
		//	taxon.parent_id = parentTaxon._id; // setting the parent_id to avoid null pointer
			return taxon.save();
		} else {
			
			return taxon
		}

	})
		.then(function(taxon) {

			var c_id = taxon._id; // Child ID
			var np_id = parentTaxon._id; // New parent ID
			var op_id = (taxon.Parent !== null ) ? taxon.Parent._id : null; // Old parent ID

			
			var set_new_parent_sql = "CALL SET_NEW_PARENT( " + c_id + " , " + op_id + " , " + np_id + " )";

			
			return [taxon, parentTaxon, taxon.Parent, models.sequelize.query(set_new_parent_sql)];

		})
		.spread(function(taxon, newParent, oldParent) {
			var description;
			if(oldParent === null){
				description = taxon.FullName + " (id: "+taxon._id+") was orphant but has now got parent : "+newParent.FullName+ " (id: "+newParent._id+")"
			} else {
				description = taxon.FullName + " (id: "+taxon._id+") changed parent from "+oldParent.FullName+ " (id: "+oldParent._id+") to "+newParent.FullName+ " (id: "+newParent._id+")";
			};
			
			return models.TaxonLog.create({
				eventname: "Changed parent taxon",
				description: description,
				user_id: req.user._id,
				taxon_id: taxon._id
				
			})
		})
		.then(function() {
			
			return Taxon.find({
				where: {
					_id: req.params.id
				},
				include: [{
						model: models.TaxonImages,
						as: "images"
					}, {
						model: models.Taxon,
						as: "synonyms"
					}, {
						model: models.Taxon,
						as: "Parent"
					}, {
						model: models.Taxon,
						as: "acceptedTaxon"
					}

				]
			})
		})
		.then(function(taxon) {

			return res.status(201).json(taxon);
		})
		.
	catch (function(err) {
		console.log(JSON.stringify(err))
		return res.status(500).send(err);
	});
};

exports.numberOfDanishSpecies = function(req, res){
	
	var sql;
	if(req.params.id !=="all"){
		sql = "SELECT tc._id, tc.FullName, COUNT(*) as count FROM Taxon tc, Taxon t, TaxonAttributes ta WHERE t._id=ta.taxon_id AND ta.PresentInDK =1 AND t.Path LIKE CONCAT((SELECT Path FROM Taxon where _id=:taxon_id), '%')" 
+"AND tc.parent_id= :taxon_id AND t.Path LIKE CONCAT(tc.Path, '%')"
		+"AND t.RankID = 10000 GROUP BY tc.FullName";
	} else {
	/*	sql= `SELECT SUM(y.numTaxa) as count FROM (SELECT GREATEST(CAST(ta.PresentInDK  AS UNSIGNED), IF(x.childCount IS NULL, 0, x.childCount)) AS numTaxa FROM 
(Taxon t JOIN
TaxonAttributes ta ON ta.taxon_id=t._id AND t.RankID=10000 AND t.accepted_id=t._id )
LEFT JOIN
	(SELECT p._id, COUNT(c._id) as childCount FROM Taxon p, Taxon c, TaxonAttributes ca  WHERE ca.taxon_id = c._id AND c.parent_id=p._id AND ca.PresentInDK =1 AND c._id=c.accepted_id AND p.RankID=10000 GROUP BY p._id) x ON t._id = x._id ) y`;
		*/
		sql="SELECT COUNT(*) as count FROM Taxon t, TaxonAttributes ta where t.RankID = 10000 AND t._id=ta.taxon_id AND t.accepted_id=t._id AND ta.PresentInDK =1 ";
	}
	return models.sequelize.query(
		sql,
  { replacements: { taxon_id: req.params.id }, type: models.sequelize.QueryTypes.SELECT }
).then(function(result) {
	
	if (req.params.id ==="all" && req.query.cached) {
		console.log("Caching species count")
		
		return cacheResultByUrl(req, JSON.stringify(result)).then(function() {
			return res.status(200).json(result)
		})
	} else {
		return res.status(200).json(result)
	}
	
	 
})

}

exports.higherTaxa = function(req, res) {
	
	return models.sequelize.query(
		"SELECT t2._id FROM Taxon t JOIN Taxon t2 ON t.Path LIKE CONCAT(t2.Path, '%') AND t._id = :taxon_id",
  { replacements: { taxon_id: req.params.id }, type: models.sequelize.QueryTypes.SELECT }
)
.then(function(ids) {
	var idArr = _.map(ids, function(e){
		return e._id
	})
	
return Taxon.findAll({where: {_id : { $in: idArr}, RankID: {$gt: 0}}, order: 'RankID ASC', include: [{
				model: models.TaxonDKnames,
				as: "Vernacularname_DK"
			}]})
	
	
 
})
.then(function(taxa) {

	return res.status(200).json(taxa);
 
})
	.
catch (function(err) {
	console.log(JSON.stringify(err))
	return res.status(500).send(err);
});
	
}

// This generates the taxon tree with count of dk taxa at species level or lower and adds it to the cache
exports.generateAndGetDkTree = function(req, res) {

	if(!(req.body && req.body.action === "generateDkTree")) {
		res.status(404).send("Not found");
	}
	else {

	var replacements = {
			childRankOffset : 9999
		};
		var sql = 'SELECT t._id, t.Path, t.parent_id, t.RankID,t.FullName, t.TaxonName,dkn.vernacularname_dk,  count(tc._id) as count'
		+' from Taxon tc JOIN (Taxon t LEFT JOIN TaxonDKnames dkn ON t.vernacularname_dk_id=dkn._id) JOIN TaxonAttributes a '
		+' ON a.taxon_id=tc._id'
		+' AND a.PresentInDK = 1 AND tc._id=tc.accepted_id AND tc.Path LIKE CONCAT(t.Path, "%") AND tc.RankId > :childRankOffset  AND t.RankID < 5001'
		+' GROUP BY t._id ORDER BY t.RankID ASC, t.Fullname ASC';

	return models.sequelize.query(sql, {
		replacements: replacements,
		type: models.sequelize.QueryTypes.SELECT
	})

	.then(function(result) {
		return cacheResult(req, JSON.stringify(result)).then(function() {
			return res.status(200).json(result)
		})
		
	})
		.catch(handleError(res));
	}
};

// if the cachekey is provided and no root is given, the generated tree will be fetched from the cache (see the redis hook in the route)
exports.showDkTree = function(req, res) {



	var	sql = 'SELECT t._id, t.FullName, dkn.vernacularname_dk, t.RankID, COUNT(tc._id) as count FROM'
		+' ((Taxon t LEFT JOIN TaxonDKnames dkn ON t.vernacularname_dk_id=dkn._id) JOIN TaxonAttributes ta ON t._id=ta.taxon_id)'
		+' LEFT JOIN (SELECT _id, parent_id from Taxon t2, TaxonAttributes t2a WHERE t2._id=t2a.taxon_id AND t2a.PresentInDK = true) tc'
		+' ON t._id=tc.parent_id WHERE t.parent_id = :root AND (ta.PresentInDK = 1 OR tc._id IS NOT NULL) GROUP BY t._id ORDER BY t.FullName;';
	
	
	

	return models.sequelize.query(sql, {
		replacements: {root: req.query.root},
		type: models.sequelize.QueryTypes.SELECT
	})

	.then(function(result) {
		return res.status(200).json(result)
		
	}).catch(handleError(res));

};

exports.showTree = function(req, res) {

	var where = (req.params.rootid) ? {_id: req.params.rootid} :  {
			TaxonName: "Life"
		}

	var query = {
		where: where,
		attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
		include: [{
			model: models.Taxon,
			attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
			as: "children",
			include: [{
				model: models.Taxon,
				attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
				as: "children",
				include: [{
					model: models.Taxon,
					attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
					as: "children",
					include: [{
						model: models.Taxon,
						attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
						as: "children",
						include: [{
							model: models.Taxon,
							attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
							as: "children",
							include: [{
								model: models.Taxon,
								attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
								as: "children",
								include: [{
									model: models.Taxon,
									attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
									as: "children",
									include: [{
										model: models.Taxon,
										attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
										as: "children",
										include: [{
											model: models.Taxon,
											attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
											as: "children",
											include: [{
												model: models.Taxon,
												attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
												as: "children",
												include: [{
													model: models.Taxon,
													attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
													as: "children",
													include: [{
														model: models.Taxon,
														attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
														as: "children",
														include: [{
															model: models.Taxon,
															attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
															as: "children",
															include: [{
																model: models.Taxon,
																attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
																as: "children",
																include: [{
																	model: models.Taxon,
																	attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
																	as: "children",
																	include: [{
																		model: models.Taxon,
																		attributes: ['_id', 'parent_id', 'TaxonName', 'RankName', 'RankID', 'accepted_id'],
																		as: "children"
																	}]
																}]
															}]
														}]
													}]
												}]
											}]
										}]
									}]
								}]
							}]
						}]
					}]
				}]
			}]
		}]
	};

	Taxon.findOne(query)
		.then(responseWithResult(res))
		.
	catch (handleError(res));

};

exports.showMycoKeyCharacters = function(req, res) {
	
	//TaxonTag
	models.Taxon.find({
		where: {
			_id: req.params.id
		},
		include: [ {
				model: models.MycokeyCharacterView,
				as: 'character1'
			}

		]
	})
		.then(handleEntityNotFound(res))
		.then(function(taxon){
			return res.status(200).json(taxon.character1);
		})
		.
	catch (handleError(res));
};

exports.addMycoKeyCharacter= function(req, res) {

	var BoolValue = (req.body.Type === "Real") ? 0 : 1;
	var RealValueMin = (req.body.RealValueMin) ? req.body.RealValueMin : 0;
	var RealValueMax = (req.body.RealValueMax) ? req.body.RealValueMax : 0;
//return res.status(200).json(req.body);
 var sql = "INSERT INTO GenusCharacters (`Character`, `GenusID`, `xxxx`,`BoolValue`, Probability, mark, CodedForSpecies, `check`, `RealValueMax`, `RealValueMin`, `taxon_id`) "
+"	SELECT :CharacterID, 0, 1, :BoolValue, 100, 0, 0, 0, :RealValueMax, :RealValueMin,  t._id "
+" FROM Taxon t, Taxon tp WHERE tp._id = :id AND t.Path LIKE CONCAT(tp.Path, '%') ON DUPLICATE KEY UPDATE taxon_id=taxon_id, RealValueMin = :RealValueMin, RealValueMax = :RealValueMax";

return models.sequelize.query(sql,
  { replacements: { CharacterID: req.body.CharacterID, id: req.params.id , BoolValue: BoolValue, RealValueMin: RealValueMin, RealValueMax: RealValueMax}, type: models.sequelize.QueryTypes.INSERT }
).then(function(inserted) {

  return models.Taxon.find({where: {_id:req.params.id}})
})
.then(function(taxon) {

 return  models.TaxonLog.create({
			eventname: "MycoKey character added",
			description: "Character '"+req.body['Short text UK']+"' (id: "+req.body['CharacterID']+") added to "+ taxon.FullName + " (id: "+taxon._id+") and its descendants.",
			user_id: req.user._id,
			taxon_id: taxon._id
	
		})
})

.then(function(inserted) {

  return res.status(201).json(inserted);
}).catch(handleError(res));


};

exports.deleteMycoKeyCharacter = function(req, res) {


 var sql = "DELETE FROM GenusCharacters "
+"	WHERE `Character` = :CharacterID AND taxon_id IN "
+"(SELECT t._id FROM Taxon t, Taxon tp WHERE tp._id = :id AND t.Path LIKE CONCAT(tp.Path, '%'))";

return models.sequelize.query(sql,
  { replacements: { CharacterID: parseInt(req.params.characterid), id: parseInt(req.params.id) }, type: models.sequelize.QueryTypes.DELETE }
)
.then(function(inserted) {

  return [models.Taxon.find({where: {_id:req.params.id}}), models.MycokeyCharacter.find({where: {CharacterID:req.params.characterid}})]
})
.spread(function(taxon, character) {

 return  models.TaxonLog.create({
			eventname: "MycoKey character removed",
			description: "Character '"+character['Short text UK']+"' (id: "+character['CharacterID']+") removed from "+ taxon.FullName + " (id: "+taxon._id+") and its descendants.",
			user_id: req.user._id,
			taxon_id: taxon._id
	
		})
})
.then(function(deleted) {

  return res.status(200).json(deleted);
}).catch(handleError(res));

};

exports.importMycoKeyCharacters = function(req, res){
	
	var sql = "REPLACE INTO GenusCharacters (`Character`, `GenusID`, `xxxx`,`BoolValue`, Probability, mark, CodedForSpecies, `check`, `RealValueMax`, `RealValueMin`, `taxon_id`) "
	+ "SELECT c.`Character`, 0, 1, c.BoolValue, c.Probability, c.mark, c.CodedForSpecies, c.`check`, c.RealValueMax, c.RealValueMin,  t._id"
	+"  FROM GenusCharacters c, Taxon t, Taxon tp WHERE c.taxon_id = :importfromid AND tp._id = :taxonId AND t._id <> c.taxon_id AND t.Path LIKE CONCAT(tp.Path, '%')"
	
	return models.sequelize.query(sql,
	  { replacements: { taxonId: req.params.id, importfromid: req.body._id }, type: models.sequelize.QueryTypes.INSERT }
	)
	
	
	.then(function(inserted) {
		
	  return models.Taxon.find({
		where: {
			_id: req.params.id
		},
		include: [ {
				model: models.MycokeyCharacterView,
				as: 'character1'
			}

		]
	})
	})
	.then(function(taxon) {
	
	 return  [taxon, models.TaxonLog.create({
				eventname: "MycoKey characters imported",
				description: taxon.character1.length+ " MycoKey characters imported from "+req.body.FullName+" (id: "+req.body._id+")  to "+ taxon.FullName + " (id: "+taxon._id+") and its descendants.",
				user_id: req.user._id,
				taxon_id: taxon._id
	
			})]
	})
	.spread(function(taxon) {
		
	  return res.status(201).json(taxon.character1);
	}).catch(handleError(res));
	
}

