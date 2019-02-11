var rSB = require('spawnBuilder');
var rC = require('claimer');
var rE = require('eye');
var rRo = require('robber');
var rF = require('ferry');
var rMM = require('mineralMiner');
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


function makeCreeps(role, type, target, city) {
    let extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.controller.sign.text == [city])).length
    //console.log(extensions)
    //console.log(types.getRecipe('basic', 2));
    let recipe = types.getRecipe(type, extensions);
    //console.log(recipe)
    let spawns = Game.spawns[city].room.find(FIND_MY_SPAWNS);
    let name = Game.spawns['Home'].memory.counter.toString();
    if (types.cost(recipe) <= Game.spawns[city].room.energyAvailable){
        spawn = u.getAvailableSpawn(spawns);
        //console.log(spawn);
        if(spawn != null) {
            Game.spawns['Home'].memory.counter++;
            spawn.spawnCreep(recipe, name);

            Game.creeps[name].memory.role = role;
            Game.creeps[name].memory.target = target;
            Game.creeps[name].memory.city = city;
            Game.creeps[name].memory.new = true;
        }
    }
}
//runCity function
function runCity(city, localCreeps){
    if (Game.spawns[city]){
        var roles = [rA, rT, rM, rR, rS, rU, rB, rMM, rF, rC, rSB, rBr] // order roles for priority
        var nameToRole = _.groupBy(roles, role => role.name); // map from names to roles
        var counts = _.countBy(localCreeps[city], creep => creep.memory.role); // lookup table from role to count
    
        // Get counts for all roles, make first thing that doesn't have enough
        _.forEach(_.filter(roles, role => !counts[role.name]), role => counts[role.name] = 0);
        //console.log(JSON.stringify(roles));
        let nextRole = _.find(roles, role => (typeof counts[role.name] == "undefined" 
                    && Game.spawns[city].memory[role.name]) || (counts[role.name] < Game.spawns[city].memory[role.name]));
        // console.log(Game.spawns[city].memory.rM);
        if (nextRole) {
            //console.log(JSON.stringify(nextRole));
            makeCreeps(nextRole.name, nextRole.type, nextRole.target(), city);
        }
    
        // Print out each role & number of workers doing it
        var printout = _.map(roles, role => role.name + ": " + counts[role.name]);
        console.log(city + ': ' + printout.join(', ' ));
    
        // Run all the creeps in this city
        _.forEach(localCreeps[city], (creep, name) => nameToRole[creep.memory.role][0].run(creep));
    }
}
//updateCountsCity function
function updateCountsCity(city, localCreeps, localRooms){
    if (Game.spawns[city]){
        if (Game.time % 500 === 0){
            //claimer and spawnBuilder reset
            Game.spawns[city].memory[rSB.name] = 0;
            Game.spawns[city].memory[rC.name] = 0;
            // automated upgrader count based on money
            var controller = Game.spawns[city].room.controller
            if (controller.level > 7){
                if (controller.ticksToDowngrade < 100000){
                    Game.spawns[city].memory[rU.name] = 1;
                } else if (controller.ticksToDowngrade > 180000){
                    Game.spawns[city].memory[rU.name] = 0;
                }
            } else {
                var banks = u.getWithdrawLocations(localCreeps[city][0]);
                //console.log(banks);
                var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]));
                var capacity = _.sum(_.map(banks, bank => bank.storeCapacity));
                //console.log('money: ' + money + ', ' + (100*money/capacity));
                if(money < (capacity * .5)){
                    Game.spawns[city].memory[rU.name] = Math.max(Game.spawns[city].memory[rU.name] - 1, 1); 
                }
                else if (money > (capacity * .52)){
                    Game.spawns[city].memory[rU.name] = Math.min(Game.spawns[city].memory[rU.name] + 1, 6);
                } else {
                    Game.spawns[city].memory[rU.name] = 1;
                }
            }
            // automated count for builders Game.rooms.controller.sign.text = city
            var constructionSites = _.flatten(_.map(localRooms[city], room => room.find(FIND_MY_CONSTRUCTION_SITES)));
            var buildings = _.flatten(_.map(localRooms[city], room => room.find(FIND_STRUCTURES)));
            var repairSites = _.filter(buildings, structure => (structure.hits < (structure.hitsMax*0.3)) && (structure.structureType != STRUCTURE_WALL));
            let totalSites = (Math.floor((repairSites.length)/10) + constructionSites.length);
            if (totalSites > 0){
                Game.spawns[city].memory[rB.name] = (totalSites > 10) ? 3 : 1;
            } else {
                Game.spawns[city].memory[rB.name] = 0;
            }
            // automated count for transporters
            var extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.controller.sign.text == [city])).length
            if (extensions < 1){
                Game.spawns[city].memory[rT.name] = 0;
            } else if (extensions < 10){
                Game.spawns[city].memory[rT.name] = 1;
            } else if (extensions < 20){
                Game.spawns[city].memory[rT.name] = 2;
            } else if (extensions < 60){
                Game.spawns[city].memory[rT.name] = 3;
            } else {
                Game.spawns[city].memory[rT.name] = 2;
            }
        }
    
        if (Game.time % 50 == 0) {
            updateMiner(city, localRooms);
            updateScout(city);
            // automated runner count based on miner distances
            var miners = _.filter(localCreeps[city], creep => creep.memory.role == "miner" || creep.memory.role == "remoteMiner");
            var distances = _.map(miners, miner => PathFinder.search(Game.spawns[city].pos, miner.pos).cost);
            var totalDistance = _.sum(distances);
            var extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.controller.sign.text == [city])).length
            //console.log(Math.max(Math.ceil(1.0 * totalDistance * 10 / types.carry(types.getRecipe('runner', extensions))), 2));
            if (extensions < 5){
                var runners = Math.max(Math.ceil(1.0 * totalDistance * 10 / types.carry(types.getRecipe('runner', extensions))), 2);
                Game.spawns[city].memory[rR.name] = runners;
            } else {
                Game.spawns[city].memory[rR.name] = Math.max(Math.ceil(1.0 * totalDistance * 20 / types.carry(types.getRecipe('runner', extensions))), 2);
            }
            //console.log(city + ': runners needed: ' + Game.spawns[city].memory[rR.name]);
            //automated ferry count
            //check if we have a terminal
            var terminal = Game.spawns[city].room.terminal
            var storage = Game.spawns[city].room.storage;
            if (!(terminal === undefined)){
                if (terminal.store.energy < 150000){
                    Game.spawns[city].memory[rF.name] = 1;
                } else if (storage.store['Utrium'] > 0){
                    Game.spawns[city].memory[rF.name] = 1;
                } else if (terminal.store.energy > 155000){
                    Game.spawns[city].memory[rF.name] = 1;
                } else {
                    Game.spawns[city].memory[rF.name] = 0;
                }
            } else {
                Game.spawns[city].memory[rF.name] = 0;
            }
            
            //emergency reproduction
            if (extensions >= 5){
                if (_.filter(localCreeps[city], creep => creep.memory.role == 'runner') < 1){
                    console.log('Making Emergency Runner')
                    makeCreeps('runner', 'erunner', 1, city);
                }
                if (_.filter(localCreeps[city], creep => creep.memory.role == 'remoteMiner') < 1){
                    console.log('Making Emergency Miner');
                    makeCreeps('remoteMiner', "lightMiner", 1, city);
                }
        
                    if (_.filter(localCreeps[city], creep => creep.memory.role == 'transporter') < 1){
                    console.log('Making Emergency Transporter');
                    makeCreeps('transporter', 'basic', 0, city);
                }
            }
        }
        
        if (Game.time % 30 == 0) {
            // Automated mineralMiner creation based on source status
            if (Game.spawns[city].room.controller.level > 5){
                var buildings = _.flatten(_.map(localRooms[city], room => room.find(FIND_STRUCTURES)));
                var extractor = _.find(buildings, structure => structure.structureType == STRUCTURE_EXTRACTOR);
                if(extractor){
                    var cityObject = Game.spawns[city].room;
                    var minerals = cityObject.find(FIND_MINERALS);
                    Game.spawns[city].memory[rMM.name] = (minerals[0].mineralAmount < 1) ? 0 : 1;
                } else {
                    Game.spawns[city].memory[rMM.name] = 0;
                }
            } else {
                Game.spawns[city].memory[rMM.name] = 0;
            }

            // Automated attacker count for defense
            var enemyCounts = _.map(localRooms[city], room => {
                var allBadCreeps = room.find(FIND_HOSTILE_CREEPS);
                var invaders = _.reject(allBadCreeps, creep => creep.owner.username == "Source Keeper");
                return invaders.length;
            });
            Game.spawns[city].memory[rA.name] = _.sum(enemyCounts);
        }
    }
}

// Run the tower function
function runTowers(city){
    if (Game.spawns[city]){
        var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER && structure.room.controller.sign.text == city);
        var hostiles = Game.spawns[city].room.find(FIND_HOSTILE_CREEPS);
        for (i = 0; i < towers.length; i++){
            if(hostiles.length > 0){
                T.defend(towers[i]);
            }
            else {
                T.run(towers[i]);
                T.defend(towers[i]);
                T.heal(towers[i]);
            }
        }
    }
}

function updateScout(city){
	let scouts = 0;
	_.each(Game.spawns[city].memory.remoteRooms, function(roomInfo, room) {
		if (roomInfo.reinforceTime < Game.time){
			scouts++
		}
	})
	if (Game.spawns[city].room.controller.level > 4){
		if (Object.keys(Game.spawns[city].memory.remoteRooms).length < 1){
			scouts++
		}
	}
	if (Game.spawns[city].room.controller.level > 5){
		if (Object.keys(Game.spawns[city].memory.remoteRooms).length < 2){
			scouts++
		}
	}
	Game.spawns[city].memory[rS.name] = scouts;
}

function updateMiner(city, localRooms){
	if (!Game.spawns[city].memory.sources){
		Game.spawns[city].memory.sources = {};
	}
	let miners = 0;
	let sources = _.flatten(_.map(localRooms[city], room => room.find(FIND_SOURCES)));
	_.each(sources, function(sourceInfo){
		let sourceId = sourceInfo.id;
		let sourcePos = sourceInfo.pos;
		if (!([sourceId] in Game.spawns[city].memory.sources)){
                    Game.spawns[city].memory.sources[sourceId] = sourcePos;
        }
	})
	_.each(Game.spawns[city].memory.sources, function(sourceInfo, source){
	    miners++
		let room = sourceInfo.roomName;
		if (Game.rooms[room] && !Game.rooms[room].controller.reservation){
			//delete(Game.spawns[city].memory.sources[source])\
			//console.log(Game.spawns[city].memory.sources[source])
			//this is currently not working
		}
	})
	Game.spawns[city].memory[rM.name] = miners;
}

module.exports = {
    runCity: runCity,
    updateCountsCity: updateCountsCity,
    runTowers: runTowers,
    updateScout: updateScout
};