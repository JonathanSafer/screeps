var glob = require( 'glob' ),
    path = require( 'path' );
var profiler = require('screeps-profiler.js')

var p = {
    prepProfile: function() {
        glob.sync( './**/*.js' ).forEach( function( file ) {
          console.log(file)
          const ignoreFiles = ['main.js', 'profiler-prep.js', 'screeps-profiler.js']
          if (file in ignoreFiles)  {
            return;
          }
          const lib = require( path.resolve( file ) );
          profiler.registerObject(lib, file);
        });
    }
};
module.exports = p;