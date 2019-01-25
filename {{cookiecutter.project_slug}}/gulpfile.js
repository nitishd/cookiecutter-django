
////////////////////////////////
		//Setup//
////////////////////////////////

// Plugins
var gulp = require('gulp');
var pjson = require('./package.json');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');
var cleancss = require('gulp-clean-css');
{% if cookiecutter.custom_bootstrap_compilation == 'y' %}
var concat = require('gulp-concat');
{% endif %}
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var del = require('del');
var plumber = require('gulp-plumber');
var pixrem = require('gulp-pixrem2');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var spawn = require('child_process').spawn;
var browserSync = require('browser-sync').create();


// Relative paths function
var pathsConfig = function (appName) {
  this.app = "./" + (appName || pjson.name);
  var vendorsRoot = 'node_modules/';

  return {
    {% if cookiecutter.custom_bootstrap_compilation == 'y' %}
    bootstrapSass: vendorsRoot + '/bootstrap/scss',
    vendorsJs: [
      vendorsRoot + 'jquery/dist/jquery.slim.js',
      vendorsRoot + 'popper.js/dist/umd/popper.js',
      vendorsRoot + 'bootstrap/dist/js/bootstrap.js'
    ],
    {% endif %}
    app: this.app,
    templates: this.app + '/templates',
    css: this.app + '/static/css',
    sass: this.app + '/static/sass',
    fonts: this.app + '/static/fonts',
    images: this.app + '/static/images',
    js: this.app + '/static/js'
  }
};

var paths = pathsConfig();

////////////////////////////////
		//Tasks//
////////////////////////////////

// Styles autoprefixing and minification
function styles() {
  return gulp.src(paths.sass + '/project.scss')
    .pipe(sass({
      includePaths: [
        {%- if cookiecutter.custom_bootstrap_compilation == 'y' %}
        paths.bootstrapSass,
        {%- endif %}
        paths.sass
      ]
    }).on('error', sass.logError))
    .pipe(plumber()) // Checks for errors
    .pipe(autoprefixer({browsers: ['last 2 versions']})) // Adds vendor prefixes
    .pipe(pixrem())  // add fallbacks for rem units
    .pipe(gulp.dest(paths.css))
    .pipe(rename({ suffix: '.min' }))
    .pipe(cleancss({debug: true}, (details) => {
      // console.log(`${details.name}: ${details.stats.originalSize}`);
      // console.log(`${details.name}: ${details.stats.minifiedSize}`);
    })) // Minifies the result
    .pipe(gulp.dest(paths.css));
}

// Javascript minification
function scripts() {
  return gulp.src(paths.js + '/project.js')
    .pipe(plumber()) // Checks for errors
    .pipe(uglify()) // Minifies the js
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.js));
}

{%- if cookiecutter.custom_bootstrap_compilation == 'y' %}
// Vendor Javascript minification
function scriptsVendor() {
  return gulp.src(paths.vendorsJs)
    .pipe(concat('vendors.js'))
    .pipe(gulp.dest(paths.js))
    .pipe(plumber()) // Checks for errors
    .pipe(uglify()) // Minifies the js
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(paths.js));
}
{%- endif %}

// Image compression
function imgCompression() {
  return gulp.src(paths.images + '/*')
    .pipe(imagemin()) // Compresses PNG, JPEG, GIF and SVG images
    // .pipe(imagemin({verbose: true}))
    .pipe(gulp.dest(paths.images));
}

{%- if cookiecutter.use_docker == 'n' %}
// Run django server
function runServer(cb) {
  var cmd = spawn('python', ['manage.py', 'runserver'], {stdio: 'inherit'});
  cmd.on('close', function(code) {
    console.log('runServer exited with code ' + code);
    cb(code);
  });
}
{%- endif %}

// Watch & Browser sync server for live reload
function watch() {
  browserSync.init(
    [paths.css + "/*.css", paths.js + "*.js", paths.templates + '/**/*.html'], {
      {%- if cookiecutter.use_docker == 'n' %}
      proxy:  "localhost:8000"
      {% else %}
      proxy:  "django:8000",
      open: false
      {%- endif %}
  });
  // gulp.watch(paths.sass, gulp.series(styles, reload));
  gulp.watch(paths.sass + '/*.scss', styles);
  gulp.watch(paths.js + '/*.js', scripts);
  gulp.watch(paths.js + '/*', scriptsVendor);
  // gulp.watch(paths.templates + '/**/*.html').on('change', browserSync.reload);;
}

// Build task
var build = gulp.parallel(
              styles,
              scripts,
              {%- if cookiecutter.custom_bootstrap_compilation == 'y' %}
              scriptsVendor,
              {%- endif %}
              imgCompression);

// Default task
var serve = gulp.series(
    build,
    gulp.parallel(
      {%- if cookiecutter.use_docker == 'n' %}
      watch,
      runServer
      {% else %}
      watch
      {%- endif %}
    ));


exports.styles = styles;
exports.scripts = scripts;
exports.scriptsVendor = scriptsVendor;
exports.imgCompression = imgCompression;
exports.watch = watch;
{%- if cookiecutter.use_docker == 'n' %}
exports.runServer = runServer;
{%- endif %}

exports.build = build;
exports.serve = serve; // watch for changes + browsersync + run django server

exports.default = serve;