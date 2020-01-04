var profiler = require('screeps-profiler.js')

var p = {
    prepProfile: function() {
        let fileNames = ['city', 'powerCreep', 'utils', 'markets', 'medic',
          'depositMiner', 'roomplan', 'bigMedic', 'trooper', 'bigTrooper',
          'bigBreaker', 'harasser', 'spawnBuilder', 'claimer', 'robber',
          'ferry', 'mineralMiner', 'upgrader', 'builder', 'runner', 'breaker',
          'transporter', 'remoteMiner', 'attacker', 'types', 'tower', 'defender',
          'powerMiner', 'labs', 'factory']
        for (let fileName of fileNames) {
          var lib = require(fileName);
          profiler.registerObject(lib, fileName);
        }
    }
};
module.exports = p;