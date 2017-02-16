'use strict';

var gulp  = require('gulp');
var shell = require('gulp-shell');
var jshint = require('gulp-jshint');
var sass = require('gulp-sass');
var concat = require('gulp-concat');
var cleanCSS = require('gulp-clean-css');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var argv = require('yargs').argv;
var _ = require('underscore');
var sourcemaps = require('gulp-sourcemaps');
var gutil = require('gulp-util');
var spritesmith = require('gulp.spritesmith');
//var critical = require('critical');
var imagemin = require('gulp-imagemin');
var pngquant = require('imagemin-pngquant'); // $ npm i -D imagemin-pngquant

// file can be a vinyl file object or a string
// when a string it will construct a new one
module.exports = function(config) {

    var tasks = [];
    _.each(config, function(value, key) {
        tasks.push(key);
        gulp.task(key, function() {

            // Sprite css-files are automatically appended to the app's css file
            var files = value.files,
                filename = (value.filename ? value.filename : 'app');

            if ('sass' === value.type) {
                if ('undefined' !== typeof value.images) {
                    _.each(value.images, function(path, key) {
                        gutil.log('Creating sprite: ' + value.dest + '/' + key + '.png');
                        var spriteData = gulp.src(path).pipe(spritesmith({
                            imgName: key + '.png',
                            cssName: key + '.css'
                        }));
                        spriteData.pipe(gulp.dest(value.dest));
                        files.push(value.dest + '/' + key + '.css');
                    });
                }
            }

            var task = gulp.src(files);
            if ('imagemin' === value.type) {

                gulp.src(value.files)
                    .pipe(imagemin({
                        progressive: true,
                        use: [pngquant()]
                    }))
                    .pipe(gulp.dest(value.dest));
                    
            }
            else if ('scripts' === value.type) {

                if (argv.production) {
                    gutil.log('minifying scripts for production.. This could take a while');
                    task = task.pipe(concat(filename+'.min.js'));
                    task = task.pipe(uglify());
                }
                else {
                    task = task.pipe(concat(filename+'.js'));
                }

                task = task.pipe(gulp.dest(value.dest));
            }
            else if ('sass' === value.type) {

                task = task.pipe(sourcemaps.init());
                task = task.pipe(sass({
                    sourceComments: 'map',
                    outputStyle: 'nested',
                    includePaths: ('undefined' === typeof value.includePaths) ? [] : value.includePaths
                }).on('error', sass.logError));

                if (argv.production) {
                    gutil.log('minifying styles for production');
                    task = task.pipe(concat(filename+'.min.css'));
                    task = task.pipe(cleanCSS());
                    task = task.pipe(sourcemaps.write('/'));
                }
                else {
                    task = task.pipe(concat(filename+'.css'));
                    task = task.pipe(sourcemaps.write('/'));
                }

                task = task.pipe(gulp.dest(value.dest));

            }
            else if ('copy' === value.type) {
                task = task.pipe(gulp.dest(value.dest));
            }
            
            if ('undefined' !== typeof value.copy) {
                _.each(value.copy, function(path, name) {
                    gulp.src([path]).pipe(gulp.dest(value.dest));
                });
            }

            if (argv.watch) {
                var watch = value.files;
                if ('undefined' !== typeof value.watch) {
                    watch = watch.concat(value.watch);
                }
                gulp.watch(watch, [key]);
            }

            return task;

        });
    });


    gulp.task('watch', function() {
        if (argv.task) {
            var tasks = argv.task.split(','),
                files = [];
            for (var i = 0; i < tasks.length; i++) {
                files = config[tasks[i]].files;
                if ('undefined' !== typeof config[tasks[i]].watch) {
                    files = files.concat(config[tasks[i]].watch);
                }
                gulp.watch(files, [tasks[i]]);
                gulp.start(tasks[i]);
            }
        }
    });
    
     gulp.task('default', function() {
        var files = [];
        for (var i = 0; i < tasks.length; i++) {
            files = config[tasks[i]].files;
            if ('undefined' !== typeof config[tasks[i]].watch) {
                files = files.concat(config[tasks[i]].watch);
            }
            if (argv.watch) {
                gulp.watch(files, [tasks[i]]);
            }
            gulp.start(tasks[i]);
        }
    });
    
};
