// Generated on 2015-05-05 using generator-angular-fullstack 2.0.13
'use strict';

module.exports = function(grunt) {
	var localConfig;
	try {
		localConfig = require('./server/config/local.env');
	} catch (e) {
		localConfig = {};
	}

	// Load grunt tasks automatically, when needed
	require('jit-grunt')(grunt, {
		express: 'grunt-express-server',
		useminPrepare: 'grunt-usemin',
		ngtemplates: 'grunt-angular-templates',
		cdnify: 'grunt-google-cdn',
		protractor: 'grunt-protractor-runner',
		buildcontrol: 'grunt-build-control',
		istanbul_check_coverage: 'grunt-mocha-istanbul'
	});

	// Time how long tasks take. Can help when optimizing build times
	require('time-grunt')(grunt);

	// Define the configuration for all the tasks
	grunt.initConfig({

		// Project settings
		pkg: grunt.file.readJSON('package.json'),
		yeoman: {
			// configurable paths
			client: require('./bower.json').appPath || 'client',
			dist: 'dist'
		},
		express: {
			options: {
				port: process.env.PORT || 9000
			},
			dev: {
				options: {
					script: 'server/app.js',
					debug: true
				}
			},
			prod: {
				options: {
					script: 'dist/server/app.js'
				}
			}
		},
		open: {
			server: {
				url: 'http://localhost:<%= express.options.port %>'
			}
		},
		watch: {
			injectJS: {
				files: [
					'<%= yeoman.client %>/{app,components}/**/*.js',
					'!<%= yeoman.client %>/{app,components}/**/*.spec.js',
					'!<%= yeoman.client %>/{app,components}/**/*.mock.js',
					'!<%= yeoman.client %>/app/app.js'
				],
				tasks: ['injector:scripts']
			},
			injectCss: {
				files: [
					'<%= yeoman.client %>/{app,components}/**/*.css'
				],
				tasks: ['injector:css']
			},
			mochaTest: {
				files: ['server/**/*.spec.js'],
				tasks: ['env:test', 'mochaTest']
			},
			jsTest: {
				files: [
					'<%= yeoman.client %>/{app,components}/**/*.spec.js',
					'<%= yeoman.client %>/{app,components}/**/*.mock.js'
				],
				tasks: ['newer:jshint:all', 'karma']
			},
			gruntfile: {
				files: ['Gruntfile.js']
			},
			livereload: {
				files: [
					'{.tmp,<%= yeoman.client %>}/{app,components}/**/*.css',
					'{.tmp,<%= yeoman.client %>}/{app,components}/**/*.html',
					'{.tmp,<%= yeoman.client %>}/{app,components}/**/*.js',
					'!{.tmp,<%= yeoman.client %>}{app,components}/**/*.spec.js',
					'!{.tmp,<%= yeoman.client %>}/{app,components}/**/*.mock.js',
					'<%= yeoman.client %>/assets/images/{,*//*}*.{png,jpg,jpeg,gif,webp,svg}'
				],
				options: {
					livereload: true
				}
			},
			express: {
				files: [
					'server/**/*.{js,json}'
				],
				tasks: ['express:dev', 'wait'],
				options: {
					livereload: true,
					nospawn: true //Without this option specified express won't be reloaded
				}
			}
		},

		// Make sure code styles are up to par and there are no obvious mistakes
		jshint: {
			options: {
				jshintrc: '<%= yeoman.client %>/.jshintrc',
				reporter: require('jshint-stylish')
			},
			server: {
				options: {
					jshintrc: 'server/.jshintrc'
				},
				src: [
					'server/**/*.js',
					'!server/**/*.{spec,integration}.js'
				]
			},
			serverTest: {
				options: {
					jshintrc: 'server/.jshintrc-spec'
				},
				src: ['server/**/*.{spec,integration}.js']
			},
			all: [
				'<%= yeoman.client %>/{app,components}/**/*.js',
				'!<%= yeoman.client %>/{app,components}/**/*.spec.js',
				'!<%= yeoman.client %>/{app,components}/**/*.mock.js'
			],
			test: {
				src: [
					'<%= yeoman.client %>/{app,components}/**/*.spec.js',
					'<%= yeoman.client %>/{app,components}/**/*.mock.js'
				]
			}
		},

		jscs: {
			options: {
				config: ".jscs.json"
			},
			main: {
				files: {
					src: [
						'<%= yeoman.client %>/app/**/*.js',
						'<%= yeoman.client %>/app/**/*.js',
						'server/**/*.js'
					]
				}
			}
		},

		// Empties folders to start fresh
		clean: {
			dist: {
				files: [{
					dot: true,
					src: [
						'.tmp',
						'<%= yeoman.dist %>/*',
						'!<%= yeoman.dist %>/.git*',
						'!<%= yeoman.dist %>/.openshift',
						'!<%= yeoman.dist %>/Procfile'
					]
				}]
			},
			server: '.tmp'
		},

		// Add vendor prefixed styles
		autoprefixer: {
			options: {
				browsers: ['last 1 version']
			},
			dist: {
				files: [{
					expand: true,
					cwd: '.tmp/',
					src: '{,*/}*.css',
					dest: '.tmp/'
				}]
			}
		},

		// Debugging with node inspector
		'node-inspector': {
			custom: {
				options: {
					'web-host': 'localhost'
				}
			}
		},

		// Use nodemon to run server in debug mode with an initial breakpoint
		nodemon: {
			debug: {
				script: 'server/app.js',
				options: {
					nodeArgs: ['--debug-brk'],
					env: {
						PORT: process.env.PORT || 9000
					},
					callback: function(nodemon) {
						nodemon.on('log', function(event) {
							console.log(event.colour);
						});

						// opens browser on initial server start
						nodemon.on('config:update', function() {
							setTimeout(function() {
								require('open')('http://localhost:8080/debug?port=5858');
							}, 500);
						});
					}
				}
			}
		},

		// Automatically inject Bower components into the app
		wiredep: {
			target: {
			//	src: '<%= yeoman.client %>/index.html',
				src: ['server/views/index.ejs', '<%= yeoman.client %>/index.html'],
				ignorePath: '<%= yeoman.client %>/',
				exclude: [/bootstrap-sass-official/, /bootstrap.js/, '/json3/', '/es5-shim/']
			}
		},

		// Renames files for browser caching purposes
		rev: {
			dist: {
				files: {
					src: [
						'<%= yeoman.dist %>/client/{,*/}*.js',
						'<%= yeoman.dist %>/client/{,*/}*.css',
						'<%= yeoman.dist %>/client/assets/images/{,*/}*.{png,jpg,jpeg,gif,webp,svg}',
						'<%= yeoman.dist %>/client/assets/svg/{,*/}*.{svg}',
						'!<%= yeoman.dist %>/client/assets/images/public/*.{png,jpg,jpeg,gif,webp,svg}',
						//   '<%= yeoman.dist %>/client/assets/fonts/*',
						'!<%= yeoman.dist %>/client/bower_components/*.{css,js}'
					]
				}
			}
		},

		// Reads HTML for usemin blocks to enable smart builds that automatically
		// concat, minify and revision files. Creates configurations in memory so
		// additional tasks can operate on them
		useminPrepare: {
			html: ['<%= yeoman.client %>/index.html'],
			options: {
				dest: '<%= yeoman.dist %>/client'
			}
		},

		// Performs rewrites based on rev and the useminPrepare configuration
		usemin: {
			html: ['<%= yeoman.dist %>/client/{,*/}*.html', '<%= yeoman.dist %>/server/views/index.ejs'],
			css: ['<%= yeoman.dist %>/client/{,*/}*.css', '<%= yeoman.dist %>/server/views/index.ejs'],
			js: ['<%= yeoman.dist %>/client/{,*/}*.js', '!<%= yeoman.dist %>/client/bower_components/*.{css,js}'],
			options: {
				assetsDirs: [

					'<%= yeoman.dist %>/client',
					'<%= yeoman.dist %>/client/assets',
					'<%= yeoman.dist %>/client/assets/images',
					'<%= yeoman.dist %>/client/assets/svg',
					'<%= yeoman.dist %>/client/assets/fonts'
				],
				// This is so we update image references in our ng-templates

				patterns: {
					js: [
						[/(assets\/images\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm, 'Update the JS to reference our revved images']
					],
					css: [
						[/(images\/.*?\.(?:gif|jpeg|jpg|png|webp|svg))/gm, 'Update the CSS to reference our revved images',
							 function(match) {

								return match.replace('images', '/assets/images');
							} 
						],
						[/(assets\/svg\/.*?\.(?:svg))/gm, 'Update the CSS to reference our revved images'],
						[/(..\/fonts\/)/g, 'Fix webfonts path',
							function(match) {
								return match.replace('../fonts/', '../assets/fonts/');
							}
						],
						[/(..\/bower_components\/font-awesome\/fonts\/)/g, 'Fix webfonts path',
							function(match) {
								return match.replace('../bower_components/font-awesome/fonts/', '../assets/fonts/');
							}
						],
						[/(..\/bower_components\/bootstrap\/fonts\/)/g, 'Fix webfonts path',
							function(match) {
								return match.replace('../bower_components/bootstrap/fonts/', '../assets/fonts/');
							}
						]

					]

				}
			}
		},

		uglify: {
			options: {
				mangle: {
					except: ['assets/images/public/mycena_crop.jpg','app/taxon/mycokeyimport-modal.tpl.html', 'app/searchresultlist/image.tpl.html', 'app/searchresultlist/forum.tpl.html', 'app/admin/modal.tpl.html', 'app/taxon/parent-modal.tpl.html', 'app/taxon/rank-modal.tpl.html', 'app/taxon/synonym-modal.tpl.html', 'app/taxon/funindex-modal.tpl.html', 'Resource', 'object', 'disabled', 'assets/images/flags/flags/shiny/16/Denmark.png', 'assets/images/flags/flags/shiny/16/United-Kingdom.png', 'taxonlayout-taxon', 'taxonlayout-taxonredlistdata', 'taxonlayout-taxonbooklayout']
				}
			}
		},


		// The following *-min tasks produce minified files in the dist folder
		imagemin: {
			dist: {
				files: [{
					expand: true,
					cwd: '<%= yeoman.client %>/assets/images',
					src: '{,*/}*.{png,jpg,jpeg,gif}',
					dest: '<%= yeoman.dist %>/client/assets/images'
				}, { // <-- CHANGE START
					expand: true,
					flatten: true,
					cwd: '<%= yeoman.client %>/bower_components',
					src: '**/*.{png,jpg,jpeg,gif}',
					dest: '<%= yeoman.dist %>/client/assets/images'
				}]
			}
		},

		svgmin: {
			dist: {
				files: [{
					expand: true,
					cwd: '<%= yeoman.client %>/assets/images',
					src: '{,*/}*.svg',
					dest: '<%= yeoman.dist %>/client/assets/images'
				},{
					expand: true,
					cwd: '<%= yeoman.client %>/assets/svg',
					src: '{,*/}*.svg',
					dest: '<%= yeoman.dist %>/client/assets/svg'
				}]
			}
		},

		// Allow the use of non-minsafe AngularJS files. Automatically makes it
		// minsafe compatible so Uglify does not destroy the ng references
		ngAnnotate: {
			dist: {
				files: [{
					expand: true,
					cwd: '.tmp/concat',
					src: '*/**.js',
					dest: '.tmp/concat'
				}]
			}
		},

		// Package all the html partials into a single javascript payload
		ngtemplates: {
			options: {
				// This should be the name of your apps angular module
				module: 'svampeatlasApp',
				htmlmin: {
					collapseBooleanAttributes: true,
					collapseWhitespace: false,
					removeAttributeQuotes: true,
					removeEmptyAttributes: true,
					removeRedundantAttributes: true,
					removeScriptTypeAttributes: true,
					removeStyleLinkTypeAttributes: true
				},
				usemin: 'app/app.js'
			},
			main: {
				cwd: '<%= yeoman.client %>',
				src: ['{app,components}/**/*.html'],
				dest: '.tmp/templates.js'
			},
			tmp: {
				cwd: '.tmp',
				src: ['{app,components}/**/*.html'],
				dest: '.tmp/tmp-templates.js'
			}
		},

		// Replace Google CDN references
		cdnify: {
			dist: {
				html: ['<%= yeoman.dist %>/client/*.html']
			}
		},

		// Copies remaining files to places other tasks can use
		copy: {
			dist: {
				files: [{
					expand: true,
					dot: true,
					cwd: '<%= yeoman.client %>',
					dest: '<%= yeoman.dist %>/client',
					src: [
						'*.{ico,png,txt}',
						'.htaccess',
						//    'bower_components/**/*',
						'assets/images/{,*/}*.{webp}',
						'assets/fonts/**/*',
						'assets/svg/*',
						'index.html'
					]
				}, {
					expand: true,
					cwd: '.tmp/images',
					dest: '<%= yeoman.dist %>/client/assets/images',
					src: ['generated/*']
				}, {
					expand: true,
					dest: '<%= yeoman.dist %>',
					src: [
						'package.json',
						'server/**/*'
					]
				}, {
					// include font-awesome webfonts
					expand: true,
					dot: true,
					cwd: '<%= yeoman.client %>/bower_components/font-awesome',
					src: ['fonts/*.*'],
					dest: '<%= yeoman.dist %>/client/assets'
				}, {
					// include bootstrap webfonts
					expand: true,
					dot: true,
					cwd: '<%= yeoman.client %>/bower_components/bootstrap',
					src: ['fonts/*.*'],
					dest: '<%= yeoman.dist %>/client/assets'
				},{
					// include leaflet draw images
					expand: true,
					dot: true,
					cwd: '<%= yeoman.client %>/bower_components/leaflet.draw/dist',
					src: ['images/*.*'],
					dest: '<%= yeoman.dist %>/client/assets'
				}, {
					expand: true,
					dot: true,
					cwd: '<%= yeoman.client %>',
					dest: '<%= yeoman.dist %>/client',
					src: [
						'assets/images/public/mycena_crop.jpg',
						'assets/images/public/SvampetlasLogo.png',
						'assets/images/flags/flags/shiny/16/Denmark.png',
						'assets/images/flags/flags/shiny/16/United-Kingdom.png'
					]
				}]
			},
			styles: {
				expand: true,
				cwd: '<%= yeoman.client %>',
				dest: '.tmp/',
				src: ['{app,components}/**/*.css']
			}
		},

		buildcontrol: {
			options: {
				dir: 'dist',
				commit: true,
				push: true,
				connectCommits: false,
				message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
			},
			heroku: {
				options: {
					remote: 'heroku',
					branch: 'master'
				}
			},
			openshift: {
				options: {
					remote: 'openshift',
					branch: 'master'
				}
			}
		},

		// Run some tasks in parallel to speed up the build process
		concurrent: {
			server: [],
			test: [],
			debug: {
				tasks: [
					'nodemon',
					'node-inspector'
				],
				options: {
					logConcurrentOutput: true
				}
			},
			dist: [
				'imagemin',
				'svgmin'
			]
		},

		// Test settings
		karma: {
			unit: {
				configFile: 'karma.conf.js',
				singleRun: true
			}
		},

		mochaTest: {
			options: {
				reporter: 'spec',
				require: 'mocha.conf.js'
			},
			unit: {
				src: ['server/**/*.spec.js']
			},
			integration: {
				src: ['server/**/*.integration.js']
			}
		},

		mocha_istanbul: {
			unit: {
				options: {
					excludes: [
						'**/*.spec.js',
						'**/*.mock.js',
						'**/*.integration.js'
					],
					reporter: 'spec',
					require: ['mocha.conf.js'],
					mask: '**/*.spec.js',
					coverageFolder: 'coverage/server/unit'
				},
				src: 'server'
			},
			integration: {
				options: {
					excludes: [
						'**/*.spec.js',
						'**/*.mock.js',
						'**/*.integration.js'
					],
					reporter: 'spec',
					require: ['mocha.conf.js'],
					mask: '**/*.integration.js',
					coverageFolder: 'coverage/server/integration'
				},
				src: 'server'
			}
		},

		istanbul_check_coverage: {
			default: {
				options: {
					coverageFolder: 'coverage/**',
					check: {
						lines: 80,
						statements: 80,
						branches: 80,
						functions: 80
					}
				}
			}
		},

		protractor: {
			options: {
				configFile: 'protractor.conf.js'
			},
			chrome: {
				options: {
					args: {
						browser: 'chrome'
					}
				}
			}
		},

		env: {
			test: {
				NODE_ENV: 'test'
			},
			prod: {
				NODE_ENV: 'development'
			},
			all: localConfig
		},

		injector: {
			options: {

			},
			// Inject application script files into index.html (doesn't include bower)
			scripts: {
				options: {
					transform: function(filePath) {
						filePath = filePath.replace('/client/', '');
						filePath = filePath.replace('/.tmp/', '');
						return '<script src="' + filePath + '"></script>';
					},
					starttag: '<!-- injector:js -->',
					endtag: '<!-- endinjector -->'
				},
				files: {
					'<%= yeoman.client %>/index.html': [
						['{.tmp,<%= yeoman.client %>}/{app,components}/**/*.js',
							'!{.tmp,<%= yeoman.client %>}/app/app.js',
							'!{.tmp,<%= yeoman.client %>}/{app,components}/**/*.spec.js',
							'!{.tmp,<%= yeoman.client %>}/{app,components}/**/*.mock.js'
						]
					],
					'server/views/index.ejs': [
						['{.tmp,<%= yeoman.client %>}/{app,components}/**/*.js',
							'!{.tmp,<%= yeoman.client %>}/app/app.js',
							'!{.tmp,<%= yeoman.client %>}/{app,components}/**/*.spec.js',
							'!{.tmp,<%= yeoman.client %>}/{app,components}/**/*.mock.js'
						]
					]
				}
			},

			// Inject component css into index.html
			css: {
				options: {
					transform: function(filePath) {
						filePath = filePath.replace('/client/', '');
						filePath = filePath.replace('/.tmp/', '');
						return '<link rel="stylesheet" href="' + filePath + '">';
					},
					starttag: '<!-- injector:css -->',
					endtag: '<!-- endinjector -->'
				},
				files: {
					'<%= yeoman.client %>/index.html': [
						'<%= yeoman.client %>/{app,components}/**/*.css'
					],
					'server/views/index.ejs': [
						'<%= yeoman.client %>/{app,components}/**/*.css'
					]
				}
			}
		},
	});

	// Used for delaying livereload until after server has restarted
	grunt.registerTask('wait', function() {
		grunt.log.ok('Waiting for server reload...');

		var done = this.async();

		setTimeout(function() {
			grunt.log.writeln('Done waiting!');
			done();
		}, 1500);
	});

	grunt.registerTask('express-keepalive', 'Keep grunt running', function() {
		this.async();
	});

	grunt.registerTask('serve', function(target) {
		if (target === 'dist') {
			return grunt.task.run(['build', 'env:all', 'env:prod', 'express:prod', 'wait', 'open', 'express-keepalive']);
		}

		if (target === 'debug') {
			return grunt.task.run([
				'clean:server',
				'env:all',
				'concurrent:server',
				'injector',
				'wiredep',
				'autoprefixer',
				'concurrent:debug'
			]);
		}

		grunt.task.run([
			'clean:server',
			'env:all',
			'concurrent:server',
			'injector',
			'wiredep',
			'autoprefixer',
			'express:dev',
			'wait',
			'open',
			'watch'
		]);
	});

	grunt.registerTask('server', function() {
		grunt.log.warn('The `server` task has been deprecated. Use `grunt serve` to start a server.');
		grunt.task.run(['serve']);
	});

	grunt.registerTask('test', function(target, option) {
		if (target === 'server') {
			return grunt.task.run([
				'env:all',
				'env:test',
				'mochaTest:unit',
				'mochaTest:integration'
			]);
		} else if (target === 'client') {
			return grunt.task.run([
				'clean:server',
				'env:all',
				'concurrent:test',
				'injector',
				'autoprefixer',
				'karma'
			]);
		} else if (target === 'e2e') {

			if (option === 'prod') {
				return grunt.task.run([
					'build',
					'env:all',
					'env:prod',
					'express:prod',
					'protractor'
				]);
			} else {
				return grunt.task.run([
					'clean:server',
					'env:all',
					'env:test',
					'concurrent:test',
					'injector',
					'wiredep',
					'autoprefixer',
					'express:dev',
					'protractor'
				]);
			}
		} else if (target === 'coverage') {

			if (option === 'unit') {
				return grunt.task.run([
					'env:all',
					'env:test',
					'mocha_istanbul:unit'
				]);
			} else if (option === 'integration') {
				return grunt.task.run([
					'env:all',
					'env:test',
					'mocha_istanbul:integration'
				]);
			} else if (option === 'check') {
				return grunt.task.run([
					'istanbul_check_coverage'
				]);
			} else {
				return grunt.task.run([
					'env:all',
					'env:test',
					'mocha_istanbul',
					'istanbul_check_coverage'
				]);
			}

		} else grunt.task.run([
			'test:server',
			'test:client'
		]);
	});

	grunt.registerTask('build', [
		'clean:dist',
		'concurrent:dist',
		'injector',
		'wiredep',
		'useminPrepare',
		'autoprefixer',
		'ngtemplates',
		'concat',
		'ngAnnotate',
		'copy:dist',
		'cdnify',
		'cssmin',
		'uglify',
		'rev',
		'usemin'
	]);

	grunt.registerTask('default', [
		'newer:jshint',
		'test',
		'build'
	]);
};
