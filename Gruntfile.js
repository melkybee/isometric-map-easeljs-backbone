'use strict';
var path = require('path');
var _ = require('lodash');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),

    // EaselJS - Default values
    version: 'NEXT',
    name: 'easeljs',
    docsZip: "<%= pkg.name %>_docs-<%= version %>.zip",

    // EaselJS - Setup doc names / paths.
    docsName: '<%= pkg.name %>_docs-<%= version %>',
    //docsZip: "<%= docsName %>.zip",
    docsFolder: "dist/<%= docsName %>/",

    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    clean: {
      files: ['dist']
    },
    compress: {
      build: {
        options: {
          mode:'zip',
          archive:'dist/<%= docsZip %>'
        },
        files: [
          {expand:true, src:'**', cwd:'<%= docsFolder %>'}
        ]
      }
    },
    copy: {
      main: {
        files: [
          {expand: false, src: ['src/index.html'], dest: 'dist/', filter: 'isFile'},
          {expand: false, src: ['src/data/*'], dest: 'dist/', filter: 'isFile', flatten: true},
          {expand: false, src: ['src/img/*'], dest: 'dist/', filter: 'isFile', flatten: true}
        ]
      },
      docsZip: {
        files: [
          {expand: true, cwd:'dist/', src:'<%= docsZip %>', dest:'dist/docs/'}
        ]
      },
      docsSite: {
        files: [
          {expand:true, cwd:'<%= docsFolder %>', src:'**', dest:getConfigValue('docs_out_path')}
        ]
      },
      src: {
        files: [
          {expand: true, cwd:'dist/', src: '*.js', dest: 'dist/lib/'}
        ]
      }
    },
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true,
        separator: ''
      },
      build: {
        files: {
          'dist/<%= pkg.name.toLowerCase() %>-<%= version %>.combined.js': getCombinedSource()
        }
      },
      dist: {
        src: ['src/libs/jquery.js','src/libs/underscore-min.js','src/libs/backbone-min.js','src/libs/pathfinding-browser.js','src/libs/easeljs-0.7.0.min.js','src/utils/*.js','src/models/*.js','src/views/*.js','src/main.js'],
        dest: 'dist/src/js/<%= pkg.name %>.js'
      },
    },
    uglify: {
      options: {
        banner: grunt.file.read('LICENSE'),
        preserveComments: "some",
        compress: {
          global_defs: {
            "DEBUG": false
          }
        }
      },
      build: {
        files: {
          'src/<%= pkg.name.toLowerCase() %>-<%= version %>.min.js': getConfigValue('easel_source'),
          'src/movieclip-<%= version %>.min.js': getConfigValue('movieclip_source')
        }
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'dist/src/js/libs.min.js'
      },
    },
    // Build docs using yuidoc
    yuidoc: {
      compile: {
        name: '<%= pkg.name %>',
        version: '<%= version %>',
        description: '<%= pkg.description %>',
        url: '<%= pkg.url %>',
        logo: '<%= pkg.logo %>',
        options: {
          paths: ['dist/src/'],
          outdir: '<%= docsFolder %>',
          linkNatives: true,
          attributesEmit: true,
          selleck: true,
          helpers: ["./path.js"],
          themedir: "createjsTheme/"
        }
      }
    },
    updateversion: {
      easel: {
        file: 'src/easeljs/version.js',
        version: '<%= version %>'
      },
      movieclip: {
        file: 'src/easeljs/version_movieclip.js',
        version: '<%= version %>'
      }
    },
    qunit: {
      files: ['test/**/*.html']
    },
    jshint: {
      gruntfile: {
        options: {
          jshintrc: '.jshintrc'
        },
        src: 'Gruntfile.js'
      },
      src: {
        options: {
          jshintrc: 'src/.jshintrc'
        },
        src: ['src/**/*.js']
      },
      test: {
        options: {
          jshintrc: 'test/.jshintrc'
        },
        src: ['test/**/*.js']
      },
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      src: {
        files: '<%= jshint.src.src %>',
        tasks: ['jshint:src', 'qunit']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'qunit']
      },
    },
  });

  function getHubTasks() {
    var arr = [
      getConfigValue('preload_path')+'Gruntfile.js',
      getConfigValue('tween_path')+'Gruntfile.js',
      getConfigValue('sound_path')+'Gruntfile.js'
    ];
    return arr;
  }

  function getBuildConfig() {
    // Read the global settings file first.
    var config = grunt.file.readJSON('config.json');

    // If we have a config.local.json .. prefer its values.
    if (grunt.file.exists('config.local.json')) {
      var config2 = grunt.file.readJSON('config.local.json');
      _.extend(config, config2);
    }

    return config;
  }

  function getConfigValue(name) {
    var config = grunt.config.get('buildConfig');

    if (config == null) {
      config = getBuildConfig();
      grunt.config.set('buildConfig', config);
    }

    return config[name];
  }

  function getCombinedSource() {
    var configs = [
      {cwd: '', config:'config.json', source:'easel_source'}
    ];

    return combineSource(configs);
  }

  function combineSource(configs) {
    // Pull out all the source paths.
    var sourcePaths = [];
    for (var i=0;i<configs.length;i++) {
      var o = configs[i];
      var json = grunt.file.readJSON(path.resolve(o.cwd, o.config));
      var sources = json[o.source];
      sources.forEach(function(item, index, array) {
        array[index] = path.resolve(o.cwd, item);
      });
      sourcePaths = sourcePaths.concat(sources);
    }

    // Remove duplicates (Like EventDispatcher)
    var dups = {};
    var clean = [];
    for (i=0;i<sourcePaths.length;i++) {
      var src = sourcePaths[i];
      var cleanSrc = src.substr(src.lastIndexOf('src' + path.sep));
      if  (dups[cleanSrc] == null) {
        clean.push(src);
        dups[cleanSrc] = true;
      }
    }

    return clean;
  }

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-yuidoc');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadTasks('tasks/');

  // Default task.
  //grunt.registerTask('default', ['jshint', 'qunit', 'clean', 'concat', 'uglify']);

  /**
   * Build the docs using YUIdocs.
   */
  grunt.registerTask('docs', [
    "yuidoc", "compress", "copy:docsZip"
  ]);

  /**
   * Sets out version to the version in package.json (defaults to NEXT)
   */
  grunt.registerTask('setVersion', function () {
    grunt.config.set('version', grunt.config.get('pkg').version);
  });

  /**
   * Task for exporting a next build.
   *
   */
  grunt.registerTask('next', [
    "coreBuild"
  ]);

  /**
   * Task for exporting a release build (version based on package.json)
   *
   */
  grunt.registerTask('build', [
    "setVersion", "coreBuild", "copy:docsSite"
  ]);

  /**
   * Main build task, always runs after next or build.
   *
   */
  grunt.registerTask('coreBuild', [
    "updateversion", "uglify", "docs", "copy:src"
  ]);

  /**
   * Task for exporting combined view.
   *
   */
  grunt.registerTask('combine', 'Combine all source into a single, un-minified file.', [
    "concat"
  ]);

  grunt.registerTask('default', ['clean', 'copy', 'concat', 'uglify', 'coreBuild']);

};
