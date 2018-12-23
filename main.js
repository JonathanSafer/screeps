var rH = require('roleHarvester');
var rU = require('Upgrader');
var rB = require('roleBuilder');
var rR = require('roleRunner');
var rF = require('roleFerry');
var rT = require('roleTransporter');
var rM = require('remoteMiner');
var types = require('types');
var T = require('tower');


//Game.spawns['Home'].memory.counter = 0;

function makeCreeps(role, type, target) {
  spawn = Game.spawns['Home'];
  name = spawn.memory.counter.toString();
  if (types.cost(type) <= spawn.room.energyAvailable && !spawn.spawning) {
    spawn.memory.counter++;
    spawn.spawnCreep( type, name);
    Game.creeps[name].memory.role = role;
    Game.creeps[name].memory.target = target;
  }
}

module.exports.loop = function () {
    roles = [rH, rT, rR, rF, rU, rB, rM]; // order for priority

    var counts = _.countBy(Game.creeps, creep => creep.memory.role); // lookup table from role to count

    var nextRole = _.find(roles, role => counts[role.name] < role.limit);
    if (nextRole) {
        makeCreeps(nextRole.name, nextRole.type, nextRole.target);
    }
    var printout = _.map(roles, role => role.name + ": " + counts[role.name]);
    console.log(_.join(printout, ", "));

    for(var name in Game.creeps) {
        var creep = Game.creeps[name];

        for (i = 0; i < roles.length; i++) {
            if (creep.memory.role == roles[i].name) {
                roles[i].run(creep);
            }
        }
    }
    //Game.spawns['Home'].memory.Upgraders = 2;
    console.log(Game.time);
    if (Game.time % 500 === 0){
        var structures = Game.spawns['Home'].room.find(FIND_STRUCTURES);
        var banks = _.filter(structures, (structure) => structure.structureType == STRUCTURE_CONTAINER);
        var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]));
        if(money < (4000 * .75)){
           Game.spawns['Home'].memory.Upgraders = Game.spawns['Home'].memory.Upgraders - 1; 
        }
        else if (money > (4000 * .90)){
          Game.spawns['Home'].memory.Upgraders = Game.spawns['Home'].memory.Upgraders + 1;;  
        }
    }
    var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER);
    //var remoteMiners = _.filter(Game.creeps, (creep) => creep.memory.role == 'remoteMiner')
    //else if(remoteMiners.length < 1) {makeCreeps('remoteMiner', types.lightMiner, 0)}
    T.run(towers[0]);
}

/*

lodash things:
_.chunk(array, [size=1]) (break array into chunks)
_.concat(array, 2, [3], [[4]]); (combine things to list)
_.difference([2, 1], [2, 3]);
_.flatten
_.flattenDeep (make list of lists into list)
_.join(array, [separator=',']) (combine strings)
_.union (combine sets)
_.head, _.tail, _.take, _.drop,
_.uniq (makes array into set)
_.zip/_.unzip, merge multiple arrays of same length by element, or split


_.countBy()










*/
























