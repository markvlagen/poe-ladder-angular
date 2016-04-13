// Basic Gulp File
//
var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    mainBowerFiles = require('main-bower-files'),
    del = require('del'),
    fs = require('fs');

var config = new (function() {
    this.bowerDir = './bower_components';
    this.vendorGlob = './vendor/**/*.js';
    this.mainAppJSPath = './src/app/app.js';
    this.componentsGlob = './src/app/+(components|modules)/**/*.js';
    this.templatesGlob = './src/app/+(components|modules)/**/*.html';
    this.stylesGlob = './src/+(scss|app)/**/*.scss';
    this.assetsDir = './assets/**/*';
    this.distDir = './dist';
})();

var bowerFiles = function() {
    var files = mainBowerFiles();
    
    return files;
}

var bowerFilesMin = function() {
    var files = mainBowerFiles().map(function(file) {
        var splitFile = file.split('.');
        var extension = splitFile[splitFile.length - 1];
        var base = splitFile.slice(0, splitFile.length - 1).join('.');
        var minPath = base + '.min.' + extension;
        try {
            fs.accessSync(minPath, fs.F_OK);
            return minPath;
        } catch (e) {
            return file;
        }
    });
    
    return files;
};

var bowerFilesPaths = function() {
    var paths = mainBowerFiles().map(function(file) {
        var splitPath = file.split('/');
        var file = splitPath[splitPath.length - 1];
        var directoryPath = splitPath.slice(0, splitPath.length - 1).join('/');

        return directoryPath;
    }).filter(function(item, pos, self) {
        return self.indexOf(item) == pos;
    });
    
    return paths;
};

var dev = !(process.env.NODE_ENV == 'prod');
console.log('NODE_ENV: ' + process.env.NODE_ENV);

gulp.task('bower', function() {
    return plugins.bower()
        .pipe(gulp.dest(config.bowerDir));
})

gulp.task('assets', ['fontawesome'], function() {
    return gulp.src(config.assetsDir)
        .pipe(gulp.dest(config.distDir));
})

gulp.task('fontawesome', ['clean:assets'], function() {
    return gulp.src(config.bowerDir + '/font-awesome/fonts/**.*')
        .pipe(gulp.dest(config.distDir + '/fonts'))
})

gulp.task('css', ['clean:css'], function() {
    var SASSFilter = plugins.filter('**/*.scss', {restore: true});
    
    return gulp.src((dev ? bowerFiles() : bowerFilesMin()).concat([config.stylesGlob]))
        .pipe(plugins.filter(['**/*.scss', '**/*.css']))
        .pipe(plugins.debug({title: 'CSS/SCSS files:'}))
        .pipe(SASSFilter)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.if(!dev, plugins.sass({
                style: 'compressed',
                includePaths: bowerFilesPaths()
            })
            .on("error", plugins.notify.onError(function (error) {
                return "Error: " + error.message;
            })
        )))
        .pipe(plugins.if(dev, plugins.sass({
                includePaths: bowerFilesPaths()
            })
            .on("error", plugins.notify.onError(function (error) {
                return "Error: " + error.message;
            })
        )))
        .pipe(plugins.autoprefixer('last 2 version'))
        .pipe(SASSFilter.restore)
        .pipe(plugins.concat('main.css'))
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest(config.distDir + '/css'))
});

gulp.task('templates', ['clean:js:templates'], function() {
    return gulp.src(config.templatesGlob)
        .pipe(plugins.plumber(function(error) {
            plugins.util.log(plugins.util.colors.red(error.message));
            this.emit('end');
        }))
        .pipe(plugins.debug({title: 'Template files:'}))
        .pipe(plugins.if(!dev, plugins.htmlmin({
            collapseWhitespace: true
        })))
        .pipe(plugins.ngTemplate({
            filename: 'templates.js',
            moduleName: 'templates',
            standalone: true
        }))
        .pipe(gulp.dest(config.distDir + '/js'))
})

gulp.task('js:vendor', ['clean:js:vendor'], function () {
    return gulp.src([config.vendorGlob].concat(dev ? bowerFiles() : bowerFilesMin()))
        .pipe(plugins.plumber(function(error) {
            plugins.util.log(plugins.util.colors.red(error.message));
            this.emit('end');
        }))
        .pipe(plugins.filter(['**/*.js', '!bootstrap*']))
        .pipe(plugins.debug({title: 'Vendor files:'}))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('vendor.js'))
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest(config.distDir + '/js/'))
});

gulp.task('js:app', ['clean:js:app'], function () {
    return gulp.src([config.componentsGlob, config.mainAppJSPath])
        .pipe(plugins.plumber(function(error) {
            plugins.util.log(plugins.util.colors.red(error.message));
            this.emit('end');
        }))
        .pipe(plugins.filter('**/*.js'))
        .pipe(plugins.debug({title: 'App files:'}))
        .pipe(plugins.jshint({
            curly: true,
            eqeqeq: true,
            futurehostile: true,
            latedef: true,
            undef: true,
            unused: true,
            predef: ['angular']
        }))
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jshint.reporter('fail'))
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('app.js'))
        .pipe(plugins.ngAnnotate())
        .pipe(plugins.if(!dev, plugins.uglify()))
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest(config.distDir + '/js/'))
});

gulp.task('html', function() {
    return gulp.src('./src/app/index.html')
        .pipe(gulp.dest(config.distDir + ''))
});

gulp.task('clean', function() {
    return del(config.distDir + '/**/*', {
        force: true
    });
})

gulp.task('clean:js:app', function() {
    return del(config.distDir + '/js/app.js', {
        force: true
    });
})

gulp.task('clean:js:vendor', function() {
    return del(config.distDir + '/js/vendor.js', {
        force: true
    });
})

gulp.task('clean:js:templates', function() {
    return del(config.distDir + '/js/templates.js', {
        force: true
    });
})

gulp.task('clean:assets', function() {
    return del([config.distDir + '/img/**/*', config.distDir + '/fonts/**/*'], {
        force: true
    });
})

gulp.task('clean:css', function() {
    return del(config.distDir + '/css/**/*', {
        force: true
    });
})

// Rerun the task when a file changes
gulp.task('watch', function() {
    gulp.watch([config.templatesGlob], ['templates']);
    gulp.watch([config.mainAppJSPath, config.componentsGlob], ['js:app']);
    gulp.watch([config.bowerDir, config.vendorGlob], ['js:vendor', 'assets']);
    
    gulp.watch(config.stylesGlob, ['css']);
    
    gulp.watch(config.assetsDir, ['assets']);
    
    gulp.watch('./src/app/index.html', ['html'])
});

gulp.task('default', ['assets', 'css', 'templates', 'js:app', 'js:vendor', 'html']);