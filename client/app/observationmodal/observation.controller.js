'use strict';

angular.module('svampeatlasApp')
	.controller('ObservationCtrl', ['$scope', '$rootScope', '$window', 'Auth', 'ErrorHandlingService', '$mdPanel', '$mdDialog',  'Observation', 'Determination', '$mdMedia', '$mdToast', 'leafletData', 'MapBox', 'KMS','$timeout', 'DeterminationModalService', 'ObservationFormService', '$translate', '$state', '$stateParams', 'appConstants', 'ObservationStateService', '$cookies', 'ObservationImage', 'Taxon', '$mdExpansionPanel', 'preloader', 'VotingService','ValidatorToolsService','DeterminationLogModalService','ValidatorNotificationModalService','DnaSequenceModalService', 'SearchService','$q',
		function($scope, $rootScope, $window, Auth, ErrorHandlingService, $mdPanel, $mdDialog,  Observation, Determination, $mdMedia, $mdToast, leafletData, MapBox, KMS, $timeout, DeterminationModalService, ObservationFormService, $translate, $state, $stateParams, appConstants, ObservationStateService, $cookies, ObservationImage, Taxon, $mdExpansionPanel, preloader, VotingService, ValidatorToolsService, DeterminationLogModalService, ValidatorNotificationModalService, DnaSequenceModalService, SearchService, $q) {
			var that = this;
			this.DeterminationModalService = DeterminationModalService;
			this.DeterminationLogModalService = DeterminationLogModalService;
			this.DnaSequenceModalService = DnaSequenceModalService;
			this.ValidatorNotificationModalService = ValidatorNotificationModalService;
			$scope.moment = moment;
			$scope.Determination = Determination;
			$scope.AcceptedDeterminationScore = appConstants.AcceptedDeterminationScore;
			$scope.ProbableDeterminationScore = appConstants.ProbableDeterminationScore;
			
			$scope.openMenu = function($mdOpenMenu, ev) {

				$mdOpenMenu(ev);
			};
			$scope.$translate = $translate;
			$scope.$state = $state;
			
			$scope.openCapsule = function(id) {
				var win = window.open("/api/observations/" + id + "/capsule");
				win.print();
			}
			
			$scope.getBackgroundStyle = function(img){
		
		
				var url = appConstants.baseurl+appConstants.thumborUrl+"500x0/"
	
				+appConstants.baseurl+appConstants.imageurl + img.name + ".JPG";

		
			    return {'background-image':  'url('+url+')', 'background-size': 'cover'};
			}

			$scope.toggleHide = function(img, hide) {

				img.hide = hide;
				ObservationImage.update({
					id: img._id
				}, img).$promise.then(function() {

					var txt = (img.hide) ? $translate.instant('Foto usynligt på taxonside') : $translate.instant('Foto synligt på taxonside')
					$scope.showSimpleToast(txt)

				})
			}



			$scope.addToSpeciesPage = function(img) {

				var taxonImage = {
					taxon_id: $scope.obs.PrimaryDetermination.Taxon.acceptedTaxon._id,
					collectionNumber: "DMS-" + $scope.obs._id,
					uri: appConstants.baseurl + "/uploads/" + img.name + ".JPG",
					thumburi: appConstants.baseurl + "/uploads/" + img.name + ".JPG",
					photographer: img.Photographer.name,
					country: ($scope.obs.Locality) ? "Denmark" : $scope.obs.GeoNames.countryName

				}

				Taxon.addImage({
					id: $scope.obs.PrimaryDetermination.Taxon.acceptedTaxon._id
				}, taxonImage).$promise.then(function(image) {

					$mdDialog.cancel();
					$state.go($state.$current, null, {
						reload: true
					})


				})

			}


			$scope.showUser = function(id) {
				$mdDialog.cancel();
				$state.go('userstats', {
					userid: id
				});
			}


			$scope.editRecord = function(asDuplicate) {
				$mdDialog.hide($scope.obs).then(function() {
					ObservationFormService.show(null, $scope.obs, asDuplicate)
				})
			}
			

			//	$scope.referencedDataRow = referencedDataRow;
			$scope.User = Auth.getCurrentUser();
			$scope.isLoggedIn = Auth.isLoggedIn;
			$scope.Auth = Auth;
			$scope.showSimpleToast = function(text) {

				$mdToast.show(
					$mdToast.simple()
					.textContent(text)
					.position("top right")
					.parent(document.querySelectorAll('.speeddial-parent'))
					.hideDelay(3000)
				);
			};
			$scope.openImage = function(img) {
				window.open($scope.imageurl + img.name + '.JPG', img.name, 'width=1200,height=800,resizable=1');

			}
			$scope.deleteObs = function(ev, obs) {

				//var displayedId = obs.PrimaryUser.Initialer + ((obs.observationDateAccuracy !== 'invalid') ? (obs.observationDate.split('-')[0]) : '') + '-' + obs._id;
				var displayedId = 'DMS-' + obs._id;

				var confirm = $mdDialog.confirm()
					.title($translate.instant('Vil du slette') + ' ' + displayedId + '?')
					.textContent($translate.instant('Fundet og alle tilhørende data vil blive permanent slettet fra databasen.'))
					.ariaLabel($translate.instant('Slet fund'))
					.targetEvent(ev)
					.ok($translate.instant('Slet'))
					.cancel($translate.instant('Fortryd'));
				$mdDialog.show(confirm).then(function() {
					Observation.delete({
						id: obs._id
					}).$promise.then(function() {
						$rootScope.$broadcast('observation_deleted', $scope.obs);
						$scope.showSimpleToast($translate.instant('Record') + ' ' + displayedId + ' ' + $translate.instant('slettet.'))
					})
				});
			};

			$scope.updateValidation = ValidatorToolsService.updateValidation;
			
			$scope.setPrimaryDetermination = ValidatorToolsService.setPrimaryDetermination;
			$scope.deleteDetermination = ValidatorToolsService.deleteDetermination;
			$scope.updateConfidence = ValidatorToolsService.updateConfidence;
			$scope.deleteDnaSequence = ValidatorToolsService.deleteDnaSequence;
			
			$scope.focusNewComment = function(){
				
				angular.element( document.querySelector( '#newComment' ) ).focus()
				
			}
		
			$scope.postComment = function(mentions) {
				that.sendingComment = true;
				Observation.postComment({
						id: $scope.obs._id
					}, {
						content: that.newComment,
						mentions: mentions
						
					})
					.$promise.then(function(comment) {
						$scope.obs.Forum.push(comment);
						delete that.newComment;

						that.sendingComment = false;
						

						$rootScope.$broadcast('observation_updated', $scope.obs);
					})
					.catch(function(err) {
						that.sendingComment = false;
						ErrorHandlingService.handle500();
					})

			};



			$scope.mapsettings = {
				center: {
					lat: 56,
					lng: 11,
					zoom: 6
				},
				paths: {},
				drawControl: true,
				markers: {

				},
				layers: {
					baselayers: {
						osm: {
							name: $translate.instant('Kort'),
							url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
							type: 'xyz'
						},
						OpenTopoMap: {
							name: 'OpenTopoMap',

							url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',

							type: 'xyz',
							layerOptions: {

								attribution: 'Tiles &copy; opentopomap.org'
							}

						}
					



					}
				}
			};


			MapBox.getTicket().then(function(ticket){
				
				$scope.mapsettings.layers.baselayers.mapbox_outdoors = {
							name: 'Mapbox Outdoors',
							url: 'https://api.mapbox.com/styles/v1/mapbox/outdoors-v9/tiles/256/{z}/{x}/{y}?access_token=' + ticket,
							type: 'xyz'

						},
						$scope.mapsettings.layers.baselayers.mapbox_satelite = {
							name: 'Mapbox Satelite',
							url: 'https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v9/tiles/256/{z}/{x}/{y}?access_token=' + ticket,
							type: 'xyz'

						};
			});
			
			KMS.getTicket().then(function(ticket){
				
				$scope.mapsettings.layers.baselayers.topo_25 = {
							name: "DK 4cm kort",
							type: 'wms',
							visible: true,
							url: "https://kortforsyningen.kms.dk/topo_skaermkort",
							layerOptions: {
								layers: "topo25_klassisk",
								servicename: "topo25",
								version: "1.1.1",
								request: "GetMap",
								format: "image/jpeg",
								service: "WMS",
								styles: "default",
								exceptions: "application/vnd.ogc.se_inimage",
								jpegquality: "80",
								attribution: "Indeholder data fra GeoDatastyrelsen, WMS-tjeneste",
								ticket: ticket
							}
						};
						$scope.mapsettings.layers.baselayers.luftfoto = {
							name: "DK luftfoto",
							type: 'wms',
							visible: true,
							url: "https://kortforsyningen.kms.dk/topo_skaermkort",
							layerOptions: {
								layers: "orto_foraar",
								servicename: "orto_foraar",
								version: "1.1.1",
								request: "GetMap",
								format: "image/jpeg",
								service: "WMS",
								styles: "default",
								exceptions: "application/vnd.ogc.se_inimage",
								jpegquality: "80",
								attribution: "Indeholder data fra GeoDatastyrelsen, WMS-tjeneste",
								ticket: ticket
							}
						};
			});
			



			$scope.changeBaseLayer = function(key) {
				leafletData.getMap('observationdetailmap').then(function(map) {
					leafletData.getLayers().then(function(layers) {
						_.each(layers.baselayers, function(layer) {
							map.removeLayer(layer);
						});
						map.addLayer(layers.baselayers[key]);
					});
				});
			};



			$scope.$mdMedia = $mdMedia;
			$scope.getDate = function(observationDate, observationDateAccuracy) {
				if (observationDate === undefined) {
					return "";
				}
				var splitted = observationDate.split(" ")[0].split("-");

				if (observationDateAccuracy === 'month') {
					//console.log("spl "+parseInt(splitted[1]))
					return moment.months()[parseInt(splitted[1]) - 1] + " " + splitted[0];
				} else if (observationDateAccuracy === 'year') {
					return splitted[0];
				} else if (observationDateAccuracy === 'invalid') {
					return "ingen dato"
				}

			}

			$scope.addingUser = false;
			$scope.addFinder = function(obs, usr) {
				$scope.addingUser = true;
				Observation.addUser({
					id: obs._id
				}, usr).$promise.then(function() {
					$scope.addingUser = false;
					obs.users.push(usr)
					$scope.showSimpleToast(usr.name + " " + $translate.instant('tilføjet som finder'))

				})


			}
			$scope.removeFinder = function(obs, usr) {
				$scope.addingUser = true;
				$scope.addUserPromise = Observation.removeUser({
					id: obs._id,
					userid: usr._id
				}).$promise.then(function() {
					$scope.addingUser = false;
					_.remove(obs.users, function(u) {
						return u._id === usr._id
					});
					$scope.showSimpleToast(usr.name + " " + $translate.instant('fjernet fra findere'))

				})

			}



			var obsid = ($stateParams.observationid) ? $stateParams.observationid : ObservationStateService.get()._id;

			$scope.userIsFinder = function(usr) {
				if($scope.obs && $scope.obs.users)
				{var found = false;
				for (var i = 0; i < $scope.obs.users.length; i++) {
					if (usr._id === $scope.obs.users[i]._id) found = true;
				};
				return found;}
				else {
					return false
				}
			}
			
			function capitalizeFirstLetter(string) {
				return string.charAt(0).toUpperCase() + string.slice(1);
			}

			Observation.get({
				id: obsid
			}).$promise.then(initObservation);

			function initObservation(obs) {
				$scope.obs = obs;
				if(obs.Images && obs.Images.length >0){
					preloader.preloadImages( [obs], obs.Images.length);
					
				}
				var taxon = (obs.PrimaryDetermination.Taxon.acceptedTaxon.Vernacularname_DK) ? capitalizeFirstLetter(obs.PrimaryDetermination.Taxon.acceptedTaxon.Vernacularname_DK.vernacularname_dk) + " (" + obs.PrimaryDetermination.Taxon.acceptedTaxon.FullName + ")" : obs.PrimaryDetermination.Taxon.acceptedTaxon.FullName;
				var date =  new Date(obs.observationDate);
				var date_ = (obs.observationDateAccuracy === 'day') ? date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear()+', ' : '';
				var loc = "";
				if (obs.Locality) {
					loc = obs.Locality.name
				} else if (obs.GeoNames) {
					loc = obs.GeoNames.name + ", " + obs.GeoNames.adminName1 + ", " + obs.GeoNames.countryName
				};
				$rootScope.title = taxon + ", " + date_  + loc;
				$mdExpansionPanel().waitFor('determinationsPanel').then(function (instance) { instance.expand();});
				$mdExpansionPanel().waitFor('commentsPanel').then(function (instance) { instance.expand();});


				// Check currentusers vote status on determinations:
				if(Auth.isLoggedIn()){
				for (var i = 0; i < obs.Determinations.length; i++) {

					for (var j = 0; j < obs.Determinations[i].Votes.length; j++) {
						if (obs.Determinations[i].Votes[j].user_id === $scope.User._id) {
							if (parseInt(obs.Determinations[i].Votes[j].score) > 0) {
								obs.Determinations[i].vote = "up"
							} else if (parseInt(obs.Determinations[i].Votes[j].score) < 0) {
								obs.Determinations[i].vote = "down"
							}

						}
					}
				};
			};
				$scope.mapsettings.paths.circle = {
					type: "circle",
					radius: obs.accuracy,
					weight: 2,
					opacity: 0.25,
					latlngs: {
						lat: obs.decimalLatitude,
						lng: obs.decimalLongitude
					}
				}
				var zoom = parseInt(obs.accuracy) > 10000 ? 8 : parseInt(obs.accuracy) <= 10000 && parseInt(obs.accuracy) >= 5000 ? 10 : parseInt(obs.accuracy) < 5000 && parseInt(obs.accuracy) >= 2000 ? 12 : parseInt(obs.accuracy) < 2000 && parseInt(obs.accuracy) >= 500 ? 13 : parseInt(obs.accuracy) < 500 && parseInt(obs.accuracy) >= 250 ? 14 : parseInt(obs.accuracy) < 250 && parseInt(obs.accuracy) >= 100 ? 15 : 16;

				$scope.mapsettings.center = {
					lat: obs.decimalLatitude,
					lng: obs.decimalLongitude,
					zoom: zoom
				}

				$scope.mapsettings.markers.location = {
					lat: obs.decimalLatitude,
					lng: obs.decimalLongitude,
					draggable: false
				}


				leafletData.getMap('observationdetailmap').then(function(map) {
					if (obs.Locality) {

						$scope.changeBaseLayer("topo_25")


					}
					$timeout(function() {
						map.invalidateSize();
					});
					//map.invalidateSize(false)

				})
				
				if(Auth.hasRole('validator')){
					Observation.isOnFrontpage({
				id: $scope.obs._id
			}).$promise.then(function(obs){
				that.isAlreadyOnFrontpage = true;
			}).catch(function(err){
				// The observation is not on the frontpage
			})
			
			Observation.isOnFrontpageAsNewDK({
		id: $scope.obs._id
	}).$promise.then(function(obs){
		that.isAlreadyOnFrontpage = true;
	}).catch(function(err){
		// The observation is not on the frontpage
	})
				}

			};
			
			this.addToFrontPage = function(ttl, newDK){
				
				var method = (newDK) ? 'flagObservationForFrontpageAsNewDK':'flagObservationForFrontpage';
				
				Observation[method]({
				id: $scope.obs._id
			}, {ttl: ttl}).$promise.then(function(obs){
				that.isAlreadyOnFrontpage = true;
				$scope.showSimpleToast($translate.instant('Operation succeeded.'))
			}).catch(function(err){
				ErrorHandlingService.handle500();
			})
			};
			
			this.deleteFromFrontPage = function(){
				
				$q.all([Observation.removeObservationFromFrontpage({
				id: $scope.obs._id
			}).$promise, Observation.removeObservationFromFrontpageAsNewDK({
				id: $scope.obs._id
			}).$promise]).then(function(obs){
				$scope.showSimpleToast($translate.instant('Operation succeeded.'))
				that.isAlreadyOnFrontpage = false;
			})
			};
			
			$rootScope.$on('observation_updated', function(evt, obs) {
				if (obs._id === $scope.obs._id) {
					$scope.obs = Observation.get({
						id: obs._id
					}).$promise.then(initObservation)
				}
			});

			$scope.imageurl = appConstants.imageurl;
			$scope.baseUrl = appConstants.baseurl;
			$scope.loaded = {};
			$scope.failed = {};
			$scope.imageHasLoaded = function(img) {
				$scope.loaded[img] = true;

			};
			$scope.imageHasFailed = function(img) {
				$scope.failed[img] = true;

			};
			$scope.cancel = function() {
				ObservationStateService.reset();
				$mdDialog.cancel();
			};

			$scope.vote = function($event, det, upOrDown) {
				VotingService.vote($event, $scope.obs, det, upOrDown)
			}
		}
	])

