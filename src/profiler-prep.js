var profiler = require('./screeps-profiler')

var p = {
    prepProfile: function() {
        let fileNames = ['city', 'powerCreep', 'utils', 'markets', 'medic',
          'depositMiner', 'roomplan', 'bigMedic', 'trooper', 'bigTrooper',
          'bigBreaker', 'harasser', 'spawnBuilder', 'claimer', 'robber',
          'ferry', 'mineralMiner', 'upgrader', 'builder', 'runner', 'breaker',
          'transporter', 'remoteMiner', 'defender', 'types', 'tower',
          'powerMiner', 'labs', 'factory']
        for (let fileName of fileNames) {
          var lib = require(fileName);
          profiler.registerObject(lib, fileName);
        }
    }
};
module.exports = p;