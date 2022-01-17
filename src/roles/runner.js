var actions = require("../lib/actions")
var u = require("../lib/utils")
var roomU = require("../lib/roomUtils")
var cU = require("../lib/creepUtils")
var motion = require("../lib/motion")
const settings = require("../config/settings")
const rU = require("./upgrader")

var rR = {
    name: "runner",
    type: "runner",
    target: 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.memory.flag && creep.memory.flag.includes("powerMine")){
            rR.runPower(creep)
            return
        }
        if(creep.memory.juicer && rR.runController(creep)){
            return
        }
        if(creep.memory.tug){
            rR.runTug(creep)
            return
        }
        // notice if there's stuff next to you before wandering off!  
        if (Game.cpu.bucket > 9500 || Game.time % 2) {
            actions.notice(creep) // cost: 15% when running, so 7% now
        }
        if(creep.memory.target == 1 && creep.store.getUsedCapacity() == 0)
            creep.memory.target = 0
        if(creep.memory.target == 0 && creep.store.getFreeCapacity() < 0.5 * creep.store.getCapacity()){
            creep.memory.target = 1
            creep.memory.targetId = null
        }
        if(creep.memory.target == 0 && !creep.memory.targetId){
            rR.checkForPullees(creep)
        }
        // if there's room for more energy, go find some more
        // else find storage
        if (creep.memory.target == 0 && !creep.memory.tug) {
            if(!rR.pickup(creep) && Game.cpu.bucket > 9500){
                rR.runController(creep)
            }
        } else {
            rR.deposit(creep)
        }
    },

    flipTarget: function(creep) {
        creep.memory.target = cU.getNextLocation(creep.memory.target, roomU.getTransferLocations(creep))
    },

    checkForPullees: function(creep){
        const pullee = _.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.destination && !c.memory.paired)
        if(pullee){
            creep.memory.tug = true
            creep.memory.pullee = pullee.id
            pullee.memory.paired = true
        }
    },

    runController: function(creep){
        if(creep.saying == "*" && creep.store.energy == 0){
            creep.memory.juicer = false
            return false
        }
        const link = rU.getUpgradeLink(creep)
        if(!link) return false
        if(!creep.memory.juicer && link.store.getFreeCapacity(RESOURCE_ENERGY) == 0) return false
        creep.memory.juicer = true
        if(creep.store.energy > 0){
            if(actions.charge(creep, link) == 1){
                creep.say("*")
            }
            if(link.store.getFreeCapacity(RESOURCE_ENERGY) == 0){
                const upgrader = _.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.role == rU.name)
                if(!upgrader){
                    creep.memory.juicer = false
                    return false
                }
            }
        } else {
            if (!creep.memory.location || !Game.getObjectById(creep.memory.location))
                creep.memory.location =  u.getStorage(Game.spawns[creep.memory.city].room).id
            const target = Game.getObjectById(creep.memory.location)
            actions.withdraw(creep, target)
        }
        return true
    },

    pickup: function(creep) {
        if(creep.memory.targetId) {
            const target = Game.getObjectById(creep.memory.targetId)
            if(target){
                if(target.store){
                    let max = 0
                    let maxResource = null
                    for(const resource in target.store){
                        if(target.store[resource] > max){
                            max = target.store[resource]
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
        if(!goodLoads.length)
            return false
        const newTarget = _.min(goodLoads, function(drop){
            const distance = PathFinder.search(creep.pos, drop.pos).cost
            const amount = drop.amount || drop.store.getUsedCapacity()
            return distance/amount
        })
        creep.memory.targetId = newTarget.id
        return rR.pickup(creep)
    },

    deposit: function(creep){
        if (!creep.memory.location || !Game.getObjectById(creep.memory.location))
            creep.memory.location =  u.getStorage(Game.spawns[creep.memory.city].room).id
        const target = Game.getObjectById(creep.memory.location)
        if (actions.charge(creep, target) == ERR_FULL) 
            creep.memory.location =  u.getStorage(Game.spawns[creep.memory.city].room).id
    },

    runTug: function(creep){
        const pullee = Game.getObjectById(creep.memory.pullee)
        if(!pullee){
            creep.memory.tug = false
            return
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
            return
        } else if(creep.ticksToLive == 1){
            pullee.memory.paired = false
        }
        const range = new RoomPosition(destination.x, destination.y, destination.roomName).isEqualTo(pullee.memory.sourcePos.x, pullee.memory.sourcePos.y)  ? 1 : 0
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
        const endRoom = pullee.memory.destination.roomName
        const roomDataCache = u.getsetd(Cache, "roomData", {})
        const nextRoomDir = Game.map.findExit(creep.pos.roomName, endRoom, {
            routeCallback: function(roomName){
                if(u.isHighway(roomName)) return 1
                if(Game.map.getRoomStatus(roomName).status != "normal") return Infinity
                const roomData = u.getsetd(roomDataCache, roomName, {})
                if(Memory.remotes[roomName]) return 1
                if(roomData.own && !settings.allies.includes(roomData.own)) return 50
                if(Memory.remotes[roomName]) return 1
                return 50
            }
        })
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
            creep.move(nextRoomDir)
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
            creep.suicide()
    }
    
}
module.exports = rR