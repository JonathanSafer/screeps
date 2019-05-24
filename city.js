var rMe = require('medic');
var rBM = require('bigMedic')
var rTr = require('trooper')
var rBT = require('bigTrooper')
var rBB = require('bigBreaker')
var rH = require('harasser');
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
var rD = require('defender');
var rPM = require('powerMiner');
var labs = require('labs');


function makeCreeps(role, type, target, city) {
    let extensions = _.filter(Game.structures, (structure) => (structure.structureType == STRUCTURE_EXTENSION) && (structure.room.memory.city == [city])).length
    //console.log(extensions)
    //console.log(types.getRecipe('basic', 2));
    let recipe = types.getRecipe(type, extensions);
    //console.log(role)
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
function runCity(city, creeps){
    if (Game.spawns[city]){
        var roles = [rF, rA, rT, rM, rR, rU, rB, rS, rMM, rC, rSB, rH, rBM, rD, rBB, rBT, rMe, rTr, rBr, rPM] // order roles for priority
        var nameToRole = _.groupBy(roles, role => role.name); // map from names to roles
        var counts = _.countBy(creeps, creep => creep.memory.role); // lookup table from role to count
    
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
        //console.log(city + ': ' + printout.join(', ' ));
    
        // Run all the creeps in this city
        _.forEach(creeps, (creep, name) => nameToRole[creep.memory.role][0].run(creep));
        
        //run powerSpawn
        runPowerSpawn(city);
        labs.runLabs(city)
    }
}
//updateCountsCity function
function updateCountsCity(city, creeps, rooms) {
    let spawn = Game.spawns[city];
    if (spawn){
        let memory = spawn.memory;
        let controller = spawn.room.controller;
        let rcl = controller.level;
        let rcl8 = rcl > 7;
        var extensions = _.filter(Game.structures, 
            (structure) => (structure.structureType == STRUCTURE_EXTENSION) 
            && (structure.room.memory.city == [city])).length;
        var structures = spawn.room.find(FIND_STRUCTURES);

        let logisticsTime = rcl8 ? 500 : 50;
        if (Game.time % logisticsTime == 0) {
            updateScout(city, rcl, rcl8, memory);
            updateRunner(creeps, spawn, extensions, memory, rcl8);
            updateFerry(spawn, memory, rcl8);
            updateMiner(rooms, rcl8, memory, spawn);
        
            if (Game.time % 500 === 0) {
                checkLabs(city)
                updateTransporter(extensions, memory);
                updateMilitary(city, memory);
                updateColonizers(memory);
                updateUpgrader(city, controller, memory, rcl8, creeps);
                updateBuilder(rcl, memory, spawn, rooms, rcl8);
                updateMineralMiner(rcl, structures, spawn, memory);

                if (rcl8) {
                    updateStorageLink(spawn, memory, structures);
                }
            }
            makeEmergencyCreeps(extensions, creeps, city, rcl8); 
        }
        updateAttacker(rooms, memory);
    }
}

function makeEmergencyCreeps(extensions, creeps, city, rcl8) {
    let checkTime = rcl8 ? 2000 : 150;

    if (Game.time % checkTime == 0 && extensions >= 5) {
        if (_.filter(creeps, creep => creep.memory.role == 'remoteMiner') < 1){
            console.log('Making Emergency Miner');
            makeCreeps('remoteMiner', "lightMiner", 1, city);
        }

        if (_.filter(creeps, creep => creep.memory.role == 'transporter') < 1){
            console.log('Making Emergency Transporter');
            makeCreeps('transporter', 'basic', 0, city);
        }

        if (!rcl8 && _.filter(creeps, creep => creep.memory.role == 'runner') < 1) {
            console.log('Making Emergency Runner')
            makeCreeps('runner', 'erunner', 1, city);
        }
    }
}

// Run the tower function
function runTowers(city){
    if (Game.spawns[city]){
        var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER && structure.room.memory.city == city);
        var hostileCreep = Game.spawns[city].room.find(FIND_HOSTILE_CREEPS);
        var injuredCreep = Game.spawns[city].room.find(FIND_MY_CREEPS, {filter: (injured) => { 
                                                return (injured) && injured.hits < injured.hitsMax;
                             }});
        var injuredPower = Game.spawns[city].room.find(FIND_MY_POWER_CREEPS, {filter: (injured) => { 
                                                return (injured) && injured.hits < injured.hitsMax;
                             }});
        var hostilePower = Game.spawns[city].room.find(FIND_HOSTILE_POWER_CREEPS)
        var hostiles = hostilePower.concat(hostileCreep);
        var injured = injuredPower.concat(injuredCreep)
        var notWalls = [];
        if (Game.time % 10 === 0) {
            var damaged = Game.spawns[city].room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure) && structure.hits < (structure.hitsMax * 0.1);
                    }
            });
            notWalls = _.reject(damaged, location => location.structureType == STRUCTURE_WALL);
        }
        for (i = 0; i < towers.length; i++){
            if(hostiles.length > 0){
                towers[i].attack(hostiles[0]);
            } else if (injured.length > 0){
                towers[i].heal(injured[0])
            } else if (Game.time % 10 === 0 && notWalls.length > 0){
                towers[i].repair(notWalls[0])
            }
        }
    }
}

//Run the powerSpawn
function runPowerSpawn(city){
    if(Game.spawns[city]){
        if (!Game.spawns[city].memory.powerSpawn){
            if (!Game.spawns[city].memory.ferryInfo){
                Game.spawns[city].memory.ferryInfo = {}
            }
            if (Game.time % 500 == 0){
                let powerSpawn = _.find(Game.structures, (structure) => structure.structureType == STRUCTURE_POWER_SPAWN && structure.room.memory.city == city);
                if (powerSpawn){
                    Game.spawns[city].memory.powerSpawn = powerSpawn.id
                }
            }
            return;
        }
        var powerSpawn = Game.getObjectById(Game.spawns[city].memory.powerSpawn)
        if (Game.time % 20 === 0){
            if (!Game.spawns[city].memory.ferryInfo){
                Game.spawns[city].memory.ferryInfo = {}
            }
            if(powerSpawn && powerSpawn.power < 30){
                Game.spawns[city].memory.ferryInfo.needPower = true
            } else {
                Game.spawns[city].memory.ferryInfo.needPower = false
            }
        }
        if(powerSpawn && powerSpawn.energy >= 50 && powerSpawn.power > 0 && powerSpawn.room.storage.store.energy > 520000){
            powerSpawn.processPower();
        }
    }
}

function checkLabs(city){
    let spawn = Game.spawns[city];
    let labs = _.filter(spawn.room.find(FIND_MY_STRUCTURES), structure => structure.structureType === STRUCTURE_LAB)
    if (labs.length < 10){
        return;
    }
    if(spawn.memory.ferryInfo.labInfo){
        let lab0 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[0][0])
        let lab1 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[1][0])
        let lab2 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[2][0])
        let lab3 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[3][0])
        let lab4 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[4][0])
        let lab5 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[5][0])
        if (lab0 && lab1 && lab2 && lab3 && lab4 && lab5){
            return;
        }
    }
    let group1 = [];
    let group2 = [];
    spawn.memory.ferryInfo.labInfo = [];
    spawn.memory.ferryInfo.boosterInfo = [];
    group1.push(labs[0].id)
    for(i = 1; i < labs.length; i++){
        if(labs[0].pos.inRangeTo(labs[i].pos, 2)){
            group1.push(labs[i].id)
        } else {
            group2.push(labs[i].id)
        }
    }
    if (group1.length == 6){
        for (i = 0; i < 6; i++){
            spawn.memory.ferryInfo.labInfo[i] = [];
            spawn.memory.ferryInfo.labInfo[i][0] = group1[i]
            spawn.memory.ferryInfo.labInfo[i][1] = 0
            spawn.memory.ferryInfo.labInfo[i][2] = null
        }
        for (i = 0; i < 4; i++){
            spawn.memory.ferryInfo.boosterInfo[i] = [];
            spawn.memory.ferryInfo.boosterInfo[i][0] = group2[i]
            spawn.memory.ferryInfo.boosterInfo[i][1] = 0
            spawn.memory.ferryInfo.boosterInfo[i][2] = null
        }
    } else {
        for (i = 0; i < 6; i++){
            spawn.memory.ferryInfo.labInfo[i] = [];
            spawn.memory.ferryInfo.labInfo[i][0] = group2[i]
            spawn.memory.ferryInfo.labInfo[i][1] = 0
            spawn.memory.ferryInfo.labInfo[i][2] = null
        }
        for (i = 0; i < 4; i++){
            spawn.memory.ferryInfo.boosterInfo[i] = [];
            spawn.memory.ferryInfo.boosterInfo[i][0] = group1[i]
            spawn.memory.ferryInfo.boosterInfo[i][1] = 0
            spawn.memory.ferryInfo.boosterInfo[i][2] = null
        }
    }
}

function updateMilitary(city, memory) {
    let flags = ['harass', 'break', 'defend', 'powerMine', 'bigShoot', 'shoot', 'bigBreak'];
    let updateFns = [updateHarasser, updateBreaker, updateDefender, updatePowerMine, updateBigTrooper, updateTrooper, updateBigBreaker];

    for (var i = 0; i < flags.length; i++) {
        let flagName = city + flags[i];
        let updateFn = updateFns[i];
        updateFn(Game.flags[flagName], memory, city);
    }
}

function updateColonizers(memory) {
    //claimer and spawnBuilder reset
    memory[rSB.name] = 0;
    memory[rC.name] = 0;
}

// Automated attacker count for defense
function updateAttacker(rooms, memory) {
    if (Game.time % 30 == 0) {
        var enemyCounts = _.map(rooms, room => {
            var allBadCreeps = room.find(FIND_HOSTILE_CREEPS);
            var invaders = _.reject(allBadCreeps, creep => creep.owner.username == "Source Keeper");
            return invaders.length;
        });
        memory[rA.name] = _.sum(enemyCounts);
    }
}

function updateScout(city, rcl, rcl8, memory){
    if (rcl8) {
        memory[rS.name] = 0;
        return;
    }
	let scouts = 0;
	_.each(memory.remoteRooms, function(roomInfo, room) {
		if (roomInfo.reinforceTime < Game.time){
			scouts++
		}
	})
	if (rcl > 4){
		if (!memory.remoteRooms || Object.keys(memory.remoteRooms).length < 1){
			scouts = 1;
		}
	}
	if (rcl > 5){
		if (!memory.remoteRooms || Object.keys(memory.remoteRooms).length < 2){
			scouts = 2;
		}
	}
	memory[rS.name] = 0/*scouts*/;
}

function updateMiner(rooms, rcl8, memory, spawn){
	if (!memory.sources) memory.sources = {};
    if (rcl8 && _.keys(memory.sources).length > 2) memory.sources = {};
	let miners = 0;
    let miningRooms = rcl8 ? [spawn.room] : rooms;
    let sources = _.flatten(_.map(miningRooms, room => room.find(FIND_SOURCES)));

	_.each(sources, function(sourceInfo){
		let sourceId = sourceInfo.id;
		let sourcePos = sourceInfo.pos;
		if (!([sourceId] in memory.sources)){
            memory.sources[sourceId] = sourcePos;
        }
	});
	_.each(memory.sources, function(sourceInfo, source){
	    miners++;
		let room = sourceInfo.roomName;
		//if (Game.rooms[room] && !Game.rooms[room].controller.reservation){
			//delete(Game.spawns[city].memory.sources[source])\
			//console.log(Game.spawns[city].memory.sources[source])
			//this is currently not working
		//}
	});
	memory[rM.name] = miners;
}

function updateMineralMiner(rcl, buildings, spawn, memory) {
    memory[rMM.name] = 0;
    if (rcl > 5){
        var buildings = spawn.room.find(FIND_STRUCTURES);
        var extractor = _.find(buildings, structure => structure.structureType == STRUCTURE_EXTRACTOR);
        //console.log(extractor)
        if(extractor) {
            var cityObject = spawn.room;
            var minerals = cityObject.find(FIND_MINERALS);
            memory[rMM.name] = (minerals[0].mineralAmount < 1) ? 0 : 1;
        }
    }
}

function updateTransporter(extensions, memory) {
    if (extensions < 1){
        memory[rT.name] = 0;
    } else if (extensions < 10){
        memory[rT.name] = 1;
    } else if (extensions < 20){
        memory[rT.name] = 2;
    } else if (extensions < 60){
        memory[rT.name] = 3;
    } else {
        memory[rT.name] = 2;
    }
}

function updateUpgrader(city, controller, memory, rcl8, creeps) {
    if (rcl8){
        var modifier = Math.random() * 2000;
        if (controller.ticksToDowngrade < 100000 || (controller.room.storage.store.energy > 720000 && Game.cpu.bucket > (7500 + modifier))){
            Game.spawns[city].memory[rU.name] = 1
        } else if (controller.ticksToDowngrade > 180000){
            Game.spawns[city].memory[rU.name] = 0;
        }
    } else {
        var banks = u.getWithdrawLocations(creeps[0]);
        //console.log(banks);
        var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]));
        var capacity = _.sum(_.map(banks, bank => bank.storeCapacity));
        //console.log('money: ' + money + ', ' + (100*money/capacity));
        if(money < (capacity * .3)){
            memory[rU.name] = Math.max(memory[rU.name] - 1, 1); 
        }
        else if (money > (capacity * .32)){
            memory[rU.name] = Math.min(memory[rU.name] + 1, 6);
        } else {
            memory[rU.name] = 1;
        }
    }
}

function updateBuilder(rcl, memory, spawn, rooms, rcl8) {
    let buildRooms = rcl8 ? [spawn.room] : rooms;
    let constructionSites = _.flatten(_.map(buildRooms, room => room.find(FIND_MY_CONSTRUCTION_SITES)));
    if (!rcl8) {
        let buildings = _.flatten(_.map(buildRooms, room => room.find(FIND_STRUCTURES)));
        let repairSites = _.filter(buildings, structure => (structure.hits < (structure.hitsMax*0.3)) && (structure.structureType != STRUCTURE_WALL));
        var totalSites = (Math.floor((repairSites.length)/10) + constructionSites.length);
    } else {
        var totalSites = constructionSites.length;
    }
    if (totalSites > 0){
        memory[rB.name] = (totalSites > 10 && rcl > 2) ? 3 : 1;
    } else {
        memory[rB.name] = 0;
    }
}

function updateRunner(creeps, spawn, extensions, memory, rcl8) {
    if (rcl8) {
        memory[rR.name] = 0;
        return;
    }
    var miners = _.filter(creeps, creep => creep.memory.role == "miner" || creep.memory.role == "remoteMiner");
    var distances = _.map(miners, miner => PathFinder.search(spawn.pos, miner.pos).cost);
    var totalDistance = _.sum(distances);
    var minerEnergyPerTick = extensions < 5 ? 10 : 20;
    var energyProduced = 1.0 * totalDistance * minerEnergyPerTick;
    var energyCarried = types.carry(types.getRecipe('runner', extensions));
    memory[rR.name] = Math.min(8, Math.max(Math.ceil(energyProduced / energyCarried), 1));
}

function updateFerry(spawn, memory, rcl8) {
    if (rcl8) {
        memory[rF.name] = 1;
        return;
    }
    //check if we have a terminal
    var terminal = spawn.room.terminal
    var storage = spawn.room.storage;
    if (!(terminal === undefined)){
        if (terminal.store.energy < 150000){
            memory[rF.name] = 1;
        } else if (Object.keys(storage.store).length > 1){
            memory[rF.name] = 1;
        } else if (terminal.store.energy > 151000){
            memory[rF.name] = 1;
        } else if (terminal.store.power && storage.store.energy > 150000 && memory.ferryInfo.needPower === true){
            memory[rF.name] = 1;
        } else {
            memory[rF.name] = 0;
        }
    } else {
        memory[rF.name] = 0;
    }
}

function updateStorageLink(spawn, memory, structures) {
    if (!memory.storageLink){
        let storageLink = _.find(structures, structure => structure.structureType == STRUCTURE_LINK && structure.pos.inRangeTo(spawn.room.storage.pos, 3))
        if (storageLink){
            memory.storageLink = storageLink.id;
        }
    }
}

function updateHarasser(flag, memory, city) {
    memory[rH.name] = flag ? 1 : 0;
}

function updateBreaker(flag, memory, city) {
    memory[rBr.name] = flag ? 1 : 0;
    memory[rMe.name] = flag ? 1 : 0;
}

function updateDefender(flag, memory, city) {
    memory[rD.name] = flag ? 1 : 0;
    if (flag) memory[rMe.name]++;
}

function updatePowerMine(flag, memory, city) {
    memory[rPM.name] = flag ? 2 : 0;
    if (flag) memory[rMe.name] += 2;
    if (flag) memory[rT.name] = 4;
}

function updateTrooper(flag, memory, city) {
    memory[rTr.name] = flag ? 1 : 0;
    if (flag) memory[rMe.name]++;
}

function updateBigBreaker(flag, memory, city) {
    if (flag){
        let spawn = Game.spawns[city]
        let resources = ['XZHO2', 'XZH2O', 'XLHO2', 'XGHO2']
        let go = 1;
        for (var i = 0; i < resources.length; i++){
            if(spawn.room.terminal.store[resources[i]] < 1000){
                go = 0
            }
        }
        if(go){
            for (var i = 0; i < resources.length; i++){
                let lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
                if (lab.mineralAmount < 1000){
                    memory.ferryInfo.boosterInfo[i][1] = 1
                    memory.ferryInfo.boosterInfo[i][2] = resources[i]
                }
            }
            memory[rBB.name] = 1
            memory[rBM.name]++;
        } else {
            memory[rBB.name] = 0
        }
    }  else {
        for (let i = 0; i < 4; i++){
            let lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
            if (lab.mineralAmount){
                memory.ferryInfo.boosterInfo[i][1] = 2
            }
        }
        memory[rBB.name] = 0
    } 
}

function updateBigTrooper(flag, memory, city) {
    if (flag){
        let spawn = Game.spawns[city]
        let resources = ['XZHO2', 'XKHO2', 'XLHO2', 'XGHO2']
        let go = 1;
        for (var i = 0; i < resources.length; i++){
            if(spawn.room.terminal.store[resources[i]] < 1000){
                go = 0
            }
        }
        if(go){
            for (var i = 0; i < resources.length; i++){
                let lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
                if (lab.mineralAmount < 1000){
                    memory.ferryInfo.boosterInfo[i][1] = 1
                    memory.ferryInfo.boosterInfo[i][2] = resources[i]
                }
            }
            memory[rBT.name] = 1
            memory[rBM.name] = 1;
        } else {
            memory[rBT.name] = 0
            memory[rBM.name] = 0;
        }
    }  else {
        for (let i = 0; i < 4; i++){
            let lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
            if (lab.mineralAmount){
                memory.ferryInfo.boosterInfo[i][1] = 2
            }
        }
        memory[rBT.name] = 0
        memory[rBM.name] = 0;
    } 
}

function runObs(city){
	if(Game.time % 101 == 0){
		//check for Obs
		let buildings = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
		let obs = _.find(buildings, structure => structure.structureType === STRUCTURE_OBSERVER);
		if (obs){
			//check for list
			if (!Game.spawns[city].memory.powerRooms){
				Game.spawns[city].memory.powerRooms = [];
				let roomName = Game.spawns[city].room.name;
				let north = Number(roomName.slice(4,6)) - 1;
				let west = Number(roomName.slice(1,3)) - 1;
				for (var i = 0; i < 3; i++){
					for (var j = 0; j < 3; j++){
						let coord = 'W' + west.toString() + 'N' + north.toString();
						Game.spawns[city].memory.powerRooms.push(coord)
						north++
					}
					west++
					north = north - 3
				}
			}
			let roomNum = Game.time % Game.spawns[city].memory.powerRooms.length
			//scan next room
            obs.observeRoom(Game.spawns[city].memory.powerRooms[roomNum])

		}
	}
	if (Game.time % 101 == 1){
		//check for Obs and list
		let buildings = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
		let obs = _.find(buildings, structure => structure.structureType === STRUCTURE_OBSERVER);
		if (obs && Game.spawns[city].memory.powerRooms.length){
			//do stuff in that room
			let roomNum = (Game.time - 1) % Game.spawns[city].memory.powerRooms.length
			let roomName = Game.spawns[city].memory.powerRooms[roomNum]
			console.log('Scanning: ' + roomName)
			if (Game.rooms[roomName].controller){
				Game.spawns[city].memory.powerRooms.splice(roomNum, 1);
				return;
			}
			let structures = Game.rooms[roomName].find(FIND_STRUCTURES)
			let powerBank = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_BANK);
			let flagName = city + 'powerMine'
			if (powerBank && Game.cpu.bucket > 6000 && powerBank.ticksToDecay > 2500 && !Game.flags[flagName]
			    && Game.rooms[roomName].find(FIND_STRUCTURES).length < 10){
				//put a flag on it
				Game.rooms[roomName].createFlag(powerBank.pos, flagName)
				console.log('Power Bank found in: ' + roomName)
			}
		}
	}
}

module.exports = {
    runCity: runCity,
    updateCountsCity: updateCountsCity,
    runTowers: runTowers,
    updateScout: updateScout,
    runObs: runObs
};