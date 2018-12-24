var rH = require('harvester');
var rU = require('upgrader');
var rB = require('builder');
var rR = require('runner');
var rF = require('ferry');
var rT = require('transporter');
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
if (_.filter(Game.creeps, creep => creep.memory.role == 'miner') == 0){
    makeCreeps('miner', types.lightMiner, 1);
}
module.exports.loop = function () {
    var roles = [rH, rT, rR, rF, rU, rB, rM]; // order roles for priority
    var nameToRole = _.keyBy(roles, role => role.name); // map from names to roles
    var counts = _.countBy(Game.creeps, creep => creep.memory.role); // lookup table from role to count

    // Get counts for all roles, make first thing that doesn't have enough
    var nextRole = _.find(roles, role => counts[role.name] < role.limit);
    if (nextRole) {
        makeCreeps(nextRole.name, nextRole.type, nextRole.target);
    }

    // Print out each role & number of workers doing it
    var printout = _.map(roles, role => role.name + ": " + counts[role.name]);
    console.log(_.join(printout, ", "));

    // Run all the creeps
    _.forEach(Game.creeps, (creep, name) => nameToRole[creep.memory.role].run(creep));
  
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
    // Run the tower
    var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER);
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


_.countBy() // dictionary of counts
_.groupBy() // dictionary of groups
_.filter()
_.forEach()
_.keyBy(items, item => item.key) // make a dictionary of items
_.partition() make sublists
_.reduce(items, (a,b) => a + b) // combine all elements
_.reject() // opposite of filter, removes everything that's true
_.sample() //pick a random elem
_.size() // size/length

_.now() // date in ms

_.bind(fn, arg1, _, arg3) // put some args in fn
_.memoize(fn) // uses memoization on fn calls
_.clone
_.flow // sequence of fns

https://lodash.com/docs/4.17.11

*/
























