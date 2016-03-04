var glob = require('glob');
var path = require('path');
var fs = require('fs');

var modes = {
  'expand': require('./modes/expand'),
  'hash': require('./modes/hash'),
  'list': require('./modes/list'),
  'es6': require('./modes/es6')
};

module.exports = require('browserify-transform-tools').makeRequireTransform(
  'require-globify', {
    jsFilesOnly: true,
    evaluateArguments: true
  },
  function(args, opts, done) {
    // args: args passed to require()
    // opts: opts used by browserify for the current file
    // done: browserify callback

    var config, pattern, globOpts, mode, result, sei;

    // only trigger if require was used with a wildcard in it
    if (typeof args[0] !== 'string' || args[0].indexOf('*') == -1) {
      return done();
    }

    // get the second param to require as our config
    config = args[1] || {mode: 'es6'};

    // backwards compatibility for glob and hash options, replaced by mode
    // set default resolve option to ["path-reduce", "strip-ext", "camelize"]
    config.resolve = config.resolve || ["path-reduce", "strip-ext", 'camelize'];
    if (!Array.isArray(config.resolve)) {
      config.resolve = [config.resolve];
    }

    // find mode
    if (typeof config.mode === 'function') {
      mode = config.mode;
    } else if (modes.hasOwnProperty(config.mode)) {
      mode = modes[config.mode];
    } else {
      console.warn("Unknown mode: " + config.mode);
      return done();
    }


    // take the first param to require as pattern
    pattern = args[0];

    var cwds = [];
    if (pattern.charAt(0) == '.') {
      // Relative path: use the current dirname.
      cwds.push(path.dirname(opts.file));
    } else {
      // Absolute path: use the NODE_PATH and optionally paths specified to browserify.
      var nodePaths = (process.env.NODE_PATH || '').split(':');
      cwds = cwds.concat(nodePaths);

      if (opts.config && opts.config._flags && opts.config._flags.paths) {
        cwds = cwds.concat(opts.config._flags.paths.map((p) => path.resolve(p)));
      }
    }

    cwds = cwds.filter((cwd) => !!cwd);

    // Try with each CWD.
    function tryWithCwd(cwd) {
      return new Promise((resolve, reject) => {
        var opts = {};
        Object.assign(opts, config.options);
        opts.nodir = true;
        opts.cwd = cwd;

        glob(pattern, opts, function(err, files) {
          // if there was an error with glob, abort here
          if (err) {
            reject(err);
          } else {
            files.sort();
            resolve(files);
          }
        });
      });
    }

    Promise.all(cwds.map((cwd) => tryWithCwd(cwd))).then((fileses) => {
      var allFiles = fileses.reduce((ff, f) => ff.concat(f), []);
      var result = mode(opts.file, allFiles, config);

      done(null, result);
    }, (err) => {
      done(err);
    });

  }
);
