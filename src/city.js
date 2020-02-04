var rMe = require('./medic');
var rDM = require('./depositMiner');
var rp = require('./roomplan');
var rBM = require('./bigMedic')
var rTr = require('./trooper')
var rBT = require('./bigTrooper')
var rBB = require('./bigBreaker')
var rH = require('./harasser');
var rSB = require('./spawnBuilder');
var rC = require('./claimer');
var rRo = require('./robber');
var rF = require('./ferry');
var rMM = require('./mineralMiner');
var rU = require('./upgrader');
var rB = require('./builder');
var rR = require('./runner');
var rBr = require('./breaker');
var rT = require('./transporter');
var rM = require('./remoteMiner');
var rD = require('./defender');
var types = require('./types');
var u = require('./utils')
var t = require('./tower')
var rPM = require('./powerMiner')
var labs = require('./labs')
var fact = require('./factory')
var sq = require('./spawnQueue')
var link = require('./link')
var settings = require('./settings')


function makeCreeps(role, type, target, city) {
    //console.log(types.getRecipe('basic', 2));
    let room = Game.spawns[city].room;
    var energyToSpend = (room.storage && room.storage.store.energy < 50000) ? room.energyAvailable :
            room.energyCapacityAvailable
    if (role == 'remoteMiner') {
        energyToSpend = room.energyCapacityAvailable
    }
    let recipe = types.getRecipe(type, energyToSpend, room);
    //console.log(role)
    let spawns = room.find(FIND_MY_SPAWNS);
    if(!Memory.counter){
        Memory.counter = 0;
    }
    let name = Memory.counter.toString();
    if (types.cost(recipe) <= room.energyAvailable){
        let spawn = u.getAvailableSpawn(spawns);
        //console.log(spawn);
        if(spawn != null) {
            try {
                Memory.counter++;
                spawn.spawnCreep(recipe, name);
                Game.creeps[name].memory.role = role;
                Game.creeps[name].memory.target = target;
                Game.creeps[name].memory.city = city;
                Game.creeps[name].memory.new = true;
            } catch (e) {
                throw new Error("Error making creep of role: " + role);
            }
        }
    }
}
//runCity function
function runCity(city, creeps){
    let spawn = Game.spawns[city]
    if (spawn){
        let room = spawn.room

        // Only build required roles during financial stress
        var coreRoles = [rF, rD, rT, rM, rR, rU, rB]
        var allRoles = [rF, rD, rT, rM, rR, rU, rB, rMM, rC, rSB, rH, rBM, rD, rBB, rBT, rMe, rTr, rBr, rPM, rRo, rDM] // order roles for priority
        var roles = (room.storage && room.storage.store.energy < 50000) ? coreRoles : allRoles

        // Get counts for roles by looking at all living and queued creeps
        var nameToRole = _.groupBy(allRoles, role => role.name); // map from names to roles
        var counts = _.countBy(creeps, creep => creep.memory.role); // lookup table from role to count
        let queuedCounts = sq.getCounts(spawn)
        _.forEach(roles, role => {
            let liveCount = counts[role.name] || 0
            let queueCount = queuedCounts[role.name] || 0
            counts[role.name] = liveCount + queueCount
        })

        //console.log(JSON.stringify(roles));
        let nextRole = _.find(roles, role => (typeof counts[role.name] == "undefined" && 
            spawn.memory[role.name]) || (counts[role.name] < spawn.memory[role.name]));
        // console.log(Game.spawns[city].memory.rM);

        // If quota is met, get a role from the spawn queue
        if (!nextRole) {
            let spawnQueueRoleName = sq.getNextRole(spawn)
            nextRole = spawnQueueRoleName ? nameToRole[spawnQueueRoleName][0] : undefined
        }

        if (nextRole) {
            //console.log(JSON.stringify(nextRole));
            makeCreeps(nextRole.name, nextRole.type, nextRole.target(), city);
        }
    
        // Print out each role & number of workers doing it
        // var printout = _.map(roles, role => role.name + ": " + counts[role.name]);
        //console.log(city + ': ' + printout.join(', ' ));
    
        // Run all the creeps in this city
        _.forEach(creeps, (creep) => nameToRole[creep.memory.role][0].run(creep)/* || console.log(creep.memory.role + ' ' + Game.cpu.getUsed())*/);
        
        link.run(room)

        //run powerSpawn
        runPowerSpawn(city);
        labs.runLabs(city);
        fact.runFactory(city);
        checkNukes(room);
    }
}
//updateCountsCity function
function updateCountsCity(city, creeps, rooms, closestRoom) {
    let spawn = Game.spawns[city];
    if (spawn){
        let memory = spawn.memory;
        let controller = spawn.room.controller;
        let rcl = controller.level;
        let rcl8 = rcl > 7;
        let emergencyTime = spawn.room.storage && spawn.room.storage.store.energy < 5000 || 
                    (rcl > 6 && !spawn.room.storage)
        let logisticsTime = rcl8 && !emergencyTime ? 500 : 50;
        if(Game.time % 200 == 0){
            updateMilitary(city, memory, rooms);
        }
        if (Game.time % logisticsTime == 0) {
            const structures = spawn.room.find(FIND_STRUCTURES);
            const extensions = _.filter(structures, structure => structure.structureType == STRUCTURE_EXTENSION).length;
            let rcl8Room = _.find(Game.rooms, room => room.controller && room.controller.owner && room.controller.owner.username == "Yoner" && room.controller.level == 8)
            updateRunner(creeps, spawn, extensions, memory, rcl, emergencyTime);
            updateFerry(spawn, memory, rcl);
            updateMiner(rooms, rcl8Room, memory, spawn);
        
            if (Game.time % 500 === 0) {
                runNuker(city)
                checkLabs(city)
                updateTransporter(extensions, memory);
                updateColonizers(city, memory, closestRoom);
                updateUpgrader(city, controller, memory, rcl8, creeps, rcl);
                updateBuilder(rcl, memory, spawn, rooms, rcl8);
                updateMineralMiner(rcl, structures, spawn, memory);
                updatePowerSpawn(city, memory)
                updateStorageLink(spawn, memory, structures);
            }
            makeEmergencyCreeps(extensions, creeps, city, rcl8, emergencyTime); 
        }
        updateDefender(rooms, memory, rcl8);
    }
}

function checkNukes(room){
    if(Game.time % 1000 === 3){
        const nukes = room.find(FIND_NUKES);
        if(nukes.length){
            Game.notify("Nuclear launch detected in " + room.name)
        }
    }
}

function makeEmergencyCreeps(extensions, creeps, city, rcl8, emergency) {
    let checkTime = rcl8 ? 2000 : 150;

    if (emergency || Game.time % checkTime == 0 && extensions >= 5) {
        if (_.filter(creeps, creep => creep.memory.role == 'remoteMiner') < 1){
            console.log('Making Emergency Miner');
            makeCreeps('remoteMiner', "lightMiner", 1, city);
        }

        if (_.filter(creeps, creep => creep.memory.role == 'transporter') < 1){
            console.log('Making Emergency Transporter');
            makeCreeps('transporter', 'basic', 0, city);
        }

        // TODO disable if links are present (not rcl8!! links may be missing for rcl8)
        if ((emergency || !rcl8) && _.filter(creeps, creep => creep.memory.role == 'runner') < 1) {
            console.log('Making Emergency Runner')
            makeCreeps('runner', 'erunner', 1, city);
        }
    }
}

// Run the tower function
function runTowers(city){
    if (Game.spawns[city]){
        if(Game.spawns[city].memory.towersActive == undefined){
            Game.spawns[city].memory.towersActive = false
        }
        if(Game.spawns[city].memory.towersActive == false && Game.time % 10 != 0){
            return;
        }
        var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER && structure.room.memory.city == city);
        var hostileCreep = Game.spawns[city].room.find(FIND_HOSTILE_CREEPS)
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
        let target = null;
        if (Game.time % 10 === 0) {
            var damaged = Game.spawns[city].room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure) && structure.hits < (structure.hitsMax * 0.1);
                    }
            });
            notWalls = _.reject(damaged, location => location.structureType == STRUCTURE_WALL || location.structureType == STRUCTURE_RAMPART);
        }
        if(hostiles.length > 0){
            console.log('Towers up in ' + city)
            Game.spawns[city].memory.towersActive = true
            //identify target 
            target = t.chooseTarget(towers, hostiles);
        } else {
            Game.spawns[city].memory.towersActive = false
        }
        for (let i = 0; i < towers.length; i++){
            if(target){
                towers[i].attack(target);
            } else if (injured.length > 0 && !hostiles.length){
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
        if(powerSpawn && powerSpawn.energy >= 50 && powerSpawn.power > 0 && powerSpawn.room.storage.store.energy > 650000 && Game.cpu.bucket > 3000){
            powerSpawn.processPower();
        }
    }
}

function updatePowerSpawn(city, memory) {
    if (!memory.ferryInfo){
        memory.ferryInfo = {}
    }
    let powerSpawn = _.find(Game.structures, (structure) => structure.structureType == STRUCTURE_POWER_SPAWN && structure.room.memory.city == city);
    if (powerSpawn){
        memory.powerSpawn = powerSpawn.id
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
    for(let i = 1; i < labs.length; i++){
        if(labs[0].pos.inRangeTo(labs[i].pos, 2)){
            group1.push(labs[i].id)
        } else {
            group2.push(labs[i].id)
        }
    }
    if (group1.length == 6){
        for (let i = 0; i < 6; i++){
            spawn.memory.ferryInfo.labInfo[i] = [];
            spawn.memory.ferryInfo.labInfo[i][0] = group1[i]
            spawn.memory.ferryInfo.labInfo[i][1] = 0
            spawn.memory.ferryInfo.labInfo[i][2] = null
        }
        for (let i = 0; i < 4; i++){
            spawn.memory.ferryInfo.boosterInfo[i] = [];
            spawn.memory.ferryInfo.boosterInfo[i][0] = group2[i]
            spawn.memory.ferryInfo.boosterInfo[i][1] = 0
            spawn.memory.ferryInfo.boosterInfo[i][2] = null
        }
    } else {
        for (let i = 0; i < 6; i++){
            spawn.memory.ferryInfo.labInfo[i] = [];
            spawn.memory.ferryInfo.labInfo[i][0] = group2[i]
            spawn.memory.ferryInfo.labInfo[i][1] = 0
            spawn.memory.ferryInfo.labInfo[i][2] = null
        }
        for (let i = 0; i < 4; i++){
            spawn.memory.ferryInfo.boosterInfo[i] = [];
            spawn.memory.ferryInfo.boosterInfo[i][0] = group1[i]
            spawn.memory.ferryInfo.boosterInfo[i][1] = 0
            spawn.memory.ferryInfo.boosterInfo[i][2] = null
        }
    }
}

function updateMilitary(city, memory, rooms) {
    let flags = ['harass', 'break', 'powerMine', 'bigShoot', 'shoot', 'bigBreak', 'deposit'];
    let updateFns = [updateHarasser, updateBreaker, updatePowerMine, updateBigTrooper, updateTrooper, updateBigBreaker, updateDepositMiner];
    let big = 0
    for (var i = 0; i < flags.length; i++) {
        let flagName = city + flags[i];
        let updateFn = updateFns[i];
        updateFn(Game.flags[flagName], memory, city, rooms);
        if(Game.flags[flagName] && flagName.includes('big')){
            big = 1
        }
    }
    if(!big){
        emptyBoosters(memory);
    }
}

function emptyBoosters(memory){
    if(memory.ferryInfo.boosterInfo){
        for (let i = 0; i < 4; i++){
            let lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
            if (lab && lab.mineralAmount){
                memory.ferryInfo.boosterInfo[i][1] = 2
            }
        }
    }
}

function chooseColonizerRoom(myCities){
    if(!Game.flags.claim && !Game.flags.unclaim){
        return 0;
    }
    let goodCities = _.filter(myCities, city => city.controller.level >= 4 && Game.spawns[city.memory.city] && city.storage);
    let claimRoom = Game.flags.unclaim ? Game.flags.unclaim.pos.roomName: Game.flags.claim.pos.roomName
    let closestRoom = goodCities[0].name;
    for (let i = 0; i < goodCities.length; i += 1){
        if(Game.map.getRoomLinearDistance(goodCities[i].name, claimRoom) < Game.map.getRoomLinearDistance(closestRoom, claimRoom) && goodCities[i].name != claimRoom){
            closestRoom =  goodCities[i].name;
        }
    }
    return closestRoom;
}

function updateColonizers(city, memory, closestRoom) {
    //claimer and spawnBuilder reset
    // TODO only make a claimer if city is close
    let roomName = Game.spawns[city].room.name
    if(roomName == closestRoom){
        if(Game.flags.claim){
            if(Game.spawns[city].room.controller.level < 7){
                memory[rSB.name] = 4;
            } else if(Game.flags.claim.room && Game.flags.claim.room.controller && Game.flags.claim.room.controller.level > 6) {
                memory[rSB.name] = 4;
            } else {
                memory[rSB.name] = 2;
            }
        } else {
            memory[rSB.name] = 0;
        }
        if(Game.flags.claim && Game.flags.claim.room && Game.flags.claim.room.controller.my){
            memory[rC.name] = 0;
        } else {
            memory[rC.name] = Game.flags.claim ? 1 : 0;
        }
        if(Game.time % 1000 === 0){
            memory[rC.name] = Game.flags.unclaim ? 1 : memory[rC.name];
        }
    } else {
        memory[rSB.name] = 0;
        memory[rC.name] = 0;
    }
    //memory[rRo.name] = 0;
}

// Automated defender count for defense
function updateDefender(rooms, memory, rcl8) {
    if (Game.time % 30 == 0) {
        if(rcl8){
            memory[rD.name] = 0;
            return;
        }
        var enemyCounts = _.map(rooms, room => {
            var allBadCreeps = _.filter(room.find(FIND_HOSTILE_CREEPS), creep => creep.getActiveBodyparts(ATTACK) > 0
                    || creep.getActiveBodyparts(RANGED_ATTACK) > 0 
                    || creep.getActiveBodyparts(CLAIM) > 0
                    || creep.getActiveBodyparts(HEAL) > 0)
            var invaders = _.reject(allBadCreeps, creep => creep.owner.username == "Source Keeper");
            return invaders.length;
        });
        memory[rD.name] = _.sum(enemyCounts);
    }
}

function updateMiner(rooms, rcl8Room, memory, spawn){
    if (!memory.sources) memory.sources = {};
    if (rcl8Room && _.keys(memory.sources).length > 2) memory.sources = {};
    let miners = 0;
    let miningRooms = rcl8Room ? [spawn.room] : rooms;
    let sources = _.flatten(_.map(miningRooms, room => room.find(FIND_SOURCES)));

    _.each(sources, function(sourceInfo){
        let sourceId = sourceInfo.id;
        let sourcePos = sourceInfo.pos;
        if (!([sourceId] in memory.sources)){
            memory.sources[sourceId] = sourcePos;
        }
    });
    _.each(memory.sources, () => miners++)
    if(Game.flags.claim && Game.flags.claim.pos.roomName === spawn.pos.roomName &&
        Game.flags.claim.room.controller.level < 6){
        memory[rM.name] = 0;
        return;
    }
    memory[rM.name] = miners;
}

function updateMineralMiner(rcl, buildings, spawn, memory) {
    memory[rMM.name] = 0;
    if (rcl > 5){
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
    } else {
        memory[rT.name] = 2;
    }
}

function updateUpgrader(city, controller, memory, rcl8, creeps, rcl) {
    if (rcl8){
        var modifier = Math.random() * 2000;
        if (controller.ticksToDowngrade < 100000 || (controller.room.storage.store.energy > 720000 && Game.cpu.bucket > (7500 + modifier))){
            Game.spawns[city].memory[rU.name] = 1
        } else if (controller.ticksToDowngrade > 180000){
            Game.spawns[city].memory[rU.name] = 0;
        }
    } else {
        if(rcl >= 6 && Game.spawns[city].room.storage && Game.spawns[city].room.storage.store[RESOURCE_ENERGY] < 250000
                && Game.spawns[city].room.terminal && Game.spawns[city].room.terminal.store[RESOURCE_CATALYZED_GHODIUM_ACID] < 1000
                && controller.ticksToDowngrade > CONTROLLER_DOWNGRADE[rcl.toString()]/2){
            memory[rU.name] = 0;
            return;
        }
        let constructionSites = Game.spawns[city].room.find(FIND_MY_CONSTRUCTION_SITES)
        if(constructionSites.length){
            memory[rU.name] = 1;
            return;
        }
        var banks = u.getWithdrawLocations(creeps[0]);
        //console.log(banks);
        var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]));
        var capacity = _.sum(_.map(banks, bank => bank.store.getCapacity()));
        //console.log('money: ' + money + ', ' + (100*money/capacity));
        if(money < (capacity * .28)){
            memory[rU.name] = Math.max(memory[rU.name] - 1, 1); 
        }
        else if (money > (capacity * .28)){
            memory[rU.name] = Math.min(memory[rU.name] + 1, 6);
        } else {
            memory[rU.name] = 1;
        }
    }
}

function updateBuilder(rcl, memory, spawn, rooms, rcl8) {
    let buildRooms = rcl8 ? [spawn.room] : rooms;
    let constructionSites = _.flatten(_.map(buildRooms, room => room.find(FIND_MY_CONSTRUCTION_SITES)));
    var totalSites;
    if (rcl < 7) {
        let buildings = _.flatten(_.map(buildRooms, room => room.find(FIND_STRUCTURES)));
        let repairSites = _.filter(buildings, structure => (structure.hits < (structure.hitsMax*0.3)) && (structure.structureType != STRUCTURE_WALL));
        totalSites = (Math.floor((repairSites.length)/10) + constructionSites.length);
    } else {
        totalSites = constructionSites.length;
    }
    if (totalSites > 0){
        // If room is full of energy and there is contruction, make a builder
        let room = spawn.room
        if (room.energyAvailable == room.energyCapacityAvailable) {
            sq.schedule(spawn, "builder")
        }
        memory[rB.name] = (totalSites > 10 && rcl > 2 && rcl < 6) ? 3 : 1;
    } else {
        memory[rB.name] = 0;
    }
    if(rcl >= 7 && Game.cpu.bucket > 8000 && spawn.room.storage && spawn.room.storage.store.energy > 550000){
        //make builder if lowest wall is below 5mil hits
        const walls = _.filter(spawn.room.find(FIND_STRUCTURES), struct => struct.structureType === STRUCTURE_RAMPART || struct.structureType === STRUCTURE_WALL)
        if(walls.length){//find lowest hits wall
            let sortedWalls = _.sortBy(walls, wall => wall.hits)
            if(sortedWalls[0].hits < 10000000){
                memory[rB.name]++;
            }
        }
    }
}

function updateRunner(creeps, spawn, extensions, memory, rcl, emergencyTime) {
    if (rcl > 6 && !emergencyTime) {
        memory[rR.name] = 0;
        return;
    }
    var miners = _.filter(creeps, creep => creep.memory.role == "miner" || creep.memory.role == "remoteMiner");
    var distances = _.map(miners, miner => PathFinder.search(spawn.pos, miner.pos).cost);
    var totalDistance = _.sum(distances);
    var minerEnergyPerTick = extensions < 5 ? 10 : 20;
    var energyProduced = 1.0 * totalDistance * minerEnergyPerTick;
    var energyCarried = types.carry(types.getRecipe('runner', spawn.room.energyAvailable, spawn.room));
    memory[rR.name] = Math.min(8, Math.max(Math.ceil(energyProduced / energyCarried), 2));
}

function updateFerry(spawn, memory, rcl) {
    if (rcl >= 7) {
        memory[rF.name] = 1;
        return;
    }
    //check if we have a terminal
    var terminal = spawn.room.terminal
    var storage = spawn.room.storage;
    if (terminal && storage) {
        if (terminal.store.energy < 50000 || Object.keys(storage.store).length > 1 || terminal.store.energy > 51000){
            memory[rF.name] = 1;
        } else {
            memory[rF.name] = 0;
        }
    } else {
        memory[rF.name] = 0;
    }
}

function updateStorageLink(spawn, memory, structures) {
    if(!structures.length || !Game.getObjectById(memory.storageLink)){
        memory.storageLink = null;
    }
    if(!spawn.room.storage) {
        return
    }

    let storageLink = _.find(structures, structure => structure.structureType == STRUCTURE_LINK && structure.pos.inRangeTo(spawn.room.storage.pos, 3))
    if (storageLink){
        memory.storageLink = storageLink.id;
    } else {
        memory.storageLink = null;
    }
}

function updateHarasser(flag, memory) {
    memory[rH.name] = flag ? 1 : 0;
}

function updateBreaker(flag, memory) {
    memory[rBr.name] = flag ? 1 : 0;
    memory[rMe.name] = flag ? 1 : 0;
}

function updatePowerMine(flag, memory) {
    memory[rPM.name] = flag ? 2 : 0;
    if (flag) memory[rMe.name] += 2;
}

function updateDepositMiner(flag, memory) {
    memory[rDM.name] = flag ? 1 : 0;
}

function updateTrooper(flag, memory) {
    // add troopers for a shoot
    memory[rTr.name] = flag ? 1 : 0;
    if (flag) memory[rMe.name]++;
}

function updateBigBreaker(flag, memory, city) {
    if (flag){
        let spawn = Game.spawns[city]
        let resources = ['XZHO2', 'XZH2O', 'XLHO2', 'XGHO2']
        let go = 1;
        for (let i = 0; i < resources.length; i++){
            if(spawn.room.terminal.store[resources[i]] < 1000){
                go = 0
            }
            if(spawn.room.terminal.store[resources[i]] < 2000){
                spawn.memory.ferryInfo.mineralRequest = resources[i];
            }
        }
        if(go){
            for (let i = 0; i < resources.length; i++){
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
        memory[rBB.name] = 0
    } 
}

function updateBigTrooper(flag, memory, city) {
    if (flag){
        let spawn = Game.spawns[city]
        let resources = ['XZHO2', 'XKHO2', 'XLHO2', 'XGHO2']
        let go = 1;
        for (let i = 0; i < resources.length; i++){
            if(spawn.room.terminal.store[resources[i]] < 1000){
                go = 0
            }
            if(spawn.room.terminal.store[resources[i]] < 2000){
                spawn.memory.ferryInfo.mineralRequest = resources[i];
            }
        }
        if(go){
            for (let i = 0; i < resources.length; i++){
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
        memory[rBT.name] = 0
        memory[rBM.name] = 0;
    } 
}

function runNuker(city){
    let flag = city + 'nuke'
    if(Game.flags[flag]){
        let nuker = _.find(Game.spawns[city].room.find(FIND_MY_STRUCTURES), structure => structure.structureType === STRUCTURE_NUKER);
        nuker.launchNuke(Game.flags[flag].pos);
        Game.flags[flag].remove();
    }
}

function runObs(city){
    if(Game.time % 100 == 0){
        //check for Obs
        if((!Game.spawns[city]) || Game.cpu.bucket < settings.bucket.mining - 200 || settings.miningDisabled.includes(city)){
            return;
        }
        let buildings = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
        let obs = _.find(buildings, structure => structure.structureType === STRUCTURE_OBSERVER);
        if (obs){
            //check for list
            if (!Game.spawns[city].memory.powerRooms){
                Game.spawns[city].memory.powerRooms = [];
                let myRoom = Game.spawns[city].room.name
                let pos = rp.roomNameToPos(myRoom)
                let x = pos[0] - 2;
                let y = pos[1] - 2;
                for (let i = 0; i < 5; i++){
                    for (let j = 0; j < 5; j++){
                        let coord = [x, y]
                        let roomName = rp.roomPosToName(coord);
                        Game.spawns[city].memory.powerRooms.push(roomName)
                        x++
                    }
                    y++
                    x = x - 5;
                }
            }
            let roomNum = ((Game.time) % (Game.spawns[city].memory.powerRooms.length * 100))/100
            //scan next room
            obs.observeRoom(Game.spawns[city].memory.powerRooms[roomNum])

        }
    }
    if (Game.time % 100 == 1){
        //check for Obs and list
        if(!Game.spawns[city] || Game.cpu.bucket < settings.bucket.mining || settings.miningDisabled.includes(city)){
            return;
        }
        let buildings = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
        let obs = _.find(buildings, structure => structure.structureType === STRUCTURE_OBSERVER);
        if (obs && Game.spawns[city].memory.powerRooms.length){
            //do stuff in that room
            let roomNum = ((Game.time - 1) % (Game.spawns[city].memory.powerRooms.length * 100))/100
            let roomName = Game.spawns[city].memory.powerRooms[roomNum]
            console.log('Scanning: ' + roomName)
            if(!Game.rooms[roomName]){//early return if room wasn't scanned
                return;
            }
            if (Game.rooms[roomName].controller){
                Game.spawns[city].memory.powerRooms.splice(roomNum, 1);
                return;
            }
            let structures = Game.rooms[roomName].find(FIND_STRUCTURES)
            let powerBank = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_BANK);
            let flagName = city + 'powerMine'
            if (powerBank && powerBank.power > 1500 && powerBank.ticksToDecay > 2800 && !Game.flags[flagName] &&
                    structures.length < 30 && Game.spawns[city].room.storage.store.energy > 600000){
                let walls = 0
                let terrain = Game.rooms[roomName].getTerrain();
                let x = powerBank.pos.x - 1
                let y = powerBank.pos.y - 1
                for(let i = 0; i < 3; i++){
                    for (let j = 0; j < 3; j++){
                        let result = terrain.get(x,y);
                        if (result == TERRAIN_MASK_WALL){
                            walls++
                        }
                        x++
                    }
                    x = x - 3
                    y++
                }
                console.log(walls)
                if(walls < 8){
                    //put a flag on it
                    Game.rooms[roomName].createFlag(powerBank.pos, flagName)
                    console.log('Power Bank found in: ' + roomName)
                }
            }
            //flag deposits
            if(structures.length < 30){
                let deposits = Game.rooms[roomName].find(FIND_DEPOSITS)
                if(deposits.length){
                    let depositFlagName = city + 'deposit';
                    let flagPlaced = Game.flags[depositFlagName] ? true : false;
                    for (let i = 0; i < deposits.length; i++) {
                        if(deposits[i].lastCooldown < 25 && flagPlaced === false){
                            Game.rooms[roomName].createFlag(deposits[i].pos, depositFlagName)
                            Game.spawns[city].memory.deposit = Math.floor(Math.pow((deposits[i].lastCooldown / 0.001), 1/1.2))
                            flagPlaced = true;
                        }
                    }
                }
            }
        }
    }
}

module.exports = {
    chooseColonizerRoom: chooseColonizerRoom,
    runCity: runCity,
    updateCountsCity: updateCountsCity,
    runTowers: runTowers,
    runObs: runObs
};
