'use strict';

var express = require('express');
var controller = require('./TaxonRedListData.controller');
var auth = require('../../../auth/auth.service');

var router = express.Router();

router.get('/', controller.index);
router.get('/categories', controller.categories);
router.get('/:id', controller.show);
router.post('/', auth.hasRole('taxonomyadmin'), controller.create);
router.put('/:id', auth.hasRole('taxonomyadmin'), controller.update);
router.patch('/:id', auth.hasRole('taxonomyadmin'), controller.update);
router.delete('/:id', auth.hasRole('taxonomyadmin'), controller.destroy);

module.exports = router;
