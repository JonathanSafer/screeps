import actions = require("../lib/actions")
import u = require("../lib/utils")
import roomU = require("../lib/roomUtils")
import { cU } from "../lib/creepUtils"
import motion = require("../lib/motion")
import rU = require("./upgrader")
import { cN, BodyType } from "../lib/creepNames"
import types = require("../config/types")
import linkLib = require("../buildings/link")

const rR = {
    name: cN.RUNNER_NAME,
    type: BodyType.runner,
    target: 0,

    /** @param {Creep} creep **/
    run: function(creep: Creep) {
        if (creep.memory.flag && creep.memory.flag.includes("powerMine")){
            rR.runPower(creep)
            return
        }
        if (creep.memory.flag && Game.rooms[creep.memory.flag] && Game.rooms[creep.memory.flag].storage){
            rR.runDelivery(creep)
            return
        }
        if (creep.memory.juicer && rR.runController(creep)){
            return
        }
        if (creep.memory.tug){
            rR.runTug(creep)
            return
        }
        // notice if there's stuff next to you before wandering off!  
        if (Game.cpu.bucket > 9500 || Game.time % 2) {
            actions.notice(creep) // cost: 15% when running, so 7% now
        }
        if(creep.memory.mode == 1 && creep.store.getUsedCapacity() == 0)
            creep.memory.mode = 0
        if(creep.memory.mode == 0 && creep.store.getFreeCapacity() < 0.5 * creep.store.getCapacity()){
            creep.memory.mode = 1
            creep.memory.targetId = null
        }
        if(creep.memory.mode == 0 && !creep.memory.targetId){
            rR.checkForPullees(creep)
            if(creep.memory.tug)
                return
        }
        // if there's room for more energy, go find some more
        // else find storage
        if (creep.memory.mode == 0) {
            if(!rR.pickup(creep)){
                rR.runController(creep)
            }
        } else {
            if (!creep.memory.location || !Game.getObjectById(creep.memory.location))
                creep.memory.location =  (roomU.getStorage(Game.spawns[creep.memory.city].room) as StructureStorage).id
            const target = Game.getObjectById(creep.memory.location)
            if(target.store.energy < 2000 || !rR.runController(creep))
                rR.deposit(creep)
        }
    },

    flipTarget: function(creep: Creep) {
        creep.memory.mode = cU.getNextLocation(creep.memory.mode, roomU.getTransferLocations(creep))
    },

    checkForPullees: function(creep: Creep){
        const pullee = _.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.destination && !c.memory.paired)
        if(pullee){
            creep.memory.tug = true
            creep.memory.pullee = pullee.id
            pullee.memory.paired = creep.id
        }
    },

    runDelivery: function(creep: Creep) {
        // deliver a resource to an allied room
        // if you have a resource, deliver it
        // else pick up a resource from home room
        if (!creep.memory.resource) {
            return
        }
        if (creep.store.getUsedCapacity() > 0) {
            if (creep.memory.resource == RESOURCE_GHODIUM && creep.store.getUsedCapacity() >= SAFE_MODE_COST) {
                if (creep.generateSafeMode(Game.rooms[creep.memory.flag].controller) == ERR_NOT_IN_RANGE) {
                    motion.newMove(creep, Game.rooms[creep.memory.flag].controller.pos, 1)
                }
            } else {
                actions.charge(creep, Game.rooms[creep.memory.flag].storage)
            }
        } else if (creep.room.name == creep.memory.flag) {
            if (creep.room.controller.my) {
                creep.memory.city = creep.room.name + "0"
                creep.memory.flag = null
                creep.memory.resource = null
            } else {
                const recycleSpawn = _.find(creep.room.find(FIND_MY_SPAWNS))
                if (recycleSpawn && recycleSpawn.recycleCreep(creep) == ERR_NOT_IN_RANGE) {
                    motion.newMove(creep, recycleSpawn.pos, 1)
                } else if (!recycleSpawn) {
                    creep.suicide()
                }
            }
        } else {
            actions.withdraw(creep, Game.spawns[creep.memory.city].room.terminal, creep.memory.resource)
        }
    },

    runController: function(creep: Creep){
        const link = rU.getUpgradeLink(creep)

        // short circuits
        if(!link) return false
        if(!creep.memory.juicer && (link.store.getFreeCapacity(RESOURCE_ENERGY) == 0 || creep.room.name != link.room.name)) return false

        const tempMem = u.getsetd(Tmp, Game.spawns[creep.memory.city].room.name, {})

        if(creep.saying == "*" && creep.store.energy == 0){ //successful deposit, remove juicer tag but still reassess
            creep.memory.juicer = false
        }
        const creeps = u.splitCreepsByCity()[creep.memory.city]
        let juicersNeeded = rR.getControllerRunnersNeeded(Game.spawns[creep.memory.city])

        // if a creep has energy, it should be considered for drafting
        // if it has no energy, start by checking for juicers close to the link
        // if there are no juicers near the link, empty runners should be considered for the draft as well
        if (!creep.memory.juicer && creep.store.getUsedCapacity() == 0 
            && _.filter(creeps, c => c.memory.juicer && c.pos.inRangeTo(link.pos, 3)).length > juicersNeeded - 2) {
            return false
        }

        if (creep.store.getFreeCapacity() == 0 && link.store.getFreeCapacity() as number > creep.store.getUsedCapacity()) {
            juicersNeeded += Math.floor(link.store.getFreeCapacity() as number/creep.store.getUsedCapacity())
        }

        if (juicersNeeded == 0) {
            creep.memory.juicer = false
            return false
        }

        // draft
        if (!creep.memory.juicer) {
            if (!tempMem.juicers) {
                tempMem.juicers = _.filter(creeps, c => c.memory.juicer).length
            }
            if (tempMem.juicers < juicersNeeded) {
                creep.memory.juicer = true
                tempMem.juicers++
            } else {
                return false
            }
        }

        // do juicer things
        if (creep.store.energy > 0) {
            if (actions.charge(creep, link) == 1) {
                creep.say("*")
            }
        } else {
            if (!creep.memory.location || !Game.getObjectById(creep.memory.location))
                creep.memory.location =  (roomU.getStorage(Game.spawns[creep.memory.city].room) as StructureStorage).id
            const target = Game.getObjectById(creep.memory.location)
            if(target.store.energy < 1500) return false
            if ( actions.withdraw(creep, target) == 1) {
                motion.newMove(creep, link.pos, 1)
            }
        }
        return true
    },

    pickup: function(creep: Creep) {
        if(creep.memory.targetId) {
            const target = Game.getObjectById(creep.memory.targetId)
            if(target){
                if(!(target instanceof Resource)) {
                    const storeTarget = target as StructureStorage
                    let max = 0
                    let maxResource: string = null
                    for(const resource in storeTarget.store){
                        if(storeTarget.store[resource] > max){
                            max = storeTarget.store[resource]
                            maxResource = resource
                        }
                    }
                    if(actions.withdraw(creep, target, maxResource) == 1)
                        creep.memory.targetId = null
                } else {
                    if(actions.pick(creep, target) == 1)
                        creep.memory.targetId = null
                }
                return true
            }
        }
        const goodLoads = cU.getGoodPickups(creep)
        const runners = _.filter(u.splitCreepsByCity()[creep.memory.city], c => c.memory.role == rR.name)
        if(!goodLoads.length)
            return false
        const newTarget = _.min(goodLoads, function(drop: Resource | Tombstone){
            const distance = PathFinder.search(creep.pos, drop.pos).cost
            let amount = (drop as Resource).amount || (drop as Tombstone).store.getUsedCapacity()
            for(const runner of runners){
                if(runner.memory.targetId == drop.id)
                    amount -= runner.store.getFreeCapacity()
            }
            amount = Math.max(amount, 1)
            return distance/amount
        })
        creep.memory.targetId = (newTarget as Resource | Tombstone).id
        return rR.pickup(creep)
    },

    deposit: function(creep: Creep){
        if (!creep.memory.location || !Game.getObjectById(creep.memory.location))
            creep.memory.location =  (roomU.getStorage(Game.spawns[creep.memory.city].room) as StructureStorage).id
        const target = Game.getObjectById(creep.memory.location)
        if (actions.charge(creep, target) == ERR_FULL) 
            creep.memory.location =  (roomU.getStorage(Game.spawns[creep.memory.city].room) as StructureStorage).id
    },

    runTug: function(creep: Creep){
        const pullee = Game.getObjectById(creep.memory.pullee)
        if(!pullee){
            creep.memory.tug = false
            return
        }
        if(creep.ticksToLive == 1){
            pullee.memory.paired = null
        }
        if(creep.fatigue)
            return
        const destination = new RoomPosition(pullee.memory.destination.x, pullee.memory.destination.y, pullee.memory.destination.roomName)
        if((roomU.isOnEdge(creep.pos) && roomU.isNearEdge(pullee.pos)) || (roomU.isOnEdge(pullee.pos) && roomU.isNearEdge(creep.pos))){
            rR.runBorderTug(creep, pullee, destination)
            return
        }
        if(!pullee.pos.isNearTo(creep.pos)){
            motion.newMove(creep, pullee.pos, 1)
            return
        }
        if(creep.pos.isEqualTo(destination)){
            creep.move(pullee)
            creep.pull(pullee)
            pullee.move(creep)
            creep.memory.tug = false
            pullee.memory.paired = pullee.id
            return
        }
        const range = pullee.memory.sourcePos && new RoomPosition(destination.x, destination.y, destination.roomName).isEqualTo(pullee.memory.sourcePos.x, pullee.memory.sourcePos.y)  ? 1 : 0
        motion.newMove(creep, destination, range)
        creep.pull(pullee)
        pullee.move(creep)
    },

    runBorderTug: function(creep, pullee, destination){
        if(roomU.isOnEdge(creep.pos) && !roomU.isOnEdge(pullee.pos)){
            creep.move(pullee)
            creep.pull(pullee)
            pullee.move(creep)
            return
        }
        const endRoom = destination.roomName
        const path = PathFinder.search(creep.pos, destination).path
        let nextRoomDir = path[0].getDirectionTo(path[1]) as number
        if(nextRoomDir % 2 == 0){
            nextRoomDir = Math.random() < 0.5 ? nextRoomDir - 1 : nextRoomDir + 1
            if (nextRoomDir == 9)
                nextRoomDir = 1
        }

        const nextRoom = Game.map.describeExits(creep.pos.roomName)[nextRoomDir]
        if(roomU.isOnEdge(creep.pos) && roomU.isOnEdge(pullee.pos)){
            //_cp_
            //_pc_
            //_b__
            //__b_
            let direction = null
            if(creep.pos.x == 0){
                direction = RIGHT
            } else if(creep.pos.x == 49){
                direction = LEFT
            } else if(creep.pos.y == 0){
                direction = BOTTOM
            } else {
                direction = TOP
            }
            creep.move(direction)
            return
        }
        const sameRoom = creep.pos.roomName == pullee.pos.roomName
        let direction = null
        if(pullee.pos.x == 0){
            direction = LEFT
        } else if(pullee.pos.x == 49){
            direction = RIGHT
        } else if(pullee.pos.y == 0){
            direction = TOP
        } else {
            direction = BOTTOM
        }
        if(sameRoom && (creep.pos.roomName == endRoom || direction != nextRoomDir)){
            if(!creep.pos.isNearTo(pullee.pos)){
                motion.newMove(creep, pullee.pos, 1)
                return
            }
            const range = new RoomPosition(destination.x, destination.y, destination.roomName).isEqualTo(pullee.memory.sourcePos.x, pullee.memory.sourcePos.y)  ? 1 : 0
            motion.newMove(creep, destination, range)
            creep.pull(pullee)
            pullee.move(creep)
            return
        }
        if(!sameRoom && (pullee.pos.roomName == endRoom || pullee.pos.roomName == nextRoom)){
            motion.newMove(creep, pullee.pos)
        }
        //cases
        //_p_c --> do nothing
        //cp__ --> do nothing
    },

    runPower: function(creep){
        if (_.sum(creep.store) > 0){
            if (!creep.memory.location){
                creep.memory.location = Game.spawns[creep.memory.city].room.storage.id
            }
            const target = Game.getObjectById(creep.memory.location)
            if (target){
                actions.charge(creep, target)
            }
            return
        }
        //check for flag
        const flagName = creep.memory.flag || creep.memory.city + "powerMine"
        const flag = Memory.flags[flagName]
        if (flag && flag.roomName !== creep.pos.roomName){
            //move to flag range 5
            motion.newMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName), 5)
            return
        }
        if (flag) {
            const flagPos = new RoomPosition(flag.x, flag.y, flag.roomName)
            //check for resources under flag
            const resource = Game.rooms[flag.roomName].lookForAt(LOOK_RESOURCES, flagPos)
            if (resource.length){
                //pickup resource
                if (creep.pickup(resource[0]) == ERR_NOT_IN_RANGE){
                    motion.newMove(creep, flagPos, 1)
                }

                return
            }
            const ruin = Game.rooms[flag.roomName].lookForAt(LOOK_RUINS, flagPos)
            if (ruin.length){
                //pickup resource
                if (creep.withdraw(ruin[0], RESOURCE_POWER) == ERR_NOT_IN_RANGE)
                    motion.newMove(creep, flagPos, 1)
                return
            }
            //move to flag
            if (!creep.pos.inRangeTo(flagPos, 4))
                motion.newMove(creep, flagPos, 4)
            // every 50 ticks check for powerbank
            if (Game.time % 50 == 0){
                const powerBank = Game.rooms[flag.roomName].lookForAt(LOOK_STRUCTURES, flagPos)
                // if no powerbank, remove flag
                if (!powerBank.length)
                    delete Memory.flags[flagName]
            }
            return
        }
        if (Game.time % 50 == 0)
            creep.memory.flag = null
    },

    getControllerRunnersNeeded: function(spawn: StructureSpawn){
        const roomCache = u.getRoomCache(spawn.room.name)
        const controllerRunnersNeeded = u.getsetd(roomCache, "cRunners", [0, 0])
        if (Game.time > controllerRunnersNeeded[1]) {
            controllerRunnersNeeded[0] = rR.updateControllerRunnersNeeded(spawn)
            controllerRunnersNeeded[1] = Game.time + 36
        }
        return controllerRunnersNeeded[0]
    },

    updateControllerRunnersNeeded: function(spawn: StructureSpawn){
        const upgraders = _.filter(u.splitCreepsByCity()[spawn.name], c => c.memory.role == cN.UPGRADER_NAME).length
        const upgraderBody = types.getRecipe(cN.UPGRADER_NAME, spawn.room.energyCapacityAvailable, spawn.room)
        const totalWorks = upgraders * upgraderBody.filter(part => part == WORK).length

        const runnerBody = types.getRecipe(cN.RUNNER_NAME, spawn.room.energyCapacityAvailable, spawn.room)
        const runnerCarryCapacity = runnerBody.filter(part => part == CARRY).length * CARRY_CAPACITY

        const controllerPos = linkLib.getUpgradeLinkPos(spawn.room) || spawn.room.controller.pos

        const distance = PathFinder.search(spawn.pos, {pos: controllerPos, range: 2}, {swampCost: 1}).cost
        const energyNeeded = totalWorks * distance * 2

        return Math.ceil(energyNeeded/runnerCarryCapacity)
    }
    
}
export = rR
