'use strict';

angular.module('svampeatlasApp')
	.factory('Determination', function($resource) {

		// Public API here
		return $resource('/api/determinations/:id', {
			id: '@_id'
		}, {
			update: {
				method: 'PUT' // this method issues a PUT request
			},
			'remove': {
				method: 'DELETE',
				params: {
					id: '@_id'
				},
				url: '/api/determinations/:id'
			},
			'updateValidation': {
				method: 'PUT',
				params: {
					id: '@_id'
				},
				url: '/api/determinations/:id/validation'
			},
			'updateConfidence': {
				method: 'PUT',
				params: {
					id: '@_id'
				},
				url: '/api/determinations/:id/confidence'
			},
			'addVote': {
				method: 'POST',
				params: {
					id: '@_id'
				},
				url: '/api/determinations/:id/votes',
				interceptor: {
				        response: function(response) {
				          response.resource.$httpHeaders = response.headers;
				          return response.resource;
				        }
				      }
			},
			'removeVote': {
				method: 'DELETE',
				params: {
					id: '@_id',
					userid: 'userid'
				},
				url: '/api/determinations/:id/votes/:userid',
				interceptor: {
				        response: function(response) {
				          response.resource.$httpHeaders = response.headers;
				          return response.resource;
				        }
				      }
			},
			'getLogs': {
				method: 'GET',
				params: {
					id: '@_id'
				},
				url: '/api/determinations/:id/logs',
				isArray: true
			}
			
		});

	});
