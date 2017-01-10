'use strict';

var express = require('express');
var controller = require('./SimilarTaxa.controller');
var auth = require('../../../auth/auth.service');
var router = express.Router();

router.get('/', controller.index);
router.get('/:id', controller.show);
router.post('/', auth.hasRole('taxonomyadmin'), controller.addSimilarTaxon);
router.put('/:id', auth.hasRole('taxonomyadmin'), controller.updateSimilarTaxon);
router.delete('/:id', auth.hasRole('taxonomyadmin'), controller.deleteSimilarTaxon);

module.exports = router;