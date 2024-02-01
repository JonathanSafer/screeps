import { cN, BodyType } from "../lib/creepNames"
import centralSpawn = require("../buildings/spawn")
import { cU } from "../lib/creepUtils"
import fact = require("../buildings/factory")
import labsLib = require("../buildings/labs")
import link = require("../buildings/link")
import motion = require("../lib/motion")
import pSpawn = require("../buildings/powerSpawn")
import roomU = require("../lib/roomUtils")
import rp = require("./roomplan")
import rr = require("../roles/roles")
import settings = require("../config/settings")
import sq = require("../lib/spawnQueue")
import t = require("../buildings/tower")
import template = require("../config/template")
import types = require("../config/types")
import u = require("../lib/utils")

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
        if(centralSpawn.makeNextCreep(nextRole, city, unhealthyStore, nextRoleInfo.boosted, 
            nextRoleInfo.flag, nextRoleInfo.budget) && usedQueue) {
            sq.removeNextRole(spawn)
        }
    }


    // Run all the creeps in this city
    _.forEach(creeps, (creep) => {
        nameToRole[creep.memory.role][0].run(creep)
    })
    
    link.run(room)
    pSpawn.run(city)
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
        updateFerry(spawn, rcl)
        updateMiner(creeps, rcl8, memory, spawn)
        updateBuilder(rcl, memory, spawn, creeps)
        updateRepairer(spawn, memory, creeps)
        updateUpgrader(city, controller, memory, rcl8, creeps, rcl)
        updateTransporter(extensions, memory, creeps, structures, spawn)
    
        if (Game.time % 500 === 0) {
            runNuker(city)
            labsLib.checkLabs(city)
            updateColonizers(city, claimRoom, unclaimRoom)
            updateMineralMiner(rcl, structures, spawn, creeps)
            pSpawn.update(city, memory)
            updateStorageLink(spawn, memory, structures)
        }
        centralSpawn.makeEmergencyCreeps(extensions, creeps, city, rcl8, emergencyTime) 
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

function updateQR(spawn, creeps){
    if(Game.time % 100 == 5){
        const flag = spawn.name + "qrCode"
        if(Memory.flags[flag]){
            const creepsNeeded = _.sum(template.qrCoords, elem => elem.length)
            cU.scheduleIfNeeded(cN.QR_CODE_NAME, creepsNeeded, false, spawn, creeps, flag)
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
        const injuredCreep = spawn.room.find(FIND_MY_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        const injuredPower: Array<Creep | PowerCreep> = spawn.room.find(FIND_MY_POWER_CREEPS, {filter: (injured) => { 
            return (injured) && injured.hits < injured.hitsMax
        }})
        const hostiles = u.findHostileCreeps(spawn.room)
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

function updateMilitary(city: string, memory, rooms, spawn, creeps) {
    const flags = ["harass", "powerMine", "deposit"]
    const roles = [cN.HARASSER_NAME, cN.POWER_MINER_NAME, cN.DEPOSIT_MINER_NAME]
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

function updateColonizers(city, claimRoom, unclaimRoom) {
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
            cU.scheduleIfNeeded(cN.SPAWN_BUILDER_NAME, 4, true, Game.spawns[city], u.splitCreepsByCity()[city])
        } else if (flag && Game.rooms[flag.roomName] && Game.rooms[flag.roomName].terminal) {
            cU.scheduleIfNeeded(cN.SPAWN_BUILDER_NAME, 4, true, Game.spawns[city], u.splitCreepsByCity()[city])
        } else {
            cU.scheduleIfNeeded(cN.SPAWN_BUILDER_NAME, 2, true, Game.spawns[city], u.splitCreepsByCity()[city])
        }
        if(flag && !Game.rooms[flag.roomName] || !Game.rooms[flag.roomName].controller.my){
            cU.scheduleIfNeeded(cN.CLAIMER_NAME, 1, false, Game.spawns[city], u.splitCreepsByCity()[city])
        }
    }
    if (roomName == unclaimRoom && Game.time % 1000 == 0) {
        sq.schedule(Game.spawns[city], cN.UNCLAIMER_NAME)
    }
}

// Automated defender count for defense
function updateDefender(spawn: StructureSpawn, rcl, creeps) {
    if (Game.time % 30 != 0) {
        return
    }
    const room = spawn.room
    if(spawn.memory.towersActive){
        const hostiles = _.filter(u.findHostileCreeps(room), hostile => hostile instanceof PowerCreep || (_(hostile.body).find(part => part.boost) || rcl < 7) && 
            (hostile.getActiveBodyparts(TOUGH) > 0 || hostile.body.length == 50 || rcl < 8)).length
        if(hostiles > 3){
            //request quad from nearest ally
            Log.info(`City ${spawn.name}: requesting quad from nearest ally`)
            requestSupport(spawn, Math.floor(hostiles/4), rcl)
            if(Game.time % 1500 == 0 && spawn.memory.wallMultiplier)
                spawn.memory.wallMultiplier = Math.min(spawn.memory.wallMultiplier + .1, 20)
        } else {
            cU.scheduleIfNeeded(cN.DEFENDER_NAME, Math.min(Math.floor(hostiles/2), 4), true, spawn, creeps)
        }
    }
    if((rcl <= 2 || room.controller.safeModeCooldown) && !room.controller.safeMode)
        requestSupport(spawn, 1, rcl)
}

function requestSupport(spawn, quadsNeeded, rcl){
    //find reinforce City
    const reinforceCities = _.filter(u.getMyCities(), c => c.controller.level >= rcl)
    const closestRoom = chooseClosestRoom(reinforceCities, spawn.pos)
    if(!closestRoom)
        return
    const reinforceCity = closestRoom + "0"
    const reinforcingSpawn = Game.spawns[reinforceCity]
    const creeps = u.splitCreepsByCity()[reinforceCity]
    cU.scheduleIfNeeded(cN.TRANSPORTER_NAME, 2, false, reinforcingSpawn, creeps)
    cU.scheduleIfNeeded(cN.QUAD_NAME, 4 * quadsNeeded, true, reinforcingSpawn, creeps, spawn.room.name, 400)
}

function cityFraction(cityName) {
    const myCities = _.map(u.getMyCities(), city => city.name).sort()
    return _.indexOf(myCities, cityName) / myCities.length
}

function updateMiner(creeps: Creep[], rcl8: boolean, memory: SpawnMemory, spawn: StructureSpawn){
    const flag = Memory.flags.claim
    if(flag && flag.roomName === spawn.pos.roomName &&
        Game.rooms[flag.roomName].controller.level < 6){
        return
    }
    roomU.initializeSources(spawn)

    const powerCreep = spawn.room.find(FIND_MY_POWER_CREEPS, { filter: c => c.powers[PWR_REGEN_SOURCE] }).length
    let bucketThreshold = settings.bucket.energyMining + settings.bucket.range * cityFraction(spawn.room.name)
    if(powerCreep || (spawn.room.storage && spawn.room.storage.store[RESOURCE_ENERGY] < settings.energy.processPower)){
        bucketThreshold -= settings.bucket.range/2
    }
    if (spawn.memory.towersActive || (Game.cpu.bucket < bucketThreshold && rcl8) || Game.time < 100) {
        return
    }
    for(const sourceId in memory.sources){
        cU.scheduleIfNeeded(cN.REMOTE_MINER_NAME, 1, false, spawn, creeps, sourceId)
    }     
}

function updateMineralMiner(rcl, buildings: Structure[], spawn, creeps) {
    if (rcl > 5){
        const extractor = _.find(buildings, structure => structure.structureType == STRUCTURE_EXTRACTOR)
        if(extractor) {
            const minerals = extractor.pos.lookFor(LOOK_MINERALS)
            if (!minerals.length) return
            const mineral = minerals[0]
            const room = spawn.room as Room
            if(room.terminal
                    && mineral.mineralAmount > 0
                    && (room.terminal.store[mineral.mineralType] < 6000
                        || (Game.cpu.bucket > settings.bucket.mineralMining 
                        && room.storage 
                        && room.storage.store.getUsedCapacity(mineral.mineralType) < settings.mineralAmount))){
                cU.scheduleIfNeeded(cN.MINERAL_MINER_NAME, 1, false, spawn, creeps, room.name)
            }
        }
    }
}

function updateTransporter(extensions, memory, creeps, structures: Structure[], spawn) {
    let transportersNeeded = 0
    if (extensions < 1 && !_.find(structures, struct => struct.structureType == STRUCTURE_CONTAINER)){
        return
    } else if (extensions < 5 || creeps.length < 9){
        transportersNeeded = 1
    } else {//arbitrary 'load' on transporters
        transportersNeeded = settings.max.transporters
    }
    cU.scheduleIfNeeded(cN.TRANSPORTER_NAME, transportersNeeded, false, spawn, creeps, null, 200)
    memory[cN.TRANSPORTER_NAME] = 0 //TODO: remove
}

function updateUpgrader(city: string, controller: StructureController, memory: SpawnMemory, rcl8: boolean, creeps: Creep[], rcl: number) {
    const room = Game.spawns[city].room
    if (rcl8){
        const bucketThreshold = settings.bucket.upgrade + settings.bucket.range * cityFraction(room.name)
        const haveEnoughCpu = Game.cpu.bucket > bucketThreshold
        if (controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[rcl]/2 
            || (controller.room.storage.store.energy > settings.energy.rcl8upgrade && haveEnoughCpu && settings.rcl8upgrade)){
            cU.scheduleIfNeeded(cN.UPGRADER_NAME, 1, true, Game.spawns[city], creeps)
        }
    } else {
        const builders = _.filter(creeps, c => c.memory.role == cN.BUILDER_NAME)
        if(builders.length > 3) return
        const bank = roomU.getStorage(room) as StructureStorage
        if(!bank) return
        let money = bank.store[RESOURCE_ENERGY]
        const capacity = bank.store.getCapacity()
        if(rcl < 6 && Game.gcl.level <= 2)//keep us from saving energy in early game
            money += capacity * 0.2
        if(capacity < CONTAINER_CAPACITY){
            if(!builders.length)
                cU.scheduleIfNeeded(cN.UPGRADER_NAME,1, false, Game.spawns[city], creeps)
            return
        }
        let storedEnergy = bank.store[RESOURCE_ENERGY]
        for(const c of creeps){
            if(c.room.name == controller.room.name)
                storedEnergy += c.store.energy
        }
        const energyMultiplier = rcl > 2 ? 2 : 4
        const needed = room.storage ? Math.floor(Math.pow((money/capacity) * 4, 8)) : Math.floor((storedEnergy*energyMultiplier/capacity))
        Log.info(`City ${city}: stored energy: ${storedEnergy}, upgraders requested: ${needed}`)
        const maxUpgraders = 7 - builders.length
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
    cU.scheduleIfNeeded(cN.REPAIRER_NAME, repairersNeeded, false, spawn, creeps)
}

function updateBuilder(rcl, memory, spawn: StructureSpawn, creeps: [Creep]) {
    const room = spawn.room
    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
    const storage = roomU.getStorage(room) as StructureStorage | StructureContainer | StructureSpawn
    let totalSites
    if (rcl < 4) {
        const repairSites = _.filter(room.find(FIND_STRUCTURES), structure => (structure.hits < (structure.hitsMax*0.3)) 
            && (structure.structureType != STRUCTURE_WALL))
        totalSites = (Math.floor((repairSites.length)/10) + constructionSites.length)
    } else {
        totalSites = constructionSites.length
    }
    if (totalSites > 0){
        if(storage.structureType == STRUCTURE_CONTAINER){
            //make builders based on quantity of carried energy in room
            let energyStore = storage.store.energy
            for(const c of creeps){
                energyStore += c.store.energy
            }
            const upgraders = _.filter(creeps, c => c.memory.role == cN.UPGRADER_NAME).length
            const buildersNeeded = Math.max(Math.floor(energyStore*2/CONTAINER_CAPACITY) - upgraders, 3)
            Log.info(`City ${spawn.name}: stored energy: ${energyStore}, builders requested: ${buildersNeeded}`)
            cU.scheduleIfNeeded(cN.BUILDER_NAME, buildersNeeded, rcl >= 6, spawn, creeps)
        } else {
            cU.scheduleIfNeeded(cN.BUILDER_NAME, settings.max.builders, rcl >= 6, spawn, creeps)
        }
    }
    if(rcl >= 4 && Game.cpu.bucket > settings.bucket.repair + settings.bucket.range * cityFraction(room.name) && spawn.room.storage && spawn.room.storage.store[RESOURCE_ENERGY] > settings.energy.repair){
        const walls = _.filter(spawn.room.find(FIND_STRUCTURES), 
            struct => ([STRUCTURE_RAMPART, STRUCTURE_WALL] as string[]).includes(struct.structureType) 
            && !roomU.isNukeRampart(struct.pos))
        if(walls.length){//find lowest hits wall
            if(!spawn.memory.wallMultiplier){
                spawn.memory.wallMultiplier = 1
            }
            if(Game.time % 10000 == 0 && Math.random() < .1)
                spawn.memory.wallMultiplier = Math.min(spawn.memory.wallMultiplier + .1, 10)
            const minHits = _.min(walls, wall => wall.hits).hits
            const defenseMode = !spawn.room.controller.safeMode && spawn.room.controller.safeModeCooldown
            const wallHeight = Game.gcl.level < 3 ? settings.wallHeight[Math.min(rcl - 1, 3)] : settings.wallHeight[rcl - 1] *  spawn.memory.wallMultiplier
            if(minHits < wallHeight || defenseMode){
                cU.scheduleIfNeeded(cN.BUILDER_NAME, 3, rcl >= 6, spawn, creeps)
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
                    sq.schedule(spawn, cN.BUILDER_NAME, rcl >= 7)
                    return
                }
            }
        }
    }
}

function updateRunner(creeps: Creep[], spawn, extensions, memory, rcl, emergencyTime) {
    if (rcl == 8 && !emergencyTime && Game.cpu.bucket < settings.bucket.mineralMining) {
        return
    }
    const miners = _.filter(creeps, creep => creep.memory.role == cN.REMOTE_MINER_NAME && !creep.memory.link)
    const minRunners = rcl < 7 ? 2 : 0
    const distances = _.map(miners, miner => PathFinder.search(spawn.pos, miner.pos).cost)
    let totalDistance = _.sum(distances)
    if(extensions < 10 && Object.keys(Game.rooms).length == 1) totalDistance = totalDistance * 0.8//for when there are no reservers
    const minerEnergyPerTick = SOURCE_ENERGY_CAPACITY/ENERGY_REGEN_TIME
    const energyProduced = 2 * totalDistance * minerEnergyPerTick
    const energyCarried = types.store(types.getRecipe(BodyType.runner, spawn.room.energyCapacityAvailable, spawn.room))
    let runnersNeeded = Math.min(settings.max.runners, Math.max(Math.ceil(energyProduced / energyCarried), minRunners))
    const upgraders = _.filter(creeps, creep => creep.memory.role == cN.UPGRADER_NAME).length
    runnersNeeded += Math.floor(upgraders/4)
    cU.scheduleIfNeeded(cN.RUNNER_NAME, runnersNeeded, false, spawn, creeps)
    memory[cN.RUNNER_NAME] = 0 //TODO: remove
}

function updateFerry(spawn, rcl) {
    if (rcl >= 5) {
        cU.scheduleIfNeeded(cN.FERRY_NAME, 1, false, spawn, u.splitCreepsByCity()[spawn.name])
    }
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
        const boosted = role != cN.HARASSER_NAME || Memory.flags[flag].boosted && PServ
        const numNeeded = role == cN.POWER_MINER_NAME && PServ ? 2 : 1
        // distance is a very rough approximation here, so not bothering to factor in spawn time
        const route = motion.getRoute(spawn.room.name, Memory.flags[flag].roomName, true)
        const distance = route == -2 ? 0 : route.length * 50
        cU.scheduleIfNeeded(role, numNeeded, boosted, spawn, creeps, flag, distance)
    }
}

function runNuker(city){
    const flagName = city + "nuke"
    const flag = Memory.flags[flagName]
    if (flag && !Tmp.nuked){
        Tmp.nuked = true //ensure that only one nuke is launched per tick (and per iteration)
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
        Memory.startTick = Game.time
    }
}

function runEarlyGame(){
    const spawn = Object.values(Game.spawns)[0]
    if(!spawn){
        Memory.gameState = 1
        return
    }
    const sources = spawn.room.find(FIND_SOURCES)

    // find closest source to spawn
    const closestSource = spawn.pos.findClosestByPath(sources)
    const otherSource = _.find(sources, source => source.id != closestSource.id)


    sq.schedule(spawn, cN.RUNNER_NAME, false, null, 100, -7)
    sq.schedule(spawn, cN.REMOTE_MINER_NAME, false, closestSource.id, 200, -6)
    sq.schedule(spawn, cN.RUNNER_NAME, false, null, 100, -5)
    sq.schedule(spawn, cN.UPGRADER_NAME, false, null, 200, -4)
    if(roomU.countMiningSpots(closestSource.pos) > 1){
        sq.schedule(spawn, cN.REMOTE_MINER_NAME, false, closestSource.id, 300, -3)
    }
    sq.schedule(spawn, cN.REMOTE_MINER_NAME, false, otherSource.id, 300, -2)
    if(roomU.countMiningSpots(otherSource.pos) > 1){
        sq.schedule(spawn, cN.REMOTE_MINER_NAME, false, otherSource.id, 200, -1)
    }
    Memory.gameState = 1
}

function updateSpawnStress(spawn: StructureSpawn){
    const room = spawn.room
    const memory = spawn.memory
    if(!memory.spawnAvailability) memory.spawnAvailability = 1//start out with expected RCL1 use
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
        const harasserRecipe = types.getRecipe(BodyType.harasser, Game.spawns[city].room.energyCapacityAvailable, Game.spawns[city].room)
        const harasserSize = harasserRecipe.length
        for(let i = 0; i < remotes.length; i++){
            if(remotes[i] == spawn.room.name)
                continue
            const defcon = updateDEFCON(remotes[i], harasserSize)
            if(defcon >= 4){
                Log.info(`Remote ${remotes[i]} removed from ${spawn.room.name} due to high level threat`)
                rp.removeRemote(remotes[i], spawn.room.name)
                continue
            }
            if(Game.time % 100 == 3 && Game.rooms[remotes[i]]) {
                // ensure that we can still safely path all sources in the remote
                // find all sources
                let droppedRemote = false
                const sources = Game.rooms[remotes[i]].find(FIND_SOURCES)
                for (const source of sources) {
                    const pathLength = u.getRemoteSourceDistance(spawn.pos, source.pos)
                    if (pathLength == -1) {
                        Log.info(`Remote ${remotes[i]} removed from ${spawn.room.name} due to inaccessable source at ${source.pos}`)
                        rp.removeRemote(remotes[i], spawn.room.name)
                        droppedRemote = true
                        break
                    }
                }
                if (droppedRemote) {
                    continue
                }
            }
            const myCreeps = u.splitCreepsByCity()[city]
            if (u.isSKRoom(remotes[i])){
                //if room is under rcl7 spawn a quad
                if (spawn.room.controller.level < 7){
                    cU.scheduleIfNeeded(cN.QUAD_NAME, 1, false, spawn, myCreeps, remotes[i], 300)
                } else {
                    cU.scheduleIfNeeded(cN.SK_GUARD_NAME, 1, false, spawn, myCreeps, remotes[i], 300)
                }
            }
            if(Game.rooms[remotes[i]]){
                const invaderCore = Game.rooms[remotes[i]].find(FIND_HOSTILE_STRUCTURES).length
                if(invaderCore && !u.isSKRoom(remotes[i])){
                    const bricksNeeded = spawn.room.controller.level < 5 ? 4 : 1
                    cU.scheduleIfNeeded(cN.BRICK_NAME, bricksNeeded, false, spawn, myCreeps, remotes[i], 100)
                }
                const reserverCost = 650
                const controller = Game.rooms[remotes[i]].controller
                if(spawn.room.energyCapacityAvailable >= reserverCost && controller && !controller.owner && (!controller.reservation || controller.reservation.ticksToEnd < 2000 || controller.reservation.username != settings.username)){
                    const reserversNeeded = spawn.room.energyCapacityAvailable >= reserverCost * 2 ? 1 : 2
                    cU.scheduleIfNeeded(cN.RESERVER_NAME, reserversNeeded, false, spawn, myCreeps, remotes[i], 100)
                }
            }
            if(defcon == 2){
                cU.scheduleIfNeeded(cN.HARASSER_NAME, 1, false, spawn, myCreeps, remotes[i], 300)
            }
            if(defcon == 3){
                cU.scheduleIfNeeded(cN.HARASSER_NAME, 2, false, spawn, myCreeps, remotes[i], 300)
                cU.scheduleIfNeeded(cN.QUAD_NAME, 4, false, spawn, myCreeps, remotes[i], 300)
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
        const remoteRoom = Game.rooms[remote]
        if(remoteRoom.controller && (remoteRoom.controller.owner
            || (remoteRoom.controller.reservation 
                && Memory.settings.allies.includes(remoteRoom.controller.reservation.username)
                && remoteRoom.controller.reservation.username != settings.username))){
            Cache.roomData[remote].d = 4
            return Cache.roomData[remote].d
        }
        // if room is an SK room, check for invader core
        if(u.isSKRoom(remote)){
            const invaderCore = _.find(remoteRoom.find(FIND_HOSTILE_STRUCTURES), s => s.structureType == STRUCTURE_INVADER_CORE) as StructureInvaderCore
            if(invaderCore && !invaderCore.ticksToDeploy){
                Cache.roomData[remote].d = 4
                // set scout time to now
                Cache.roomData[remote].sct = Game.time
                // set safeTime to core expiry
                Cache.roomData[remote].sME = Game.time + invaderCore.effects[0].ticksRemaining
                return Cache.roomData[remote].d
            }
        }
        const hostiles = _.filter(u.findHostileCreeps(Game.rooms[remote]), h => h instanceof Creep 
            && h.owner.username != "Source Keeper" 
            && (h.getActiveBodyparts(WORK) 
                || h.getActiveBodyparts(RANGED_ATTACK) 
                || h.getActiveBodyparts(ATTACK) 
                || h.getActiveBodyparts(HEAL)))
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
    setGameState: setGameState,
    runEarlyGame: runEarlyGame,
}
