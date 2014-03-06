module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        browserify: {
            dist: {
                files: {
                    'dist/subview.js': ['src/main.js']
                },
                options: {

                }
            },
            test: {
                files: {
                    'examples/build.js': ['examples/example.js']
                },
                options: {
                    debug: true
                }
            }
        },
        watch: {
            files: [ "src/*.js", "examples/example.js"],
            tasks: [ 'browserify' ]
        }
    });

    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('grunt-contrib-watch');
};

