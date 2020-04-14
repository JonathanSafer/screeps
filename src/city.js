var rMe = require("./medic")
var rDM = require("./depositMiner")
var rBM = require("./bigMedic")
var rTr = require("./trooper")
var rBT = require("./bigTrooper")
var rBB = require("./bigBreaker")
var rH = require("./harasser")
var rSB = require("./spawnBuilder")
var rC = require("./claimer")
var rUC = require("./unclaimer")
var rF = require("./ferry")
var rMM = require("./mineralMiner")
var rU = require("./upgrader")
var rB = require("./builder")
var rR = require("./runner")
var rBr = require("./breaker")
var rT = require("./transporter")
var rM = require("./remoteMiner")
var rD = require("./defender")
var types = require("./types")
var u = require("./utils")
var t = require("./tower")
var rPM = require("./powerMiner")
var labsLib = require("./labs")
var fact = require("./factory")
var sq = require("./spawnQueue")
var link = require("./link")
var settings = require("./settings")
var rr = require("./roles")
var e = require("./error")
var template = require("./template")


function makeCreeps(role, type, target, city, unhealthyStore, boosted) {
    //Log.info(types.getRecipe('basic', 2));
    const room = Game.spawns[city].room
   
    var energyToSpend = unhealthyStore ? room.energyAvailable :
        room.energyCapacityAvailable

    const recipe = types.getRecipe(type, energyToSpend, room, boosted)
    //Log.info(role)
    const spawns = room.find(FIND_MY_SPAWNS)
    if(!Memory.counter){
        Memory.counter = 0
    }
    const name = Memory.counter.toString()
    if (types.cost(recipe) > room.energyAvailable) return false
    const spawn = u.getAvailableSpawn(spawns)
    //Log.info(spawn);
    if (!spawn) return false

    Memory.counter++
    const result = spawn.spawnCreep(recipe, name)
    if (result) { // don't spawn and throw an error at the end of the tick
        e.reportError(new Error(`Error making ${role} in ${city}: ${result}`))
        return
    }
    Game.creeps[name].memory.role = role
    Game.creeps[name].memory.target = target
    Game.creeps[name].memory.city = city
    Game.creeps[name].memory.needBoost = boosted
    return true
}

//runCity function
function runCity(city, creeps){
    const spawn = Game.spawns[city]
    if (!spawn) return false
    const room = spawn.room
    // Clear all commodity moves: spawn.memory.ferryInfo.comSend = []

    // Only build required roles during financial stress
    const emergencyRoles = rr.getEmergencyRoles()
    const allRoles = rr.getRoles()

    const storage = u.getStorage(room)
    const halfCapacity = storage && storage.store.getCapacity() / 2
    const unhealthyStore = storage && storage.store[RESOURCE_ENERGY] < Math.min(5000, halfCapacity)
    var roles = (unhealthyStore) ? emergencyRoles : allRoles

    // Get counts for roles by looking at all living and queued creeps
    var nameToRole = _.groupBy(allRoles, role => role.name) // map from names to roles
    var counts = _.countBy(creeps, creep => creep.memory.role) // lookup table from role to count
    const queuedCounts = sq.getCounts(spawn)
    _.forEach(roles, role => {
        const liveCount = counts[role.name] || 0
        const queueCount = queuedCounts[role.name] || 0
        counts[role.name] = liveCount + queueCount
    })
    
    
    let usedQueue = true
    const nextRoleInfo = sq.getNextRole(spawn)
    const spawnQueueRoleName = nextRoleInfo.role
    let nextRole = spawnQueueRoleName ? nameToRole[spawnQueueRoleName][0] : undefined

    if (!nextRole) {
        nextRole = _.find(roles, role => (typeof counts[role.name] == "undefined" && 
        spawn.memory[role.name]) || (counts[role.name] < spawn.memory[role.name]))
        usedQueue = false
    }
    
    if (nextRole) {
        //Log.info(JSON.stringify(Object.entries(nextRole)))
        if(makeCreeps(nextRole.name, nextRole.type, nextRole.target(Game.spawns[city], nextRoleInfo.boosted), city, unhealthyStore, nextRoleInfo.boosted) && usedQueue){
            spawn.memory.sq.shift()
        }
    }

    // Run all the creeps in this city
    _.forEach(creeps, (creep) => {
        nameToRole[creep.memory.role][0].run(creep)
    })
    
    link.run(room)

    //run powerSpawn
    runPowerSpawn(city)
    labsLib.run(city)
    fact.runFactory(city)
    checkNukes(room)
}

//updateCountsCity function
function updateCountsCity(city, creeps, rooms, claimRoom, unclaimRoom) {
    const spawn = Game.spawns[city]
    if (!spawn) return false
    const memory = spawn.memory
    const controller = spawn.room.controller
    const rcl = controller.level
    const rcl8 = rcl > 7
    const emergencyTime = spawn.room.storage && spawn.room.storage.store.energy < 5000 || 
                (rcl > 6 && !spawn.room.storage)
    const logisticsTime = rcl8 && !emergencyTime ? 500 : 50

    // Always update defender
    updateDefender(rooms, memory, rcl8)

    if(Game.time % 200 == 0){
        updateMilitary(city, memory, rooms)
    }
    if (Game.time % logisticsTime == 0) {
        const structures = spawn.room.find(FIND_STRUCTURES)
        const extensions = _.filter(structures, structure => structure.structureType == STRUCTURE_EXTENSION).length
        updateRunner(creeps, spawn, extensions, memory, rcl, emergencyTime)
        updateFerry(spawn, memory, rcl)
        updateMiner(rooms, rcl8, memory, spawn)
    
        if (Game.time % 500 === 0) {
            runNuker(city)
            checkLabs(city)
            updateTransporter(extensions, memory, creeps)
            updateColonizers(city, memory, claimRoom, unclaimRoom)
            updateUpgrader(city, controller, memory, rcl8, creeps, rcl)
            updateBuilder(rcl, memory, spawn, rooms, rcl8)
            updateMineralMiner(rcl, structures, spawn, memory)
            updatePowerSpawn(city, memory)
            updateStorageLink(spawn, memory, structures)
        }
        makeEmergencyCreeps(extensions, creeps, city, rcl8, emergencyTime) 
    }
}

function checkNukes(room){
    if(Game.time % 1000 === 3){
        const nukes = room.find(FIND_NUKES)
        if(nukes.length){
            Game.notify("Nuclear launch detected in " + room.name, 720)
        }
    }
}

function makeEmergencyCreeps(extensions, creeps, city, rcl8, emergency) {
    const checkTime = rcl8 ? 200 : 50
    const memory = Game.spawns[city].memory

    if (emergency || Game.time % checkTime == 0 && extensions >= 5) {
        if (_.filter(creeps, creep => creep.memory.role == "remoteMiner") < 1 && memory[rM.role] > 0){
            Log.info("Making Emergency Miner")
            makeCreeps("remoteMiner", "miner", 1, city, true)
        }

        if (_.filter(creeps, creep => creep.memory.role == "transporter") < 1){
            Log.info("Making Emergency Transporter")
            makeCreeps("transporter", "transporter", 0, city, true)
        }

        // TODO disable if links are present (not rcl8!! links may be missing for rcl8)
        if ((emergency || !rcl8) && _.filter(creeps, creep => creep.memory.role == "runner" ) < 1 && memory.runner > 0) {
            Log.info("Making Emergency Runner")
            makeCreeps("runner", "runner", 1, city, true)
        }
    }
}

// Run the tower function
function runTowers(city){
    if (Game.spawns[city]){
        if(Game.spawns[city].memory.towersActive == undefined){
            Game.spawns[city].memory.towersActive = false
        }
        const checkTime = 20
        if(Game.spawns[city].memory.towersActive == false && Game.time % checkTime != 0){
            return
        }
        var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER && structure.room.memory.city == city)
        var hostileCreep = Game.spawns[city].room.find(FIND_HOSTILE_CREEPS)
        var injuredCreep = Game.spawns[city].room.find(FIND_MY_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        var injuredPower = Game.spawns[city].room.find(FIND_MY_POWER_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        var hostilePower = Game.spawns[city].room.find(FIND_HOSTILE_POWER_CREEPS)
        var hostiles = hostilePower.concat(hostileCreep)
        var injured = injuredPower.concat(injuredCreep)
        let damaged = null
        let repair = 0
        let target = null
        if (Game.time % checkTime === 0) {
            const needRepair = _.filter(Game.spawns[city].room.find(FIND_STRUCTURES), s => s.structureType != STRUCTURE_WALL
                && s.structureType != STRUCTURE_RAMPART
                && s.hitsMax - s.hits > TOWER_POWER_REPAIR)//structure must need at least as many hits missing as a minimum tower shot
            if(needRepair.length){
                damaged =  _.min(needRepair, function(s) {
                    return s.hits/s.hitsMax
                })
            }
            if(damaged){
                repair = damaged.hitsMax - damaged.hits
            }
        }
        if(hostiles.length > 0){
            Log.info("Towers up in " + city)
            Game.spawns[city].memory.towersActive = true
            //identify target 
            target = t.chooseTarget(towers, hostiles)
        } else {
            Game.spawns[city].memory.towersActive = false
        }
        for (let i = 0; i < towers.length; i++){
            if(target){
                towers[i].attack(target)
            } else if (injured.length > 0 && !hostiles.length){
                towers[i].heal(injured[0])
            } else if (Game.time % checkTime === 0 && damaged){
                if(repair < TOWER_POWER_REPAIR * (1 - TOWER_FALLOFF)){
                    continue
                }
                const distance = towers[i].pos.getRangeTo(damaged.pos)
                const damage_distance = Math.max(TOWER_OPTIMAL_RANGE, Math.min(distance, TOWER_FALLOFF_RANGE))
                const steps = TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE
                const step_size = TOWER_FALLOFF * TOWER_POWER_REPAIR / steps
                const repStrength = TOWER_POWER_REPAIR - (damage_distance - TOWER_OPTIMAL_RANGE) * step_size
                if(repStrength <= repair){
                    towers[i].repair(damaged)
                    repair -= repStrength 
                }
            }
        }
    }
}

//Run the powerSpawn
function runPowerSpawn(city){
    if(Game.spawns[city]){
        if (!Game.spawns[city].memory.powerSpawn){
            return
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
        if(powerSpawn && powerSpawn.energy >= 50 && powerSpawn.power > 0 && powerSpawn.room.storage.store.energy > settings.energy.processPower && Game.cpu.bucket > settings.bucket.processPower){
            powerSpawn.processPower()
        }
    }
}

function updatePowerSpawn(city, memory) {
    if (!memory.ferryInfo){
        memory.ferryInfo = {}
    }
    const powerSpawn = _.find(Game.structures, (structure) => structure.structureType == STRUCTURE_POWER_SPAWN && structure.room.memory.city == city)
    if (powerSpawn){
        memory.powerSpawn = powerSpawn.id
    }
}

function initLabInfo(memory){
    if(!memory.ferryInfo){
        memory.ferryInfo = {}
    }
    if(!memory.ferryInfo.labInfo){
        memory.ferryInfo.labInfo = {}
        memory.ferryInfo.labInfo.receivers = {}
        memory.ferryInfo.labInfo.reactors = {}
    }
}

function checkLabs(city){
    const spawn = Game.spawns[city]
    const labs = _.filter(spawn.room.find(FIND_MY_STRUCTURES), structure => structure.structureType === STRUCTURE_LAB)
    if (labs.length < 3){
        return
    }
    initLabInfo(spawn.memory)
    //check if we need to do a rescan
    let rescan = false
    const receivers = Object.keys(spawn.memory.ferryInfo.labInfo.receivers)
    const reactors = Object.keys(spawn.memory.ferryInfo.labInfo.reactors)
    for(let i = 0; i < receivers.length; i++){
        if(!Game.getObjectById(receivers[i])){
            rescan = true
        }
    }
    for(let i = 0; i < reactors.length; i++){
        if(!Game.getObjectById(reactors[i])){
            rescan = true
        }
    }
    if(labs.length > receivers.length + reactors.length){
        rescan = true
    }
    if(!rescan){
        return
    }

    //now we need a rescan, but we must make sure not to overwrite any labInfo that already exists
    const unassignedLabs = _.filter(labs, lab => !receivers.includes(lab.id) && !reactors.includes(lab.id))
    const plan = spawn.room.memory.plan
    for(let i = 0; i < unassignedLabs.length; i++){
        const templatePos = {"x": unassignedLabs[i].pos.x + template.offset.x - plan.x, "y": unassignedLabs[i].pos.y + template.offset.y - plan.y}
        if((templatePos.x == template.buildings.lab.pos[0].x && templatePos.y == template.buildings.lab.pos[0].y) 
            ||(templatePos.x == template.buildings.lab.pos[1].x && templatePos.y == template.buildings.lab.pos[1].y)){
            //lab is a reactor
            spawn.memory.ferryInfo.labInfo.reactors[unassignedLabs[i].id] = {}
        } else {
            //lab is a receiver
            spawn.memory.ferryInfo.labInfo.receivers[unassignedLabs[i].id] = {}
        }
    }
}

function updateMilitary(city, memory, rooms) {
    const flags = ["harass", "break", "powerMine", "bigShoot", "shoot", "bigBreak", "deposit"]
    const updateFns = [updateHarasser, updateBreaker, updatePowerMine, updateBigTrooper, updateTrooper, updateBigBreaker, updateDepositMiner]
    let big = 0
    for (var i = 0; i < flags.length; i++) {
        const flagName = city + flags[i]
        const updateFn = updateFns[i]
        updateFn(Memory.flags[flagName], memory, city, rooms)
        if(Memory.flags[flagName] && flagName.includes("big")){
            big = 1
        }
    }
    if(!big && !updateBigDefender(city, memory)){//no big military needed and no defenders needed
        emptyBoosters(memory)
    }
}

function emptyBoosters(memory){
    if(memory.ferryInfo.boosterInfo){
        for (let i = 0; i < 4; i++){
            const lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
            if (lab && lab.mineralAmount){
                memory.ferryInfo.boosterInfo[i][1] = 2
            }
        }
    }
}

function updateBigDefender(city, memory){
    //if towers active and need help, get boosters ready for a defender
    let danger = false
    const room = Game.spawns[city].room
    if(memory.towersActive){
        const hostiles = room.find(FIND_HOSTILE_CREEPS)
        if(hostiles.length){//if a hostile has tough and boosted parts, we are in danger aka need defenders
            for (let i = 0; i < hostiles.length; i++) {
                if(danger){
                    continue
                }
                if(hostiles[i].getActiveBodyparts(TOUGH) > 0){
                    for(var j = 0; j < hostiles[i].body.length; j++){
                        if(hostiles[i].body[j].boost){
                            danger = true
                        }
                    }
                }
            }
        }
    }
    if(!danger){//if no defenders needed, early return 
        memory[rD.name] = 0
        return false
    }
    if(memory.ferryInfo.boosterInfo){
        const resources = ["XZHO2", "XKHO2", "XLHO2", "XGHO2"]
        let go = 1
        for (let i = 0; i < resources.length; i++){
            if(room.terminal.store[resources[i]] < 1000){
                go = 0
            }
            if(room.terminal.store[resources[i]] < 2000){
                memory.ferryInfo.mineralRequest = resources[i]
            }
        }
        if(go){
            for (let i = 0; i < resources.length; i++){
                const lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
                if(lab.mineralType !=  resources[i] && lab.mineralAmount){
                    memory.ferryInfo.boosterInfo[i][1] = 2
                    go = 0
                } else if (lab.mineralAmount < 1000){
                    memory.ferryInfo.boosterInfo[i][1] = 1
                    memory.ferryInfo.boosterInfo[i][2] = resources[i]
                }
            }
            if(go){
                memory[rD.name] = 1
                //if a defender is not already spawning, queue another one up
                if(_.filter(room.find(FIND_MY_CREEPS), c => c.memory.role == rD.name).length >= room.find(FIND_HOSTILE_CREEPS).length){
                    return
                }
                const spawns = room.find(FIND_MY_SPAWNS)
                let spawning = false
                for(let i = 0; i < spawns.length; i++){
                    if(spawns[i].spawning){
                        if(Game.creeps[spawns[i].spawning.name].memory.role == rD.name){
                            spawning = true
                        }
                    }
                }
                if(!spawning){
                    sq.schedule(Game.spawns[city], rD.name)
                }
            } else {
                memory[rD.name] = 0
            }
        } else {
            memory[rD.name] = 0
        }
    }
    return true

}

function chooseClosestRoom(myCities, flag){
    if(!flag){
        return 0
    }
    const goodCities = _.filter(myCities, city => city.controller.level >= 4 && Game.spawns[city.memory.city] && city.storage)
    let closestRoomPos = goodCities[0].getPositionAt(25, 25)
    let closestLength = CREEP_CLAIM_LIFE_TIME + 100//more than max claimer lifetime
    for (let i = 0; i < goodCities.length; i += 1){
        const testRoomPos = goodCities[i].getPositionAt(25, 25)
        const testPath = u.findMultiRoomPath(testRoomPos, flag)
        if(!testPath.incomplete && testPath.cost < closestLength && goodCities[i].name != flag.roomName){
            closestRoomPos =  goodCities[i].getPositionAt(25, 25)
            closestLength = testPath.cost
        }
    }
    if(closestLength == 700){
        Game.notify("No valid rooms in range for claim operation in " + flag.roomName)
    }
    return closestRoomPos.roomName
}

function updateColonizers(city, memory, claimRoom, unclaimRoom) {
    //claimer and spawnBuilder reset
    // TODO only make a claimer if city is close
    const roomName = Game.spawns[city].room.name
    if(roomName == claimRoom){
        const flag = Memory.flags.claim
        if(Game.spawns[city].room.controller.level < 7){
            memory[rSB.name] = 4
        } else if (flag && Game.rooms[flag.roomName] && Game.rooms[flag.roomName].controller && Game.rooms[flag.roomName].controller.level > 6) {
            memory[rSB.name] = 4
        } else {
            memory[rSB.name] = 2
        }
        if(flag && Game.rooms[flag.roomName] && Game.rooms[flag.roomName].controller.my){
            memory[rC.name] = 0
        } else {
            memory[rC.name] = flag ? 1 : 0
        }
    } else {
        memory[rSB.name] = 0
        memory[rC.name] = 0
    }
    if (roomName == unclaimRoom) {
        memory[rUC.name] = 1
    }
    //memory[rRo.name] = 0;
}

// Automated defender count for defense
function updateDefender(rooms, memory, rcl8) {
    if (Game.time % 30 == 0) {
        if(rcl8){
            return
        }
        var enemyCounts = _.map(rooms, room => {
            var allBadCreeps = _.filter(room.find(FIND_HOSTILE_CREEPS), creep => creep.getActiveBodyparts(ATTACK) > 0
                    || creep.getActiveBodyparts(RANGED_ATTACK) > 0 
                    || creep.getActiveBodyparts(CLAIM) > 0
                    || creep.getActiveBodyparts(HEAL) > 0)
            var invaders = _.reject(allBadCreeps, creep => creep.owner.username == "Source Keeper")
            return invaders.length
        })
        memory[rD.name] = _.sum(enemyCounts)
    }
}

function cityFraction(cityName) {
    const myCities = _.map(u.getMyCities(), city => city.name).sort()
    return _.indexOf(myCities, cityName) / myCities.length
}

function updateMiner(rooms, rcl8, memory, spawn){        
    if(rcl8){
        const bucketThreshold = settings.bucket.energyMining + settings.bucket.range * cityFraction(spawn.room.name)
        if (Game.cpu.bucket < bucketThreshold) {
            memory[rM.name] = 0
            return
        }

        if(_.find(spawn.room.find(FIND_MY_CREEPS), c => c.memory.role == rD.name)){
            memory[rM.name] = 0
        } else if (spawn.room.find(FIND_POWER_CREEPS).length) {
            memory[rM.name] = 2
        } else {
            memory[rM.name] = 0
        }
        return
    }
    if (!memory.sources) memory.sources = {}
    if (rcl8 && _.keys(memory.sources).length > 2) memory.sources = {}
    let miners = 0
    const miningRooms = rcl8 ? [spawn.room] : rooms
    const sources = _.flatten(_.map(miningRooms, room => room.find(FIND_SOURCES)))

    _.each(sources, function(sourceInfo){
        const sourceId = sourceInfo.id
        const sourcePos = sourceInfo.pos
        if (!([sourceId] in memory.sources)){
            memory.sources[sourceId] = sourcePos
        }
    })
    _.each(memory.sources, () => miners++)
    const flag = Memory.flags.claim
    if(flag && flag.roomName === spawn.pos.roomName &&
        Game.rooms[flag.roomName].controller.level < 6){
        memory[rM.name] = 0
        return
    }
    memory[rM.name] = miners
}

function updateMineralMiner(rcl, buildings, spawn, memory) {
    memory[rMM.name] = 0
    if (rcl > 5){
        var extractor = _.find(buildings, structure => structure.structureType == STRUCTURE_EXTRACTOR)
        //Log.info(extractor)
        if(extractor) {
            var cityObject = spawn.room
            var minerals = cityObject.find(FIND_MINERALS)
            if(spawn.room.terminal && spawn.room.terminal.store[minerals[0].mineralType] < 6000){
                memory[rMM.name] = (minerals[0].mineralAmount < 1) ? 0 : 1
            }
        }
    }
}

function updateTransporter(extensions, memory, creeps) {
    if (extensions < 1){
        memory[rT.name] = 0
    } else if (extensions < 10){
        memory[rT.name] = 1
    } else if(creeps.length > 8){//arbitrary 'load' on transporters
        memory[rT.name] = settings.max.transporters
    } else {
        memory[rT.name] = 1
    }
}

function updateUpgrader(city, controller, memory, rcl8, creeps, rcl) {
    const room = Game.spawns[city].room
    if (rcl8){
        const bucketThreshold = settings.bucket.upgrade + settings.bucket.range * cityFraction(room.name)
        const haveEnoughCpu = Game.cpu.bucket > bucketThreshold
        if (controller.ticksToDowngrade < 100000 
            || (controller.room.storage.store.energy > settings.energy.rcl8upgrade && haveEnoughCpu)){
            memory[rU.name] = 1
        } else if (controller.ticksToDowngrade > 180000){
            memory[rU.name] = 0
        }
    } else {
        if(rcl >= 6 && room.storage && room.storage.store[RESOURCE_ENERGY] < 250000
                && room.terminal && room.terminal.store[RESOURCE_CATALYZED_GHODIUM_ACID] < 1000
                && controller.ticksToDowngrade > CONTROLLER_DOWNGRADE[rcl.toString()]/2){
            memory[rU.name] = 0
            return
        }
        const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
        if(constructionSites.length){
            memory[rU.name] = 1
            return
        }
        var banks = u.getWithdrawLocations(creeps[0])
        //Log.info(banks);
        var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]))
        var capacity = _.sum(_.map(banks, bank => bank.store.getCapacity()))
        //Log.info('money: ' + money + ', ' + (100*money/capacity));
        if(money < (capacity * .28)){
            memory[rU.name] = Math.max(memory[rU.name] - 1, 1) 
        }
        else if (money > (capacity * .28)){
            memory[rU.name] = Math.min(memory[rU.name] + 1, settings.max.upgraders)
        } else {
            memory[rU.name] = 1
        }
    }
}

function updateBuilder(rcl, memory, spawn, rooms, rcl8) {
    const buildRooms = rcl8 ? [spawn.room] : rooms
    const constructionSites = _.flatten(_.map(buildRooms, room => room.find(FIND_MY_CONSTRUCTION_SITES)))
    var totalSites
    if (rcl < 7) {
        const buildings = _.flatten(_.map(buildRooms, room => room.find(FIND_STRUCTURES)))
        const repairSites = _.filter(buildings, structure => (structure.hits < (structure.hitsMax*0.3)) && (structure.structureType != STRUCTURE_WALL))
        totalSites = (Math.floor((repairSites.length)/10) + constructionSites.length)
    } else {
        totalSites = constructionSites.length
    }
    if (totalSites > 0){
        // If room is full of energy and there is contruction, make a builder
        const room = spawn.room
        if (room.energyAvailable == room.energyCapacityAvailable) {
            sq.schedule(spawn, "builder")
        }
        memory[rB.name] = (totalSites > 10 && rcl > 2 && rcl < 6) ? settings.max.builders : 1
    } else {
        memory[rB.name] = 0
    }
    if(rcl >= 7 && Game.cpu.bucket > settings.bucket.repair && spawn.room.storage){
        //make builder if lowest wall is below 5mil hits
        const walls = _.filter(spawn.room.find(FIND_STRUCTURES), struct => struct.structureType === STRUCTURE_RAMPART || struct.structureType === STRUCTURE_WALL)
        if(walls.length){//find lowest hits wall
            const sortedWalls = _.sortBy(walls, wall => wall.hits)
            if(sortedWalls[0].hits < settings.wallHeight){
                memory[rB.name]++
            }
        }
    }
}

function updateRunner(creeps, spawn, extensions, memory, rcl, emergencyTime) {
    if (rcl > 6 && !emergencyTime) {
        memory[rR.name] = 0
        return
    }
    var miners = _.filter(creeps, creep => creep.memory.role == "miner" || creep.memory.role == "remoteMiner")
    var distances = _.map(miners, miner => PathFinder.search(spawn.pos, miner.pos).cost)
    var totalDistance = _.sum(distances)
    var minerEnergyPerTick = extensions < 5 ? 10 : 20
    var energyProduced = 1.0 * totalDistance * minerEnergyPerTick
    var energyCarried = types.store(types.getRecipe("runner", spawn.room.energyAvailable, spawn.room))
    memory[rR.name] = Math.min(settings.max.runners, Math.max(Math.ceil(energyProduced / energyCarried), 2))
}

function updateFerry(spawn, memory, rcl) {
    if (rcl >= 7) {
        memory[rF.name] = 1
        return
    }
    //check if we have a terminal
    var terminal = spawn.room.terminal
    var storage = spawn.room.storage
    if (terminal && storage) {
        if (terminal.store.energy < 50000 || Object.keys(storage.store).length > 1 || terminal.store.energy > 51000){
            memory[rF.name] = 1
        } else {
            memory[rF.name] = 0
        }
    } else {
        memory[rF.name] = 0
    }
}

function updateStorageLink(spawn, memory, structures) {
    if(!structures.length || !Game.getObjectById(memory.storageLink)){
        memory.storageLink = null
    }
    if(!spawn.room.storage) {
        return
    }

    const storageLink = _.find(structures, structure => structure.structureType == STRUCTURE_LINK && structure.pos.inRangeTo(spawn.room.storage.pos, 3))
    if (storageLink){
        memory.storageLink = storageLink.id
    } else {
        memory.storageLink = null
    }
}

function updateHarasser(flag, memory) {
    memory[rH.name] = flag ? 1 : 0
}

function updateBreaker(flag, memory) {
    memory[rBr.name] = flag ? 1 : 0
    memory[rMe.name] = flag ? 1 : 0
}

function updatePowerMine(flag, memory) {
    memory[rPM.name] = flag ? 2 : 0
    if (flag) memory[rMe.name] += 2
}

function updateDepositMiner(flag, memory) {
    memory[rDM.name] = flag ? 1 : 0
}

function updateTrooper(flag, memory) {
    // add troopers for a shoot
    memory[rTr.name] = flag ? 1 : 0
    if (flag) memory[rMe.name]++
}

function updateBigBreaker(flag, memory, city) {
    if (flag && !memory.towersActive){
        const spawn = Game.spawns[city]
        const resources = ["XZHO2", "XZH2O", "XLHO2", "XGHO2"]
        let go = 1
        for (let i = 0; i < resources.length; i++){
            if(spawn.room.terminal.store[resources[i]] < 1000){
                go = 0
            }
            if(spawn.room.terminal.store[resources[i]] < 2000){
                spawn.memory.ferryInfo.mineralRequest = resources[i]
            }
        }
        if(go){
            for (let i = 0; i < resources.length; i++){
                const lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
                if(lab.mineralType !=  resources[i] && lab.mineralAmount){
                    memory.ferryInfo.boosterInfo[i][1] = 2
                    go = 0
                } else if (lab.mineralAmount < 1000){
                    memory.ferryInfo.boosterInfo[i][1] = 1
                    memory.ferryInfo.boosterInfo[i][2] = resources[i]
                }
            }
            memory[rBB.name] = 1
            memory[rBM.name]++
        } else {
            memory[rBB.name] = 0
        }
    }  else {
        memory[rBB.name] = 0
    } 
}

function updateBigTrooper(flag, memory, city) {
    if (flag && !memory.towersActive){
        const spawn = Game.spawns[city]
        const resources = ["XZHO2", "XKHO2", "XLHO2", "XGHO2"]
        let go = 1
        for (let i = 0; i < resources.length; i++){
            if(spawn.room.terminal.store[resources[i]] < 1000){
                go = 0
            }
            if(spawn.room.terminal.store[resources[i]] < 2000){
                spawn.memory.ferryInfo.mineralRequest = resources[i]
            }
        }
        if(go){
            for (let i = 0; i < resources.length; i++){
                const lab = Game.getObjectById(memory.ferryInfo.boosterInfo[i][0])
                if(lab.mineralType !=  resources[i] && lab.mineralAmount){
                    memory.ferryInfo.boosterInfo[i][1] = 2
                    go = 0
                } else if (lab.mineralAmount < 1000){
                    memory.ferryInfo.boosterInfo[i][1] = 1
                    memory.ferryInfo.boosterInfo[i][2] = resources[i]
                }
            }
            memory[rBT.name] = 1
            memory[rBM.name] = 1
        } else {
            memory[rBT.name] = 0
            memory[rBM.name] = 0
        }
    }  else {
        memory[rBT.name] = 0
        memory[rBM.name] = 0
    } 
}

function runNuker(city){
    const flagName = city + "nuke"
    const flag = Memory.flags[flagName]
    if (flag){
        const nuker = _.find(Game.spawns[city].room.find(FIND_MY_STRUCTURES), structure => structure.structureType === STRUCTURE_NUKER)
        nuker.launchNuke(new RoomPosition(flag.x, flag.y, flag.roomName))
        delete Memory.flags[flagName]
    }
}

module.exports = {
    chooseClosestRoom: chooseClosestRoom,
    runCity: runCity,
    updateCountsCity: updateCountsCity,
    runTowers: runTowers,
    runPowerSpawn: runPowerSpawn
}
