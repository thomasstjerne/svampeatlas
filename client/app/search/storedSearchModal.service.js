'use strict';
angular.module('svampeatlasApp')
	.factory('StoredSearchModalService', function($mdDialog, appConstants, $mdMedia, Auth) {

		return {
			show: function(ev, search, storedSearches, showStoredSearchFN) {
				$mdDialog.show({
					locals: {
						search: search,
						storedSearches : storedSearches,
						showStoredSearchFN : showStoredSearchFN
					},
					controller: ['$scope',  '$mdDialog', '$translate','StoredSearch', 
						function($scope,  $mdDialog, $translate, StoredSearch) {
							$scope.$translate = $translate;
							$scope.storedSearches = storedSearches;
							var that = this;
							$scope.$watch('name', function(newVal, oldVal){
								if(newVal && newVal !== oldVal){
									that.selectedSearch = "";
								}
							})
							$scope.cancel = function() {
								$mdDialog.hide()
									
							};
							
							$scope.saveStoredSearch = function(){
								if($scope.name){
									StoredSearch.save({
										search: JSON.stringify(search),
										name: $scope.name
									}).$promise.then(function(res){
										res.User = Auth.getCurrentUser();
										storedSearches.push(res)
										showStoredSearchFN(res)
										$mdDialog.hide()
									}).catch(function(err){
										alert(err)
									})
								} else if(that.selectedSearch !== ""){
									StoredSearch.update({
						id: that.selectedSearch
					}, {search: JSON.stringify(search)}).$promise.then(function(res){
										$mdDialog.hide()
							res.User = Auth.getCurrentUser();
							showStoredSearchFN(res)
						
									}).catch(function(err){
										alert(err)
									})
								
							}
							
						}
					}
					],
					controllerAs: 'ctrl',
					templateUrl: 'app/search/storedSearch.modal.tpl.html',
					parent: angular.element(document.body),
					targetEvent: ev,
					clickOutsideToClose: true,
					fullscreen: $mdMedia('xs')
				})
			}
		}


	})
