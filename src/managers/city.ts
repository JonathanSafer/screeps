import rDM = require("../roles/depositMiner")
import rH = require("../roles/harasser")
import rSB = require("../roles/spawnBuilder")
import rC = require("../roles/claimer")
import rUC = require("../roles/unclaimer")
import rF = require("../roles/ferry")
import rMM = require("../roles/mineralMiner")
import rU = require("../roles/upgrader")
import rB = require("../roles/builder")
import rR = require("../roles/runner")
import rT = require("../roles/transporter")
import rM = require("../roles/remoteMiner")
import rD = require("../roles/defender")
import rPM = require("../roles/powerMiner")
import rr = require("../roles/roles")
import types = require("../config/types")
import settings = require("../config/settings")
import template = require("../config/template")
import u = require("../lib/utils")
import roomU = require("../lib/roomUtils")
import cU = require("../lib/creepUtils")
import sq = require("../lib/spawnQueue")
import t = require("../buildings/tower")
import labsLib = require("../buildings/labs")
import fact = require("../buildings/factory")
import link = require("../buildings/link")
import e = require("../operations/error")
import rQr = require("../roles/qrCode")
import rp = require("./roomplan")
import rRe = require("../roles/repairer")
import { cN, BodyType } from "../lib/creepNames"


function makeCreeps(role: CreepRole, city: string, unhealthyStore=false, creepWantsBoosts=false, flag = null, budget = null) {
    const room = Game.spawns[city].room
   
    const energyToSpend = budget || 
        (unhealthyStore ? room.energyAvailable : room.energyCapacityAvailable)

    const weHaveBoosts = u.boostsAvailable(role, room)
    const boosted = creepWantsBoosts && weHaveBoosts

    const recipe = types.getRecipe(role.type, energyToSpend, room, boosted, flag)
    const spawns = room.find(FIND_MY_SPAWNS)
    if(!Memory.counter){
        Memory.counter = 0
    }
    const name = cU.generateCreepName(Memory.counter.toString(), role.name)
    if (types.cost(recipe) > room.energyAvailable) return false

    const spawn = roomU.getAvailableSpawn(spawns)
    if (!spawn) return false

    Memory.counter++
    const result = spawn.spawnCreep(recipe, name)
    if (result) { // don't spawn and throw an error at the end of the tick
        e.reportError(new Error(`Error making ${role.name} in ${city}: ${result}`))
        return false
    }
    if (boosted) {
        roomU.requestBoosterFill(Game.spawns[city], role.boosts)
    }
    Game.creeps[name].memory.role = role.name
    Game.creeps[name].memory.mode = role.target
    Game.creeps[name].memory.target = role.target as unknown as Id<RoomObject>
    Game.creeps[name].memory.city = city
    Game.creeps[name].memory.needBoost = boosted
    Game.creeps[name].memory.flag = flag
    return true
}

//runCity function
function runCity(city, creeps: Creep[]){
    const spawn = Game.spawns[city]
    if (!spawn) return false
    const room = spawn.room

    updateSpawnStress(spawn)

    // Only build required roles during financial stress
    const emergencyRoles = rr.getEmergencyRoles()
    const allRoles = rr.getRoles()

    const storage = roomU.getStorage(room) as StructureContainer | StructureStorage
    const halfCapacity = storage && storage.store.getCapacity() / 2
    const unhealthyStore = storage && storage.store[RESOURCE_ENERGY] < Math.min(5000, halfCapacity)
    const roles = (unhealthyStore) ? emergencyRoles : allRoles

    // Get counts for roles by looking at all living and queued creeps
    const nameToRole = _.groupBy(allRoles, role => role.name) // map from names to roles
    const counts = _.countBy(creeps, creep => creep.memory.role) // lookup table from role to count
    const queuedCounts = sq.getCounts(spawn)
    _.forEach(roles, role => {
        const liveCount = counts[role.name] || 0
        const queueCount = queuedCounts[role.name] || 0
        counts[role.name] = liveCount + queueCount
    })

    if(Game.time % 50 == 0){
        sq.sort(spawn)
    }
    
    let usedQueue = true
    const nextRoleInfo = sq.peekNextRole(spawn) || {} as QueuedCreep
    const spawnQueueRoleName = nextRoleInfo.role
    let nextRole = spawnQueueRoleName ? nameToRole[spawnQueueRoleName][0] : undefined

    if (!nextRole) {
        nextRole = _.find(roles, role => (typeof counts[role.name] == "undefined" && 
        spawn.memory[role.name]) || (counts[role.name] < spawn.memory[role.name]))
        usedQueue = false
    }
    
    if (nextRole) {
        if(makeCreeps(nextRole, city, unhealthyStore, nextRoleInfo.boosted, 
            nextRoleInfo.flag, nextRoleInfo.budget) && usedQueue) {
            sq.removeNextRole(spawn)
        }
    }


    // Run all the creeps in this city
    _.forEach(creeps, (creep) => {
        nameToRole[creep.memory.role][0].run(creep)
    })
    
    link.run(room)
    runPowerSpawn(city)
    labsLib.run(city)
    fact.runFactory(city)
    checkNukes(room)
    updateRemotes(city)
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
    updateDefender(spawn, rcl, creeps)
    updateQR(spawn, creeps)

    if(Game.time % 200 == 0){
        updateMilitary(city, memory, rooms, spawn, creeps)
    }
    if (Game.time % logisticsTime == 0 || Game.time < 10) {
        const structures = spawn.room.find(FIND_STRUCTURES)
        const extensions = _.filter(structures, structure => structure.structureType == STRUCTURE_EXTENSION).length
        updateRunner(creeps, spawn, extensions, memory, rcl, emergencyTime)
        updateFerry(spawn, memory, rcl)
        updateMiner(creeps, rcl8, memory, spawn)
        updateBuilder(rcl, memory, spawn)
        updateRepairer(spawn, memory, creeps)
        updateUpgrader(city, controller, memory, rcl8, creeps, rcl)
        updateTransporter(extensions, memory, creeps, structures, spawn)
    
        if (Game.time % 500 === 0) {
            runNuker(city)
            checkLabs(city)
            updateColonizers(city, memory, claimRoom, unclaimRoom)
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
            Log.warning(`Nuclear launch detected in ${room.name}`)
        }
    }
}

function makeEmergencyCreeps(extensions, creeps: Creep[], city, rcl8, emergency) {
    const checkTime = rcl8 ? 200 : 50
    const memory = Game.spawns[city].memory

    if (emergency || Game.time % checkTime == 0 && extensions >= 1) {
        if (_.filter(creeps, creep => creep.memory.role == rM.name).length < 1 && memory[rM.name] > 0){
            Log.info(`Making Emergency Miner in ${city}`)
            makeCreeps(rM, city, true)
        }

        if (_.filter(creeps, creep => creep.memory.role == rT.name).length < 1){
            Log.info(`Making Emergency Transporter in ${city}`)
            makeCreeps(rT, city, true)
        }

        // TODO disable if links are present (not rcl8!! links may be missing for rcl8)
        if ((emergency || !rcl8) && _.filter(creeps, creep => creep.memory.role == rR.name).length < 1 && memory[rR.name] > 0) {
            Log.info(`Making Emergency Runner in ${city}`)
            makeCreeps(rR, city, true)
        }
    }
}

function updateQR(spawn, creeps){
    if(Game.time % 100 == 5){
        const flag = spawn.name + "qrCode"
        if(Memory.flags[flag]){
            const creepsNeeded = _.sum(template.qrCoords, elem => elem.length)
            cU.scheduleIfNeeded(rQr.name, creepsNeeded, false, spawn, creeps, flag)
        }
    }
}

// Run the tower function
function runTowers(city: string){
    const spawn = Game.spawns[city]
    if (spawn){
        if(spawn.memory.towersActive == undefined){
            spawn.memory.towersActive = false
        }
        const checkTime = 20
        if(spawn.memory.towersActive == false && Game.time % checkTime != 0){
            return
        }
        const towers = _.filter(spawn.room.find(FIND_MY_STRUCTURES), (structure) => structure.structureType == STRUCTURE_TOWER) as StructureTower[]
        const hostileCreep = spawn.room.find(FIND_HOSTILE_CREEPS)
        const injuredCreep = spawn.room.find(FIND_MY_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        const injuredPower: Array<Creep | PowerCreep> = spawn.room.find(FIND_MY_POWER_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        const hostilePower: Array<Creep | PowerCreep> = spawn.room.find(FIND_HOSTILE_POWER_CREEPS)
        const hostiles = _.filter(hostilePower.concat(hostileCreep), c => !settings.allies.includes(c.owner.username))
        const injured = injuredPower.concat(injuredCreep)
        let damaged = null
        let repair = 0
        let target = null
        maybeSafeMode(city, hostiles)
        if (Game.time % checkTime === 0) {
            const needRepair = _.filter(spawn.room.find(FIND_STRUCTURES), s => s.structureType != STRUCTURE_WALL
                && s.structureType != STRUCTURE_RAMPART
                && s.structureType != STRUCTURE_CONTAINER
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

function maybeSafeMode(city: string, hostiles: Array<Creep | PowerCreep>){
    const room = Game.spawns[city].room
    const plan = Memory.rooms[room.name].plan
    if(!plan) return
    const minX = plan.x - template.wallDistance
    const minY = plan.y - template.wallDistance
    const maxX = plan.x + template.dimensions.x + template.wallDistance - 1
    const maxY = plan.y + template.dimensions.y + template.wallDistance - 1
    if(_.find(hostiles, h => h.pos.x > minX 
            && h.pos.x < maxX 
            && h.pos.y > minY
            && h.pos.y < maxY)
        && room.controller.safeModeAvailable
        && !room.controller.safeModeCooldown){
        room.controller.activateSafeMode()
    }
}

//Run the powerSpawn
function runPowerSpawn(city){
    if(Game.spawns[city]){
        if (!Game.spawns[city].memory.powerSpawn){
            return
        }
        const powerSpawn = Game.getObjectById(Game.spawns[city].memory.powerSpawn)
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
        if(settings.processPower && powerSpawn && powerSpawn.energy >= 50 && powerSpawn.power > 0 && powerSpawn.room.storage.store.energy > settings.energy.processPower && Game.cpu.bucket > settings.bucket.processPower){
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

function updateMilitary(city: string, memory, rooms, spawn, creeps) {
    const flags = ["harass", "powerMine", "deposit"]
    const roles = [rH.name, rPM.name, rDM.name]
    for (let i = 0; i < flags.length; i++) {
        const flagName = city + flags[i]
        const role = roles[i]
        updateHighwayCreep(flagName, spawn, creeps, role)
    }
}

function chooseClosestRoom(myCities: Room[], flag){
    if(!flag){
        return 0
    }
    const goodCities = _.filter(myCities, city => city.controller.level >= 4 && Game.spawns[city.memory.city] && city.storage)
    if(!goodCities.length) return null
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
        const harassFlagName = u.generateFlagName(city + "harass")
        if(!_.find(Object.keys(Memory.flags), f => Memory.flags[f].roomName == Memory.flags.claim.roomName && f.includes("harass"))){
            Memory.flags[harassFlagName] = new RoomPosition(25, 25, Memory.flags.claim.roomName)
            Memory.flags[harassFlagName].boosted = true
        }
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
function updateDefender(spawn: StructureSpawn, rcl, creeps) {
    if (Game.time % 30 != 0) {
        return
    }
    const room = spawn.room
    if(spawn.memory.towersActive){
        if(rcl < 6){
            spawn.memory[rD.name] = Math.ceil(room.find(FIND_HOSTILE_CREEPS).length/2)
            return
        }
        const hostiles = _.filter(room.find(FIND_HOSTILE_CREEPS), hostile => _(hostile.body).find(part => part.boost) && 
            (hostile.getActiveBodyparts(TOUGH) > 0 || hostile.body.length == 50 || rcl < 8)).length
        if(hostiles > 3){
            //request quad from nearest ally
            requestSupport(spawn, rcl, Math.floor(hostiles/4))
            if(Game.time % 1500 == 0 && spawn.memory.wallMultiplier)
                spawn.memory.wallMultiplier = Math.min(spawn.memory.wallMultiplier + .1, 10)
        } else {
            cU.scheduleIfNeeded(rD.name, Math.min(Math.floor(hostiles/2), 4), true, spawn, creeps)
        }
    } else {
        spawn.memory[rD.name] = 0
    }
}

function requestSupport(spawn, rcl, quadsNeeded){
    let reinforceCity = null
    const quadFlag = _.find(Object.keys(Memory.flags), flag => flag.includes("quadRally") && Memory.flags[flag].roomName == spawn.room.name)
    if(quadFlag){
        const index = quadFlag.indexOf("quadRally")
        reinforceCity = quadFlag.substring(0, index)
    }
    if(!reinforceCity){
        //find reinforce City
        const closestRoom = chooseClosestRoom(u.getMyCities(), spawn.pos)
        if(!closestRoom)
            return
        reinforceCity = closestRoom + "0"
    }
    u.placeFlag(reinforceCity + "quadRally", new RoomPosition(25, 25, spawn.room.name), 10000)
    const otherSpawn = Game.spawns[reinforceCity]
    const creeps = u.splitCreepsByCity()[reinforceCity]
    cU.scheduleIfNeeded(rT.name, 2, false, otherSpawn, creeps)
    cU.scheduleIfNeeded("quad", 4 * quadsNeeded, true, otherSpawn, creeps)
}

function cityFraction(cityName) {
    const myCities = _.map(u.getMyCities(), city => city.name).sort()
    return _.indexOf(myCities, cityName) / myCities.length
}

function updateMiner(creeps: Creep[], rcl8: boolean, memory: SpawnMemory, spawn: StructureSpawn){
    const flag = Memory.flags.claim
    if(flag && flag.roomName === spawn.pos.roomName &&
        Game.rooms[flag.roomName].controller.level < 6){
        memory[rM.name] = 0
        return
    }
    roomU.initializeSources(spawn)

    const powerCreep = spawn.room.find(FIND_MY_POWER_CREEPS, { filter: c => c.powers[PWR_REGEN_SOURCE] }).length
    let bucketThreshold = settings.bucket.energyMining + settings.bucket.range * cityFraction(spawn.room.name)
    if(powerCreep || (spawn.room.storage && spawn.room.storage.store[RESOURCE_ENERGY] < settings.energy.processPower)){
        bucketThreshold -= settings.bucket.range/2
    }
    if (spawn.memory.towersActive || (Game.cpu.bucket < bucketThreshold && rcl8) || Game.time < 500) {
        memory[rM.name] = 0
        return
    }
    for(const sourceId in memory.sources){
        cU.scheduleIfNeeded(cN.REMOTE_MINER_NAME, 1, false, spawn, creeps, sourceId)
    }     
}

function updateMineralMiner(rcl, buildings: Structure[], spawn, memory) {
    memory[rMM.name] = 0
    if (rcl > 5){
        const extractor = _.find(buildings, structure => structure.structureType == STRUCTURE_EXTRACTOR)
        //Log.info(extractor)
        if(extractor) {
            const cityObject = spawn.room
            const minerals = cityObject.find(FIND_MINERALS)
            if(spawn.room.terminal && (spawn.room.terminal.store[minerals[0].mineralType] < 6000 
                || (Game.cpu.bucket > settings.bucket.mineralMining && spawn.room.storage && spawn.room.storage.store[minerals[0].mineralType] < 50000))){
                memory[rMM.name] = (minerals[0].mineralAmount < 1) ? 0 : 1
            }
        }
    }
}

function updateTransporter(extensions, memory, creeps, structures: Structure[], spawn) {
    if (extensions < 1 && !_.find(structures, struct => struct.structureType == STRUCTURE_CONTAINER)){
        memory[rT.name] = 0
    } else if (extensions < 5 || creeps.length < 9){
        memory[rT.name] = 1
    } else {//arbitrary 'load' on transporters
        memory[rT.name] = settings.max.transporters
    }
    cU.scheduleIfNeeded(rT.name, memory[rT.name], false, spawn, creeps)
}

function updateUpgrader(city: string, controller: StructureController, memory: SpawnMemory, rcl8: boolean, creeps: Creep[], rcl: number) {
    const room = Game.spawns[city].room
    if (rcl8){
        const bucketThreshold = settings.bucket.upgrade + settings.bucket.range * cityFraction(room.name)
        const haveEnoughCpu = Game.cpu.bucket > bucketThreshold
        if (controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[rcl]/2 
            || (controller.room.storage.store.energy > settings.energy.rcl8upgrade && haveEnoughCpu && settings.rcl8upgrade)){
            cU.scheduleIfNeeded(rU.name, 1, true, Game.spawns[city], creeps)
        }
    } else {
        const builders = _.filter(creeps, c => c.memory.role == cN.BUILDER_NAME)
        if(builders.length > 5) return
        const bank = roomU.getStorage(room) as StructureStorage
        if(!bank) return
        const money = bank.store[RESOURCE_ENERGY]
        const capacity = bank.store.getCapacity()
        if(capacity < CONTAINER_CAPACITY){
            if(!builders.length)
                cU.scheduleIfNeeded(cN.UPGRADER_NAME,1, false, Game.spawns[city], creeps)
            return
        }
        const needed = room.storage ? Math.floor(Math.pow((money/capacity) * 4, 3)) : Math.floor((money/capacity) * 7)
        const maxUpgraders = 7
        cU.scheduleIfNeeded(cN.UPGRADER_NAME, Math.min(needed, maxUpgraders), rcl >= 6, Game.spawns[city], creeps)
        if (controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[rcl]/2){
            cU.scheduleIfNeeded(cN.UPGRADER_NAME, 1, rcl >= 6, Game.spawns[city], creeps)
        }
    }
}

function updateRepairer(spawn, memory: SpawnMemory, creeps){
    const remotes = Object.keys(_.countBy(memory.sources, s => s.roomName))
    let csites = 0
    let damagedRoads = 0
    for(let i = 0; i < remotes.length; i++){
        if(Game.rooms[remotes[i]] && (!Game.rooms[remotes[i]].controller || !Game.rooms[remotes[i]].controller.owner)){
            const room = Game.rooms[remotes[i]]
            csites += room.find(FIND_MY_CONSTRUCTION_SITES).length
            damagedRoads += room.find(FIND_STRUCTURES, { filter: s => s.structureType == STRUCTURE_ROAD && s.hits/s.hitsMax < 0.3 }).length
        }
    }
    let repairersNeeded = 0
    if(csites > 0)
        repairersNeeded++
    repairersNeeded += Math.floor(damagedRoads/20)
    cU.scheduleIfNeeded(rRe.name, repairersNeeded, false, spawn, creeps)
}

function updateBuilder(rcl, memory, spawn: StructureSpawn) {
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
        // If room is full of energy and there is construction, make a builder
        if (room.energyAvailable == room.energyCapacityAvailable && Game.time % 500 == 0) {
            sq.schedule(spawn, rB.name)
        }
        memory[rB.name] = rcl < 6 ? settings.max.builders : 1
    } else {
        memory[rB.name] = 0
    }
    if(rcl >= 4 && Game.cpu.bucket > settings.bucket.repair + settings.bucket.range * cityFraction(room.name) && spawn.room.storage && spawn.room.storage.store[RESOURCE_ENERGY] > settings.energy.repair){
        const walls = _.filter(spawn.room.find(FIND_STRUCTURES), 
            struct => ([STRUCTURE_RAMPART, STRUCTURE_WALL] as string[]).includes(struct.structureType) 
            && !roomU.isNukeRampart(struct.pos))
        if(walls.length){//find lowest hits wall
            if(!spawn.memory.wallMultiplier){
                spawn.memory.wallMultiplier = 1
            }
            if(Game.time % 20000 == 0 && Math.random() < .1)
                spawn.memory.wallMultiplier = Math.min(spawn.memory.wallMultiplier + .1, 10)
            const minHits = _.min(walls, wall => wall.hits).hits
            const defenseMode = !spawn.room.controller.safeMode && spawn.room.controller.safeModeCooldown
            if(minHits < settings.wallHeight[rcl - 1] *  spawn.memory.wallMultiplier || defenseMode){
                if(Game.time % 500 == 0){
                    sq.schedule(spawn, rB.name, rcl >= 6)
                }
                if(rcl <= 6){
                    memory[rB.name] = settings.max.builders
                }
                return
            }
        }
        const nukes = spawn.room.find(FIND_NUKES)
        if(nukes.length){
            const nukeStructures = _.filter(spawn.room.find(FIND_MY_STRUCTURES), struct => (settings.nukeStructures as string[]).includes(struct.structureType))
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

function updateRunner(creeps: Creep[], spawn, extensions, memory, rcl, emergencyTime) {
    if (rcl == 8 && !emergencyTime && Game.cpu.bucket < settings.bucket.mineralMining) {
        memory[rR.name] = 0
        return
    }
    const miners = _.filter(creeps, creep => creep.memory.role == rM.name && !creep.memory.link)
    const minRunners = rcl < 7 ? 2 : 0
    const distances = _.map(miners, miner => PathFinder.search(spawn.pos, miner.pos).cost)
    let totalDistance = _.sum(distances)
    if(extensions < 10 && Object.keys(Game.rooms).length == 1) totalDistance = totalDistance * 1.5//for when there are no roads
    const minerEnergyPerTick = SOURCE_ENERGY_CAPACITY/ENERGY_REGEN_TIME
    const energyProduced = 2 * totalDistance * minerEnergyPerTick
    const energyCarried = types.store(types.getRecipe(BodyType.runner, spawn.room.energyCapacityAvailable, spawn.room))
    memory[rR.name] = Math.min(settings.max.runners, Math.max(Math.ceil(energyProduced / energyCarried), minRunners))
    const upgraders = _.filter(creeps, creep => creep.memory.role == rU.name).length
    const bonusRunners = Math.floor(upgraders/3)
    memory[rR.name] += bonusRunners
    cU.scheduleIfNeeded(rR.name, memory[rR.name], false, spawn, creeps)
}

function updateFerry(spawn, memory, rcl) {
    if (rcl >= 5) {
        memory[rF.name] = 1
        return
    }
    memory[rF.name] = 0
}

function updateStorageLink(spawn, memory, structures: Structure[]) {
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

function updateHighwayCreep(flagName: string, spawn: StructureSpawn, creeps: Creep[], role: string) {
    const flagNames = _.filter(Object.keys(Memory.flags), flag => flag.includes(flagName))
    for(const flag of flagNames){
        const boosted = role != rH.name || Memory.flags[flag].boosted
        cU.scheduleIfNeeded(role, 1, boosted, spawn, creeps, flag)
    }
}

function runNuker(city){
    const flagName = city + "nuke"
    const flag = Memory.flags[flagName]
    if (flag){
        const nuker = _.find(Game.spawns[city].room.find(FIND_MY_STRUCTURES), structure => structure.structureType === STRUCTURE_NUKER) as StructureNuker
        nuker.launchNuke(new RoomPosition(flag.x, flag.y, flag.roomName))
        delete Memory.flags[flagName]
    }
}

function setGameState(){
    // 1 spawn and no creeps = reset
    const roomNames = Object.keys(Game.rooms)
    const room = Game.rooms[roomNames[0]]
    const rcl1 = room && room.controller && room.controller.level == 1
    const hasOneSpawn = room && room.find(FIND_MY_STRUCTURES).filter(s => s.structureType == STRUCTURE_SPAWN).length == 1
    const noCreeps = Object.keys(Game.creeps).length == 0
    if(!Memory.gameState || (roomNames.length == 1 && rcl1 && hasOneSpawn && noCreeps)){
        Object.keys(Memory).forEach(key => delete Memory[key])
        Memory.creeps = {}
        Memory.rooms = {}
        Memory.spawns = {}
        Memory.gameState = 0
    }
}

function runEarlyGame(){
    const spawn = Object.values(Game.spawns)[0]
    if(!spawn){
        Memory.gameState = 1
        return
    }
    const sources = spawn.room.find(FIND_SOURCES)


    sq.schedule(spawn, rR.name, false, null, 100, -5)
    sq.schedule(spawn, rM.name, false, sources[0].id, 200, -4)
    sq.schedule(spawn, rR.name, false, null, 100, -3)
    sq.schedule(spawn, rU.name, false, null, 200, -2)
    sq.schedule(spawn, rM.name, false, sources[1].id, 300, -1)
    Memory.gameState = 1
}

function updateSpawnStress(spawn: StructureSpawn){
    const room = spawn.room
    const memory = spawn.memory
    if(!memory.spawnAvailability) memory.spawnAvailability = 0.5//start out with expected RCL1 use
    const freeSpawns = memory.sq && memory.sq.length ? 0 : _.filter(room.find(FIND_MY_SPAWNS), s => !s.spawning).length
    memory.spawnAvailability = (memory.spawnAvailability * .9993) + (freeSpawns * 0.0007)
}

function updateRemotes(city: string){
    if(Game.cpu.bucket < settings.bucket.mineralMining){
        return
    }
    const spawn = Game.spawns[city]
    const stress = spawn.memory.spawnAvailability
    const remotes = Object.keys(_.countBy(spawn.memory.sources, s => s.roomName))
    if(remotes.length > 1 && stress < settings.spawnFreeTime - settings.spawnFreeTimeBuffer && Game.time % 500 == 5){
        //drop least profitable remote
        Log.info(`Spawn pressure too high in ${spawn.room.name}, dropping least profitable remote...`)
        const worstRemote = rp.findWorstRemote(spawn.room)
        if(worstRemote){
            Log.info(`Remote ${worstRemote.roomName} removed from ${spawn.room.name}`)
            rp.removeRemote(worstRemote.roomName, spawn.room.name)
        } else {
            Log.info("No remotes to remove")
        }
    }
    if(Game.time % 10 == 3){
        const harasserRecipe = types.getRecipe(rH.type, Game.spawns[city].room.energyCapacityAvailable, Game.spawns[city].room)
        const harasserSize = harasserRecipe.length
        for(let i = 0; i < remotes.length; i++){
            const defcon = updateDEFCON(remotes[i], harasserSize)
            if(defcon >= 4){
                Log.info(`Remote ${remotes[i]} removed from ${spawn.room.name} due to high level threat`)
                rp.removeRemote(remotes[i], spawn.room.name)
            }
            const myCreeps = u.splitCreepsByCity()[city]
            if(Game.rooms[remotes[i]]){
                const invaderCore = Game.rooms[remotes[i]].find(FIND_HOSTILE_STRUCTURES).length
                if(invaderCore){
                    const bricksNeeded = spawn.room.controller.level < 5 ? 2 : 1
                    cU.scheduleIfNeeded(cN.BRICK_NAME, bricksNeeded, false, spawn, myCreeps, remotes[i])
                }
                const reserverCost = 650
                const controller = Game.rooms[remotes[i]].controller
                if(spawn.room.energyCapacityAvailable >= reserverCost && controller && !controller.owner && (!controller.reservation || controller.reservation.ticksToEnd < 1000 || controller.reservation.username != settings.username)){
                    const reserversNeeded = spawn.room.energyCapacityAvailable >= reserverCost * 2 ? 1 : 2
                    cU.scheduleIfNeeded(cN.RESERVER_NAME, reserversNeeded, false, spawn, myCreeps, remotes[i])
                }
            }
            const defenders = _.filter(myCreeps, c => c.ticksToLive > 100 && c.memory.flag == remotes[i])
            if(defcon == 2){
                cU.scheduleIfNeeded(cN.HARASSER_NAME, 1, false, spawn, defenders, remotes[i])
            }
            if(defcon == 3){
                cU.scheduleIfNeeded(cN.HARASSER_NAME, 2, false, spawn, defenders, remotes[i])
                cU.scheduleIfNeeded(cN.QUAD_NAME, 4, false, spawn, defenders, remotes[i])
            }
        }
    }
}

function updateDEFCON(remote, harasserSize){
    //1: no threat
    //2: one harasser guard for invaders
    //3: 2 harassers and a quad TODO: dynamic defense
    //4: abandon room
    const roomInfo = u.getsetd(Cache.roomData, remote, {})
    if(!roomInfo.d){
        roomInfo.d = 2
    }
    if(Game.rooms[remote]){
        if(Game.rooms[remote].controller){
            if(Game.rooms[remote].controller.my){
                Cache.roomData[remote].d = 1
                return Cache.roomData[remote].d
            } else if(Game.rooms[remote].controller.owner){
                Cache.roomData[remote].d = 4
                return Cache.roomData[remote].d
            }
        } else {
            roomInfo.d = 3
        }
        const hostiles = _.filter(u.findHostileCreeps(Game.rooms[remote]), h => h instanceof Creep &&
            (h.getActiveBodyparts(WORK) || h.getActiveBodyparts(RANGED_ATTACK) || h.getActiveBodyparts(ATTACK) || h.getActiveBodyparts(HEAL)))
        let hostileParts = 0
        for(let i = 0; i < hostiles.length; i++){
            const hostile = hostiles[i] as Creep
            hostileParts += hostile.body.length
        }
        if(hostileParts > harasserSize * 6){
            roomInfo.d = 4
        } else if(hostileParts > harasserSize){
            roomInfo.d = 3
        } else if(hostileParts > 0){
            roomInfo.d = 2
        } else {
            roomInfo.d = 1
        }
    } else {
        if(Game.time % 1000 == 3 && roomInfo.d == 4){
            roomInfo.d == 3
        }
    }
    Cache.roomData[remote].d = roomInfo.d
    return roomInfo.d
}

export = {
    chooseClosestRoom: chooseClosestRoom,
    runCity: runCity,
    updateCountsCity: updateCountsCity,
    runTowers: runTowers,
    runPowerSpawn: runPowerSpawn,
    setGameState: setGameState,
    runEarlyGame: runEarlyGame,
}
