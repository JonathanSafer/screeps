var rDM = require("../roles/depositMiner")
var rH = require("../roles/harasser")
var rSB = require("../roles/spawnBuilder")
var rC = require("../roles/claimer")
var rUC = require("../roles/unclaimer")
var rF = require("../roles/ferry")
var rMM = require("../roles/mineralMiner")
var rU = require("../roles/upgrader")
var rB = require("../roles/builder")
var rR = require("../roles/runner")
var rT = require("../roles/transporter")
var rM = require("../roles/remoteMiner")
var rD = require("../roles/defender")
var rPM = require("../roles/powerMiner")
var rr = require("../roles/roles")
var types = require("../config/types")
var settings = require("../config/settings")
var template = require("../config/template")
var u = require("../lib/utils")
var sq = require("../lib/spawnQueue")
var t = require("../buildings/tower")
var labsLib = require("../buildings/labs")
var fact = require("../buildings/factory")
var link = require("../buildings/link")
var e = require("../operations/error")
var rMe = require("../roles/medic")


function makeCreeps(role, city, unhealthyStore, creepWantsBoosts) {
    const room = Game.spawns[city].room
   
    var energyToSpend = unhealthyStore ? room.energyAvailable :
        room.energyCapacityAvailable

    const weHaveBoosts = u.boostsAvailable(role)
    const boosted = creepWantsBoosts && weHaveBoosts

    const recipe = types.getRecipe(role.type, energyToSpend, room, boosted)
    const spawns = room.find(FIND_MY_SPAWNS)
    if(!Memory.counter){
        Memory.counter = 0
    }
    const name = u.generateCreepName(Memory.counter.toString(), role.name)
    if (types.cost(recipe) > room.energyAvailable) return false

    const spawn = u.getAvailableSpawn(spawns)
    if (!spawn) return false

    Memory.counter++
    const result = spawn.spawnCreep(recipe, name)
    if (result) { // don't spawn and throw an error at the end of the tick
        e.reportError(new Error(`Error making ${role.name} in ${city}: ${result}`))
        return false
    }
    if (boosted) {
        u.requestBoosterFill(Game.spawns[city], role.boosts)
    }
    Game.creeps[name].memory.role = role.name
    Game.creeps[name].memory.target = role.target
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
    const nextRoleInfo = sq.peekNextRole(spawn) || {}
    const spawnQueueRoleName = nextRoleInfo.role
    let nextRole = spawnQueueRoleName ? nameToRole[spawnQueueRoleName][0] : undefined

    if (!nextRole) {
        nextRole = _.find(roles, role => (typeof counts[role.name] == "undefined" && 
        spawn.memory[role.name]) || (counts[role.name] < spawn.memory[role.name]))
        usedQueue = false
    }
    
    if (nextRole) {
        if(makeCreeps(nextRole, city, unhealthyStore, nextRoleInfo.boosted) && usedQueue){
            sq.removeNextRole(spawn)
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
    const emergencyTime = spawn.room.storage && spawn.room.storage.store.energy < 5000 && rcl > 4 || 
                (rcl > 6 && !spawn.room.storage)
    const logisticsTime = rcl8 && !emergencyTime ? 500 : 50

    // Always update defender
    updateDefender(spawn, rcl)

    if(Game.time % 200 == 0){
        updateMilitary(city, memory, rooms, spawn, creeps)
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
            updateBuilder(rcl, memory, spawn)
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

    if (emergency || Game.time % checkTime == 0 && extensions >= 1) {
        if (_.filter(creeps, creep => creep.memory.role == rM.name).length < 1 && memory[rM.role] > 0){
            Log.info(`Making Emergency Miner in ${city}`)
            makeCreeps(rM, city, true)
        }

        if (_.filter(creeps, creep => creep.memory.role == rT.name).length < 1){
            Log.info(`Making Emergency Transporter in ${city}`)
            makeCreeps(rT, city, true)
        }

        // TODO disable if links are present (not rcl8!! links may be missing for rcl8)
        if ((emergency || !rcl8) && _.filter(creeps, creep => creep.memory.role == rR.name ).length < 1 && memory.runner > 0) {
            Log.info(`Making Emergency Runner in ${city}`)
            makeCreeps(rR, city, true)
        }
    }
}

// Run the tower function
function runTowers(city){
    const spawn = Game.spawns[city]
    if (spawn){
        if(spawn.memory.towersActive == undefined){
            spawn.memory.towersActive = false
        }
        const checkTime = 20
        if(spawn.memory.towersActive == false && Game.time % checkTime != 0){
            return
        }
        var towers = _.filter(Game.structures, (structure) => structure.structureType == STRUCTURE_TOWER && structure.room.memory.city == city)
        var hostileCreep = spawn.room.find(FIND_HOSTILE_CREEPS)
        var injuredCreep = spawn.room.find(FIND_MY_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        var injuredPower = spawn.room.find(FIND_MY_POWER_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        var hostilePower = spawn.room.find(FIND_HOSTILE_POWER_CREEPS)
        var hostiles = _.filter(hostilePower.concat(hostileCreep), c => !settings.allies.includes(c.owner.username))
        var injured = injuredPower.concat(injuredCreep)
        let damaged = null
        let repair = 0
        let target = null
        if (Game.time % checkTime === 0) {
            const needRepair = _.filter(spawn.room.find(FIND_STRUCTURES), s => s.structureType != STRUCTURE_WALL
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

        const lowEnergy = spawn.room.storage && spawn.room.terminal && spawn.room.storage.store.energy < 40000
        if(hostiles.length > 0  && !lowEnergy){
            Log.info("Towers up in " + city)
            spawn.memory.towersActive = true
            //identify target 
            target = t.chooseTarget(towers, hostiles, spawn.pos.roomName)
        } else {
            spawn.memory.towersActive = false
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
            delete(spawn.memory.ferryInfo.labInfo.receivers[receivers[i]])
        }
    }
    for(let i = 0; i < reactors.length; i++){
        if(!Game.getObjectById(reactors[i])){
            rescan = true
            delete(spawn.memory.ferryInfo.labInfo.reactors[reactors[i]])
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

function updateMilitary(city, memory, rooms, spawn, creeps) {
    const flags = ["harass", "powerMine", "deposit"]
    const roles = [rH.name, rPM.name, rDM.name]
    for (var i = 0; i < flags.length; i++) {
        const flagName = city + flags[i]
        const role = roles[i]
        updateHighwayCreep(Memory.flags[flagName], spawn, creeps, role)
    }
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
    if (roomName == unclaimRoom && Game.time % 1000 == 0) {
        sq.schedule(Game.spawns[city], rUC.name)
    }
    //memory[rRo.name] = 0;
}

// Automated defender count for defense
function updateDefender(spawn, rcl) {
    if (Game.time % 30 != 0) {
        return
    }
    const room = spawn.room
    if(spawn.memory.towersActive){
        if(rcl < 6){
            spawn.memory[rD.name] = Math.ceil(room.find(FIND_HOSTILE_CREEPS).length/2)
            return
        }
        const hostiles = room.find(FIND_HOSTILE_CREEPS)
        for(const hostile of hostiles){
            const hasTough = hostile.getActiveBodyparts(TOUGH) > 0
            const isBoosted = _(hostile.body).find(part => part.boost)
            if (hasTough && isBoosted) {
                //add a defender to spawn queue if we don't have enough
                //make sure to count spawned defenders as well as queued
                const spawns = room.find(FIND_MY_SPAWNS)
                const spawning = _.filter(spawns, s => s.spawning && Game.creeps[s.spawning.name].memory.role == rD.name).length
                const defendersNeeded = Math.ceil(hostiles.length/2)
                const liveCount = _.filter(room.find(FIND_MY_CREEPS), c => c.memory.role == rD.name).length
                const queued = sq.getCounts(spawn)[rD.name] || 0
                if(spawning + liveCount + queued < defendersNeeded){
                    sq.schedule(spawn, rD.name, true)
                }
                return
            }
        }
    } else {
        spawn.memory[rD.name] = 0
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

        const powerCreeps = spawn.room.find(FIND_MY_POWER_CREEPS)
        if(_.find(spawn.room.find(FIND_MY_CREEPS), c => c.memory.role == rD.name)){
            memory[rM.name] = 0
        } else if((powerCreeps.length && powerCreeps[0].powers[PWR_REGEN_SOURCE])  || spawn.room.storage.store[RESOURCE_ENERGY] < settings.energy.processPower){
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
            if(spawn.room.terminal && (spawn.room.terminal.store[minerals[0].mineralType] < 6000 || Game.cpu.bucket > settings.bucket.mineralMining)){
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
    memory[rU.name] = 0//temp
    if (rcl8){
        if(Game.time % 1500 != 0){
            return
        }
        const bucketThreshold = settings.bucket.upgrade + settings.bucket.range * cityFraction(room.name)
        const haveEnoughCpu = Game.cpu.bucket > bucketThreshold
        if (controller.ticksToDowngrade < 100000 
            || (controller.room.storage.store.energy > settings.energy.rcl8upgrade && haveEnoughCpu)){
            sq.schedule(Game.spawns[city], rU.name, true)
        }
    } else {
        if(room.storage && room.storage.store[RESOURCE_ENERGY] < 250000
                && controller.ticksToDowngrade > CONTROLLER_DOWNGRADE[rcl.toString()]/2){
            return
        }
        var banks = u.getWithdrawLocations(creeps[0])
        //Log.info(banks);
        var money = _.sum(_.map(banks, bank => bank.store[RESOURCE_ENERGY]))
        var capacity = _.sum(_.map(banks, bank => bank.store.getCapacity()))
        //Log.info('money: ' + money + ', ' + (100*money/capacity));
        if(!room.storage && money/capacity < 0.5){
            memory[rU.name] = 0
            return
        }
        if(money > (capacity * .28)){
            let needed = Math.floor((money/capacity) * 4)
            if(room.storage){
                needed = Math.floor(Math.pow((money/capacity) * 4, 2))
            }
            for(let i = 0; i < needed; i++){
                sq.schedule(Game.spawns[city], rU.name, rcl >= 6)
            }
        } else {
            memory[rU.name] = 1
        }
    }
}

function updateBuilder(rcl, memory, spawn) {
    const room = spawn.room
    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
    let totalSites
    if (rcl < 4) {
        const repairSites = _.filter(room.find(FIND_STRUCTURES), structure => (structure.hits < (structure.hitsMax*0.3)) 
            && (structure.structureType != STRUCTURE_WALL))
        totalSites = (Math.floor((repairSites.length)/10) + constructionSites.length)
    } else {
        totalSites = constructionSites.length
    }
    if (totalSites > 0){
        // If room is full of energy and there is contruction, make a builder
        if (room.energyAvailable == room.energyCapacityAvailable) {
            sq.schedule(spawn, rB.name)
        }
        memory[rB.name] = (totalSites > 10 && rcl > 2 && rcl < 6) ? settings.max.builders : 1
    } else {
        memory[rB.name] = 0
    }
    if(rcl >= 4 && Game.cpu.bucket > settings.bucket.repair + settings.bucket.powerRange * cityFraction(room.name) && spawn.room.storage && spawn.room.storage.store[RESOURCE_ENERGY] > settings.energy.repair){
        const walls = _.filter(spawn.room.find(FIND_STRUCTURES), 
            struct => [STRUCTURE_RAMPART, STRUCTURE_WALL].includes(struct.structureType) 
            && !u.isNukeRampart(struct.pos))
        if(walls.length){//find lowest hits wall
            const minHits = _.min(walls, wall => wall.hits).hits
            if(minHits < settings.wallHeight[rcl - 1]){
                if(rcl >= 7){
                    sq.schedule(spawn, rB.name, true)
                    return
                } else {
                    memory[rB.name]++
                }
            }
        }
        const nukes = spawn.room.find(FIND_NUKES)
        if(nukes.length){
            const nukeStructures = _.filter(spawn.room.find(FIND_MY_STRUCTURES), struct => settings.nukeStructures.includes(struct.structureType))
            for(const structure of nukeStructures){
                let rampartHeightNeeded = 0
                for(const nuke of nukes){
                    if(structure.pos.isEqualTo(nuke.pos)){
                        rampartHeightNeeded += 5000000
                    }
                    if(structure.pos.inRangeTo(nuke.pos, 2)){
                        rampartHeightNeeded += 5000000
                    }
                }
                if(rampartHeightNeeded == 0){
                    continue
                }
                const rampart = _.find(structure.pos.lookFor(LOOK_STRUCTURES), s => s.structureType == STRUCTURE_RAMPART)
                if(!rampart){
                    structure.pos.createConstructionSite(STRUCTURE_RAMPART)
                } else if(rampart.hits < rampartHeightNeeded + 30000){
                    sq.schedule(spawn, rB.name, rcl >= 7)
                    return
                }
            }
        }
    }
}

function updateRunner(creeps, spawn, extensions, memory, rcl, emergencyTime) {
    if (rcl >= 6 && !emergencyTime) {
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
    if (rcl >= 6) {
        memory[rF.name] = 1
        return
    }
    memory[rF.name] = 0
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

function updateHighwayCreep(flag, spawn, creeps, role) {
    if (!flag) return
    scheduleIfNeeded(role, 1, role != rH.name, spawn, creeps)
}

function scheduleIfNeeded(role, count, boosted, spawn, currentCreeps) {
    const creepsInField = getCreepsByRole(currentCreeps, role)
    const queued = sq.getCounts(spawn)[role] || 0
    let creepsNeeded = count - queued - creepsInField.length
    while (creepsNeeded > 0) {
        sq.schedule(spawn, role, boosted)
        if(role == rPM.name){
            sq.schedule(spawn, rMe.name)
        }
        creepsNeeded--
    }
}

function getCreepsByRole(creeps, role) {
    return _(creeps)
        .filter(creep => creep.memory.role == role)
        .value()
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
    runPowerSpawn: runPowerSpawn,
    scheduleIfNeeded: scheduleIfNeeded,
}
