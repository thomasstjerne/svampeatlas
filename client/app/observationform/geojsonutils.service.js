'use strict';
angular.module('svampeatlasApp')
	.factory('GeoJsonUtils', function() {
		
		function isNumber(e) {
			return !isNaN(parseFloat(e)) && isFinite(e)
		}
		
		var DKbounds = {
			"type": "Feature",
			"properties": {},
			"geometry": {
				"type": "Polygon",
				"coordinates": [
					[
						[8.0419921875, 55.06578688659172],
						[8.50341796875, 54.92714186454645],
						[9.38232421875, 54.7246201949245],
						[9.6240234375, 54.80068486732233],
						[10.3271484375, 54.71192884840614],
						[10.810546875, 54.635697306063854],
						[11.05224609375, 54.67383096593114],
						[11.755371093749998, 54.470037612805754],
						[12.0849609375, 54.508326500290735],
						[12.7001953125, 54.85131525968606],
						[13.623046875, 54.93976575865891],
						[15.27099609375, 54.93976575865891],
						[15.314941406249998, 55.45394132943305],
						[14.831542968749998, 55.50374985927514],
						[14.1943359375, 55.25407706707272],
						[12.744140625, 55.25407706707272],
						[12.54638671875, 55.41030721005218],
						[12.7001953125, 55.52863052257191],
						[12.85400390625, 55.60938408809366],
						[12.89794921875, 55.696163893908825],
						[12.63427734375, 55.83831352210821],
						[12.59033203125, 55.92458580482951],
						[12.645263671875, 55.986091533808384],
						[12.617797851562498, 56.07510136019262],
						[12.205810546875, 56.27081138841454],
						[11.942138671875, 56.447313059250334],
						[11.9805908203125, 56.69545799260797],
						[11.53564453125, 57.32652122521709],
						[10.349121093749998, 58.112714441253125],
						[8.1298828125, 57.24339368551155],
						[7.690429687499999, 56.108810038002154],
						[8.0419921875, 55.06578688659172]
					]
				]
			}
		};

		function toRadians(num){
			return num*180/Math.PI ;
		};

		var gju = {};
		
		
		gju.distance = function(p1, p2){
			var lat1 = p1.decimalLatitude; 
			var lat2 = p2.decimalLatitude; 
			var lon1 = p1.decimalLongitude; 
			var lon2 = p2.decimalLongitude; 
			var R = 6371e3; // meters
			var lat1Radians = toRadians(lat1);
			var lat2Radians = toRadians(lat2);
			var deltaLat = toRadians(lat2-lat1);
			var deltaLon = toRadians(lon2-lon1);

			var a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
			        Math.cos(lat1Radians) * Math.cos(lat2Radians) *
			        Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

			var d = R * c;
			return d;
		},
	
		gju.exifGpsDataToLatLong = function(GPSLatitude,GPSLatitudeRef, GPSLongitude,GPSLongitudeRef ) {
			
			
			var t = !1,
				n = parseInt(GPSLatitude[0]);
			0 > n && (t = !0);
			var o = Math.abs(GPSLatitude[1]),
				a = Math.abs(GPSLatitude[2]);
			t && (o = -1 * o, a = -1 * a);
			var l = n + o / 60 + a / 3600;
			var decimalLatitude = parseFloat(l).toFixed(8), t = !1;
			if(GPSLatitudeRef === "S"){
				decimalLatitude = 0-decimalLatitude;
			}
			var i = parseInt(GPSLongitude[0]);
			0 > i && (t = !0);
			var m = Math.abs(GPSLongitude[1]),
				r = Math.abs(GPSLongitude[2]);
			isNumber(i) || (i = 0), isNumber(m) || (m = 0), isNumber(r) || (r = 0), t && (m = -1 * m, r = -1 * r);
			var d = i + m / 60 + r / 3600;
			var decimalLongitude = parseFloat(d).toFixed(8);
			if(GPSLongitudeRef === "W"){
				decimalLongitude = 0-decimalLongitude;
			}
			return [decimalLatitude, decimalLongitude]
		}
		

		// adapted from http://www.kevlindev.com/gui/math/intersection/Intersection.js
		gju.lineStringsIntersect = function(l1, l2) {
			var intersects = [];
			for (var i = 0; i <= l1.coordinates.length - 2; ++i) {
				for (var j = 0; j <= l2.coordinates.length - 2; ++j) {
					var a1 = {
						x: l1.coordinates[i][1],
						y: l1.coordinates[i][0]
					},
						a2 = {
							x: l1.coordinates[i + 1][1],
							y: l1.coordinates[i + 1][0]
						},
						b1 = {
							x: l2.coordinates[j][1],
							y: l2.coordinates[j][0]
						},
						b2 = {
							x: l2.coordinates[j + 1][1],
							y: l2.coordinates[j + 1][0]
						},
						ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
						ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
						u_b = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
					if (u_b != 0) {
						var ua = ua_t / u_b,
							ub = ub_t / u_b;
						if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
							intersects.push({
								'type': 'Point',
								'coordinates': [a1.x + ua * (a2.x - a1.x), a1.y + ua * (a2.y - a1.y)]
							});
						}
					}
				}
			}
			if (intersects.length == 0) intersects = false;
			return intersects;
		}

		// Bounding Box

		function boundingBoxAroundPolyCoords(coords) {
			var xAll = [],
				yAll = []

			for (var i = 0; i < coords[0].length; i++) {
				xAll.push(coords[0][i][1])
				yAll.push(coords[0][i][0])
			}

			xAll = xAll.sort(function(a, b) {
				return a - b
			})
			yAll = yAll.sort(function(a, b) {
				return a - b
			})

			return [[xAll[0], yAll[0]], [xAll[xAll.length - 1], yAll[yAll.length - 1]]]
		}

		gju.pointInBoundingBox = function(point, bounds) {
			return !(point.coordinates[1] < bounds[0][0] || point.coordinates[1] > bounds[1][0] || point.coordinates[0] < bounds[0][1] || point.coordinates[0] > bounds[1][1])
		}

		// Point in Polygon
		// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html#Listing the Vertices

		function pnpoly(x, y, coords) {
			var vert = [
				[0, 0]
			]

			for (var i = 0; i < coords.length; i++) {
				for (var j = 0; j < coords[i].length; j++) {
					vert.push(coords[i][j])
				}
				vert.push(coords[i][0])
				vert.push([0, 0])
			}

			var inside = false
			for (var i = 0, j = vert.length - 1; i < vert.length; j = i++) {
				if (((vert[i][0] > y) != (vert[j][0] > y)) && (x < (vert[j][1] - vert[i][1]) * (y - vert[i][0]) / (vert[j][0] - vert[i][0]) + vert[i][1])) inside = !inside
			}

			return inside
		}

		gju.pointInPolygon = function(p, poly) {
			var coords = (poly.type == "Polygon") ? [poly.coordinates] : poly.coordinates

			var insideBox = false
			for (var i = 0; i < coords.length; i++) {
				if (gju.pointInBoundingBox(p, boundingBoxAroundPolyCoords(coords[i]))) insideBox = true
			}
			if (!insideBox) return false

			var insidePoly = false
			for (var i = 0; i < coords.length; i++) {
				if (pnpoly(p.coordinates[1], p.coordinates[0], coords[i])) insidePoly = true
			}

			return insidePoly
		}

		// support multi (but not donut) polygons
		gju.pointInMultiPolygon = function(p, poly) {
			var coords_array = (poly.type == "MultiPolygon") ? [poly.coordinates] : poly.coordinates

			var insideBox = false
			var insidePoly = false
			for (var i = 0; i < coords_array.length; i++) {
				var coords = coords_array[i];
				for (var j = 0; j < coords.length; j++) {
					if (!insideBox) {
						if (gju.pointInBoundingBox(p, boundingBoxAroundPolyCoords(coords[j]))) {
							insideBox = true
						}
					}
				}
				if (!insideBox) return false
				for (var j = 0; j < coords.length; j++) {
					if (!insidePoly) {
						if (pnpoly(p.coordinates[1], p.coordinates[0], coords[j])) {
							insidePoly = true
						}
					}
				}
			}

			return insidePoly
		}

		gju.numberToRadius = function(number) {
			return number * Math.PI / 180;
		}

		gju.numberToDegree = function(number) {
			return number * 180 / Math.PI;
		}

		// written with help from @tautologe
		gju.drawCircle = function(radiusInMeters, centerPoint, steps) {
			var center = [centerPoint.coordinates[1], centerPoint.coordinates[0]],
				dist = (radiusInMeters / 1000) / 6371,
				// convert meters to radiant
				radCenter = [gju.numberToRadius(center[0]), gju.numberToRadius(center[1])],
				steps = steps || 15,
				// 15 sided circle
				poly = [
					[center[0], center[1]]
				];
			for (var i = 0; i < steps; i++) {
				var brng = 2 * Math.PI * i / steps;
				var lat = Math.asin(Math.sin(radCenter[0]) * Math.cos(dist) + Math.cos(radCenter[0]) * Math.sin(dist) * Math.cos(brng));
				var lng = radCenter[1] + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(radCenter[0]),
					Math.cos(dist) - Math.sin(radCenter[0]) * Math.sin(lat));
				poly[i] = [];
				poly[i][1] = gju.numberToDegree(lat);
				poly[i][0] = gju.numberToDegree(lng);
			}
			return {
				"type": "Polygon",
				"coordinates": [poly]
			};
		}

		// assumes rectangle starts at lower left point
		gju.rectangleCentroid = function(rectangle) {
			var bbox = rectangle.coordinates[0];
			var xmin = bbox[0][0],
				ymin = bbox[0][1],
				xmax = bbox[2][0],
				ymax = bbox[2][1];
			var xwidth = xmax - xmin;
			var ywidth = ymax - ymin;
			return {
				'type': 'Point',
				'coordinates': [xmin + xwidth / 2, ymin + ywidth / 2]
			};
		}

		// from http://www.movable-type.co.uk/scripts/latlong.html
		gju.pointDistance = function(pt1, pt2) {
			var lon1 = pt1.coordinates[0],
				lat1 = pt1.coordinates[1],
				lon2 = pt2.coordinates[0],
				lat2 = pt2.coordinates[1],
				dLat = gju.numberToRadius(lat2 - lat1),
				dLon = gju.numberToRadius(lon2 - lon1),
				a = Math.pow(Math.sin(dLat / 2), 2) + Math.cos(gju.numberToRadius(lat1)) * Math.cos(gju.numberToRadius(lat2)) * Math.pow(Math.sin(dLon / 2), 2),
				c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			return (6371 * c) * 1000; // returns meters
		}

		// checks if geometry lies entirely within a circle
		// works with Point, LineString, Polygon
		gju.geometryWithinRadius = function(geometry, center, radius) {
			if (geometry.type == 'Point') {
				return gju.pointDistance(geometry, center) <= radius;
			} else if (geometry.type == 'LineString' || geometry.type == 'Polygon') {
				var point = {};
				var coordinates;
				if (geometry.type == 'Polygon') {
					// it's enough to check the exterior ring of the Polygon
					coordinates = geometry.coordinates[0];
				} else {
					coordinates = geometry.coordinates;
				}
				for (var i in coordinates) {
					point.coordinates = coordinates[i];
					if (gju.pointDistance(point, center) > radius) {
						return false;
					}
				}
			}
			return true;
		}

		// adapted from http://paulbourke.net/geometry/polyarea/javascript.txt
		gju.area = function(polygon) {
			var area = 0;
			// TODO: polygon holes at coordinates[1]
			var points = polygon.coordinates[0];
			var j = points.length - 1;
			var p1, p2;

			for (var i = 0; i < points.length; j = i++) {
				var p1 = {
					x: points[i][1],
					y: points[i][0]
				};
				var p2 = {
					x: points[j][1],
					y: points[j][0]
				};
				area += p1.x * p2.y;
				area -= p1.y * p2.x;
			}

			area /= 2;
			return area;
		}

		// adapted from http://paulbourke.net/geometry/polyarea/javascript.txt
		gju.centroid = function(polygon) {
			var f, x = 0,
				y = 0;
			// TODO: polygon holes at coordinates[1]
			var points = polygon.coordinates[0];
			var j = points.length - 1;
			var p1, p2;

			for (var i = 0; i < points.length; j = i++) {
				var p1 = {
					x: points[i][1],
					y: points[i][0]
				};
				var p2 = {
					x: points[j][1],
					y: points[j][0]
				};
				f = p1.x * p2.y - p2.x * p1.y;
				x += (p1.x + p2.x) * f;
				y += (p1.y + p2.y) * f;
			}

			f = gju.area(polygon) * 6;
			return {
				'type': 'Point',
				'coordinates': [y / f, x / f]
			};
		};

		gju.simplify = function(source, kink) { /* source[] array of geojson points */
			/* kink	in metres, kinks above this depth kept  */
			/* kink depth is the height of the triangle abc where a-b and b-c are two consecutive line segments */
			kink = kink || 20;
			source = source.map(function(o) {
				return {
					lng: o.coordinates[0],
					lat: o.coordinates[1]
				}
			});

			var n_source, n_stack, n_dest, start, end, i, sig;
			var dev_sqr, max_dev_sqr, band_sqr;
			var x12, y12, d12, x13, y13, d13, x23, y23, d23;
			var F = (Math.PI / 180.0) * 0.5;
			var index = new Array(); /* aray of indexes of source points to include in the reduced line */
			var sig_start = new Array(); /* indices of start & end of working section */
			var sig_end = new Array();

			/* check for simple cases */

			if (source.length < 3) return (source); /* one or two points */

			/* more complex case. initialize stack */

			n_source = source.length;
			band_sqr = kink * 360.0 / (2.0 * Math.PI * 6378137.0); /* Now in degrees */
			band_sqr *= band_sqr;
			n_dest = 0;
			sig_start[0] = 0;
			sig_end[0] = n_source - 1;
			n_stack = 1;

			/* while the stack is not empty  ... */
			while (n_stack > 0) {

				/* ... pop the top-most entries off the stacks */

				start = sig_start[n_stack - 1];
				end = sig_end[n_stack - 1];
				n_stack--;

				if ((end - start) > 1) { /* any intermediate points ? */

					/* ... yes, so find most deviant intermediate point to
		        either side of line joining start & end points */

					x12 = (source[end].lng() - source[start].lng());
					y12 = (source[end].lat() - source[start].lat());
					if (Math.abs(x12) > 180.0) x12 = 360.0 - Math.abs(x12);
					x12 *= Math.cos(F * (source[end].lat() + source[start].lat())); /* use avg lat to reduce lng */
					d12 = (x12 * x12) + (y12 * y12);

					for (i = start + 1, sig = start, max_dev_sqr = -1.0; i < end; i++) {

						x13 = source[i].lng() - source[start].lng();
						y13 = source[i].lat() - source[start].lat();
						if (Math.abs(x13) > 180.0) x13 = 360.0 - Math.abs(x13);
						x13 *= Math.cos(F * (source[i].lat() + source[start].lat()));
						d13 = (x13 * x13) + (y13 * y13);

						x23 = source[i].lng() - source[end].lng();
						y23 = source[i].lat() - source[end].lat();
						if (Math.abs(x23) > 180.0) x23 = 360.0 - Math.abs(x23);
						x23 *= Math.cos(F * (source[i].lat() + source[end].lat()));
						d23 = (x23 * x23) + (y23 * y23);

						if (d13 >= (d12 + d23)) dev_sqr = d23;
						else if (d23 >= (d12 + d13)) dev_sqr = d13;
						else dev_sqr = (x13 * y12 - y13 * x12) * (x13 * y12 - y13 * x12) / d12; // solve triangle
						if (dev_sqr > max_dev_sqr) {
							sig = i;
							max_dev_sqr = dev_sqr;
						}
					}

					if (max_dev_sqr < band_sqr) { /* is there a sig. intermediate point ? */
						/* ... no, so transfer current start point */
						index[n_dest] = start;
						n_dest++;
					} else { /* ... yes, so push two sub-sections on stack for further processing */
						n_stack++;
						sig_start[n_stack - 1] = sig;
						sig_end[n_stack - 1] = end;
						n_stack++;
						sig_start[n_stack - 1] = start;
						sig_end[n_stack - 1] = sig;
					}
				} else { /* ... no intermediate points, so transfer current start point */
					index[n_dest] = start;
					n_dest++;
				}
			}

			/* transfer last point */
			index[n_dest] = n_source - 1;
			n_dest++;

			/* make return array */
			var r = new Array();
			for (var i = 0; i < n_dest; i++)
				r.push(source[index[i]]);

			return r.map(function(o) {
				return {
					type: "Point",
					coordinates: [o.lng, o.lat]
				}
			});
		}

		// http://www.movable-type.co.uk/scripts/latlong.html#destPoint
		gju.destinationPoint = function(pt, brng, dist) {
			dist = dist / 6371; // convert dist to angular distance in radians
			brng = gju.numberToRadius(brng);

			var lon1 = gju.numberToRadius(pt.coordinates[0]);
			var lat1 = gju.numberToRadius(pt.coordinates[1]);

			var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) +
				Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));
			var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) * Math.cos(lat1),
				Math.cos(dist) - Math.sin(lat1) * Math.sin(lat2));
			lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // normalise to -180..+180º

			return {
				'type': 'Point',
				'coordinates': [gju.numberToDegree(lon2), gju.numberToDegree(lat2)]
			};
		};
		
		gju.direction = function(endpoint, startpoint) {
		   var x1 = endpoint.lat ;
		   var y1 =  endpoint.lng;
		   var x2 = startpoint.lat;
		    var y2 = startpoint.lng;

		    var radians = getAtan2((y1 - y2), (x1 - x2));

		    function getAtan2(y, x) {
		        return Math.atan2(y, x);
		    };

		    var compassReading = radians * (180 / Math.PI);

		    var coordNames = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
		    var coordIndex = Math.round(compassReading / 45);
		    if (coordIndex < 0) {
		        coordIndex = coordIndex + 8
		    };

		    return coordNames[coordIndex]; // returns the coordinate value
		}

		gju.inDK = function(point) {
			return Boolean(this.pointInPolygon({
					"type": "Point",
					"coordinates": [point.lng, point.lat]
				},
				DKbounds.geometry))
		};

		return gju;

	})
