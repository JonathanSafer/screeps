var rH = require('roleHarvester');
var rU = require('Upgrader');
var rB = require('roleBuilder');
var rR = require('roleRunner');
var rF = require('roleFerry');
var rT = require('roleTransporter');
var types = require('types');
var rM = require('remoteMiner');
var T = require('tower');


//Game.spawns['Home'].memory.counter = 0;

function makeCreeps(role, type, target) {
  spawn = Game.spawns['Home'];
  name = spawn.memory.counter.toString();
  if (types.cost(type) < spawn.room.energyAvailable && !spawn.spawning) {
    spawn.memory.counter++;
    spawn.spawnCreep( type, name);
    Game.creeps[name].memory.role = role;
    Game.creeps[name].memory.target = target;
  }
}

module.exports.loop = function () {
    roles = [rH, rR, rF, rT, rU, rB]; // order for priority

    var workers = _.map(roles, role =>
        _.filter(Game.creeps, creep => creep.memory.role == role.role));

    var printout = "";
    for (i = 0; i < roles.length; i++) {
        if(workers[i].length < roles[i].limit) {
            makeCreeps(roles[i].role, roles[i].type, roles[i].target);
        }
        printout += " " + roles[i].role + ": " + workers[i].length;
    }
    
    console.log(printout);

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];
        for (i = 0; i < roles.length; i++) {
            if (creep.memory.role == roles[i].role) {
                roles[i].run(creep);
            }
        }
    }
    var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER);
    //var remoteMiners = _.filter(Game.creeps, (creep) => creep.memory.role == 'remoteMiner')
    //else if(remoteMiners.length < 1) {makeCreeps('remoteMiner', types.lightMiner, 0)}
    T.run(towers[0]);
}
