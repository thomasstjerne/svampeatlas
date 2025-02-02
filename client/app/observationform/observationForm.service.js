'use strict';
angular.module('svampeatlasApp')
	.factory('ObservationFormService', function($mdDialog, ObservationStateService, $rootScope) {

			return {
				show: function(ev, row, duplicateRecord) {

					ObservationStateService.set(row);
					if(duplicateRecord){
						ObservationStateService.duplicateRecord = true;
					}
					$mdDialog.show({
						controller: 'ObservationFormCtrl',
						controllerAs: 'ctrl',
						templateUrl: 'app/observationform/observation-form-modal.tpl.html',
						parent: angular.element(document.body),
						targetEvent: ev,
						clickOutsideToClose: true,
						fullscreen: true,
						onRemoving: function(element, removePromise){
							ObservationStateService.reset();
							/*
							removePromise.then(function(){
								$rootScope.$broadcast('dialogRemoved', row)
							}) */
						}
					})



				}
			};




		}

	)
