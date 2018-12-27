var rU = require('upgrader');
var rB = require('builder');
var rR = require('runner');
var rBr = require('breaker');
var rT = require('transporter');
var rM = require('remoteMiner');
var rS = require('scout');
var rA = require('attacker');
var types = require('types');
var u = require('utils');
var T = require('tower');
const profiler = require('screeps-profiler');
//Game.profiler.profile(1000);
//Game.profiler.output();
//Game.spawns['Home'].memory.counter = 934;
//Game.spawns['Home'].memory["runner"] = 5;
//Game.spawns['Home'].memory["attacker"] = 0;

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
//emergency reproduction
if (_.filter(Game.creeps, creep => creep.memory.role == 'remoteMiner') == 0){
    makeCreeps('remoteMiner', types.lightMiner, 1);
}
/*else if (_.filter(Game.creeps, creep => creep.memory.role == 'transporter') == 0){
    makeCreeps('transporter', types.basic, 0);
} */
else if (_.filter(Game.creeps, creep => creep.memory.role == 'runner') == 0){
    makeCreeps('runner', types.erunner, 1);
}

profiler.enable();
module.exports.loop = function () {
  profiler.wrap(function() {
    var roles = [rM, rT, rR, /*rA,*/ /*rS,*/ rU, rB, /*rBr*/]; // order roles for priority
    var nameToRole = _.groupBy(roles, role => role.name); // map from names to roles
    var counts = _.countBy(Game.creeps, creep => creep.memory.role); // lookup table from role to count

    // Get counts for all roles, make first thing that doesn't have enough
    _.forEach(_.filter(roles, role => !counts[role.name]), role => counts[role.name] = 0);
    var nextRole = _.find(roles, role => (typeof counts[role.name] == "undefined" && role.limit) || (counts[role.name] < role.limit));
    if (nextRole) {
        makeCreeps(nextRole.name, nextRole.type, nextRole.target);
    }

    // Print out each role & number of workers doing it
    var printout = _.map(roles, role => role.name + ": " + counts[role.name]);
    console.log(printout.join(', ' ));

    // Run all the creeps
    _.forEach(Game.creeps, (creep, name) => nameToRole[creep.memory.role][0].run(creep));
  
    //Game.spawns['Home'].memory.Upgraders = 2;
    console.log(Game.time);
    if (Game.time % 20100 === 0) {
        Game.spawns['Home'].room.controller.activateSafeMode();
    }
    
    if (Game.time % 500 === 0){
        // automated upgrader count based on money
        var banks = u.getWithdrawLocations(Object.values(Game.creeps)[0]);
        //console.log(banks);
        var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]));
        var capacity = _.sum(_.map(banks, bank => bank.storeCapacity));
        console.log('money: ' + money + ', ' + (100*money/capacity));
        if(money < (capacity * .16)){
           Game.spawns['Home'].memory.Upgraders = Math.max(Game.spawns['Home'].memory.Upgraders - 1, 1); 
        }
        else if (money > (capacity * .17)){
          Game.spawns['Home'].memory.Upgraders = Game.spawns['Home'].memory.Upgraders + 1;
        }
        // automated count for builders
        var constructionSites = _.flatten(_.map(Game.rooms, room => room.find(FIND_CONSTRUCTION_SITES)));
        Game.spawns["Home"].memory["builder"] = (constructionSites.length > 0) ? 1 : 0;
        
        // automated count for scouts
        var proxyRooms = 0;
        Game.spawns["Home"].memory["scout"] = 2 * proxyRooms;
    }
    
    if (Game.time % 50 == 0) {
        // automated runner count based on miner distances
        var miners = _.filter(Game.creeps, creep => creep.memory.role == "miner" || creep.memory.role == "remoteMiner");
        var distances = _.map(miners, miner => PathFinder.search(Game.spawns['Home'].pos, miner.pos).cost);
        var totalDistance = _.sum(distances);
        if (Game.spawns['Home'].room.controller.level < 3){
            Game.spawns['Home'].memory["runner"] = Math.ceil(1.0 * totalDistance * 10 / types.carry(types.runner));
        }
        else Game.spawns['Home'].memory["runner"] = Math.ceil(1.0 * totalDistance * 20 / types.carry(types.runner));
    }
    if (Game.time % 30 == 0) {
        // Automated miner count based on sources
        var extensions = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_EXTENSION).length;
        var myRooms = _.filter(Game.rooms, room =>  (room.controller && room.controller.reservation && room.controller.reservation.username == "Yoner")
                                                            || (room.controller && room.controller.my));
        var sources = _.flatten(_.map(myRooms, room => room.find(FIND_SOURCES)));
        
        if (extensions < 5){
            Game.spawns["Home"].memory["miner"] = sources.length*2;
        }
        else Game.spawns["Home"].memory["miner"] = sources.length;
        
        // Automated attacker count for defense
        var enemyCounts = _.map(Game.rooms, room => {
            var allBadCreeps = room.find(FIND_HOSTILE_CREEPS);
            var invaders = _.reject(allBadCreeps, creep => creep.owner.username == "Source Keeper");
            return invaders.length;
        });
        Game.spawns['Home'].memory["attacker"] = _.sum(enemyCounts);
    }
    // Run the tower
    var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER);
    if (towers.length){
        T.run(towers[0]);
        T.defend(towers[0]);
    }
  });
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
