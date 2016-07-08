var gulp = require('gulp');
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var sh = require('shelljs');
var childProcess = require('child_process');
var jetpack = require('fs-jetpack');
var usemin = require('gulp-usemin');
var babel = require('gulp-babel');
var runSeq = require('run-sequence');
var plumber = require('gulp-plumber');
var livereload = require('gulp-livereload');
// var ngAnnotate = require('gulp-ng-annotate');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var eslint = require('gulp-eslint');
// var mocha = require('gulp-mocha');
// var karma = require('karma').server;
// var istanbul = require('gulp-istanbul');
var notify = require('gulp-notify');

var projectDir = jetpack;
var srcDir = projectDir.cwd('./');
var destDir = projectDir.cwd('./build');
// Development tasks
// --------------------------------------------------------------

// Live reload business.
gulp.task('reload', function() {
    livereload.reload();
});

gulp.task('clean', function(callback) {
    return destDir.dirAsync('.', { empty: true });
});

gulp.task('copy', ['clean'], function() {
    return projectDir.copyAsync('app', destDir.path(), {
        overwrite: true,
        matching: [
            './node_modules/**/*',
            '*.html',
            '*.css',
            'main.js',
            'package.json'
        ]
    });
});


// gulp.task('build', ['copy'], function () {
//   return gulp.src('./app/index.html')
//     .pipe(usemin({
//       js: [uglify()]
//     }))
//     .pipe(gulp.dest('build/'));
// });


gulp.task('lintJS', function() {

    return gulp.src(['./www/js/**/*.js', './www/js/*.js'])
        .pipe(plumber({
            errorHandler: notify.onError('Linting FAILED! Check your gulp process.')
        }))
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError());

});

gulp.task('buildJS', function() {
    return gulp.src(['./www/js/*/*.js', './www/js/renderer.js'])
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(concat('main.js'))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./www'));
});

gulp.task('buildCSS', function() {

    var sassCompilation = sass();
    sassCompilation.on('error', console.error.bind(console));

    return gulp.src('./app/scss/main.scss')
        .pipe(plumber({
            errorHandler: notify.onError('SASS processing failed! Check your gulp process.')
        }))
        .pipe(sourcemaps.init())
        .pipe(sassCompilation)
        .pipe(sourcemaps.write())
        .pipe(rename('style.css'))
        .pipe(gulp.dest('./app/assets'));
});


// Production tasks
// --------------------------------------------------------------

// gulp.task('buildCSSProduction', function () {
//     return gulp.src('./app/scss/main.scss')
//         .pipe(sass())
//         .pipe(rename('style.css'))
//         .pipe(minifyCSS())
//         .pipe(gulp.dest('./assets'))
// });

// gulp.task('buildJSProduction', function () {
//     return gulp.src(['./app/**/**.js', './app/app.js'])
//         .pipe(concat('main.js'))
//         .pipe(babel({
//             presets: ['es2015']
//         }))
//         .pipe(ngAnnotate())
//         .pipe(uglify())
//         .pipe(gulp.dest('./assets'));
// });


// Composed tasks
// --------------------------------------------------------------

gulp.task('build', function() {
    if (process.env.NODE_ENV === 'production') {
        runSeq(['buildJSProduction', 'buildCSSProduction']);
    } else {
        runSeq(['buildJS', 'buildCSS']);
    }
});

var paths = {
  sass: ['./scss/**/*.scss']
};
gulp.task('default', function() {

    gulp.start('build');

    // Run when anything inside of app/scripts changes.
    gulp.watch(['www/js/*.js', 'www/js/**/*.js'], function() {
        runSeq('buildJS', 'reload')
    });

    // // Run when anything inside of browser/scss changes.
    gulp.watch('./scss/ionic.app.scss', function() {
        runSeq('sass');
    });




    // // Run server tests when a server file or server test file changes.
    // gulp.watch(['tests/server/**/*.js'], ['testServerJS']);

    // // Run browser testing when a browser test file changes.
    // gulp.watch('tests/browser/**/*', ['testBrowserJS']);

    livereload.listen();
});

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
