const gulp = require('gulp');
const config = require('../config');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const babel = require('gulp-babel');
const mergeStream = require('merge-stream');

function build() {
  const tsProject = ts.createProject('tsconfig.json');
  const tsResult = gulp
    .src(config.scripts, { cwd: config.src })
    .pipe(tsProject());

  return mergeStream(
    tsResult.js.pipe(
      babel({
        presets: [['env', { targets: { node: '8.9.0' } }]],
      }),
    ),
    tsResult.dts,
  ).pipe(gulp.dest(config.dest));
}

gulp.task('build', build);

module.exports = build;
