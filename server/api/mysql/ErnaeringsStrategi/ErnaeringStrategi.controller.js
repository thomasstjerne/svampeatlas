/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /things              ->  index
 * POST    /things              ->  create
 * GET     /things/:id          ->  show
 * PUT     /things/:id          ->  update
 * DELETE  /things/:id          ->  destroy
 */

'use strict';

var _ = require('lodash');
var models = require('../')
var ErnaeringsStrategi = models.ErnaeringsStrategi;

function handleError(res, statusCode) {
  statusCode = statusCode || 500;
  return function(err) {
	  
    res.status(statusCode).send(err);
  };
}

function responseWithResult(res, statusCode) {
  statusCode = statusCode || 200;
  return function(entity) {
    if (entity) {
      return res.json(statusCode, entity);
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

// Get list of things
exports.index = function(req, res) {
  ErnaeringsStrategi.findAll()
    .then(responseWithResult(res))
    .catch(handleError(res));
};

// Get a single thing
exports.show = function(req, res) {
  ErnaeringsStrategi.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(responseWithResult(res))
    .catch(handleError(res));
};

// Creates a new thing in the DB.
exports.create = function(req, res) {
  ErnaeringsStrategi.create(req.body)
    .then(responseWithResult(res, 201))
    .catch(handleError(res));
};

// Updates an existing thing in the DB.
exports.update = function(req, res) {
  if (req.body._id) {
    delete req.body._id;
  }
  ErnaeringsStrategi.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(saveUpdates(req.body))
    .then(responseWithResult(res))
    .catch(handleError(res));
};

// Deletes a thing from the DB.
exports.destroy = function(req, res) {
  ErnaeringsStrategi.find({
    where: {
      _id: req.params.id
    }
  })
    .then(handleEntityNotFound(res))
    .then(removeEntity(res))
    .catch(handleError(res));
};



exports.showTaxonNutritionStrategies = function(req, res) {
	
	//ErnaeringsStrategi
	models.Taxon.find({
		where: {
			_id: req.params.id
		},
		include: [ {
				model: models.ErnaeringsStrategi,
				as: 'nutritionstrategies'
			}

		]
	})
		.then(handleEntityNotFound(res))
		.then(function(taxon){
			return res.status(200).json(taxon.nutritionstrategies);
		})
		.
	catch (handleError(res));
};

exports.addTaxonNutritionStrategy= function(req, res) {

models.TaxonErnaeringsStrategi.create({ernaeringsstrategi_id: req.body._id, taxon_id: req.params.id})
    .then(responseWithResult(res, 201))
    .catch(handleError(res));
};



exports.deleteTaxonNutritionStrategy = function(req, res) {

models.TaxonErnaeringsStrategi.find({
    where: {
     taxon_id: req.params.id,
	ernaeringsstrategi_id: 	req.params.nutritionstrategyid
    }
  })
  .then(handleEntityNotFound(res))
  .then(function(taxonErnaeringsStrategi){
	  return models.TaxonErnaeringsStrategi.destroy({where: taxonErnaeringsStrategi.dataValues});
  })
  .then(function(){
	 
	  return res.status(204).send()
  })
  .catch(handleError(res));
};
