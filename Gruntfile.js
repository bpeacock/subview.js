module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        watch: {
            files: [ 'styles/*.less' ],
            tasks: [ 'less' ]
        },
        less: {
            prod: {
                files: {
                    'styles/main.css': 'styles/main.less'
                }
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');
};
