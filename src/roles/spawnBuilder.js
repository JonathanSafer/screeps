var a = require("../lib/actions")
var sq = require("../lib/spawnQueue")
var rU = require("./upgrader")
var s = require("../config/settings")
var rBr = require("./breaker")
var motion = require("../lib/motion")
var u = require("../lib/utils")

var rSB = {
    name: "spawnBuilder",
    type: "spawnBuilder",
    target: 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        // Use the spawn queue to set respawn
        if(creep.ticksToLive == 500 && Memory.flags.claim) {
            sq.respawn(creep)
        }

        if (Game.cpu.bucket < s.bucket.colony) {
            return
        }

        var city = creep.memory.city
        if(creep.memory.needBoost && !creep.memory.boosted){
            const boost = "XLH2O"
            rU.getBoosted(creep, boost)
            return
        }

        if (creep.hits < creep.hitsMax){
            motion.newMove(creep, Game.spawns[city].pos, 10)
            return
        }
        if (Memory.flags.claimRally && !creep.memory.rally){
            const flag = Memory.flags.claimRally
            motion.newMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName))
            if (flag.x == creep.pos.x && flag.y == creep.pos.y && flag.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return
        }
        if(!Memory.flags.claim){
            Game.spawns[creep.memory.city].memory[rSB.name] = 0
            if(creep.memory.flagRoom){
                if(creep.pos.roomName != creep.memory.flagRoom){
                    motion.newMove(creep, new RoomPosition(24, 24, creep.memory.flagRoom), 23)
                    return
                }
                creep.memory.city = creep.memory.flagRoom + "0"
                const room = Game.rooms[creep.memory.flagRoom]
                const minerCount = _.filter(room.find(FIND_MY_CREEPS), c => c.memory.role == "remoteMiner").length
                if(minerCount < 2){
                    creep.memory.role = "remoteMiner"
                    return
                }
                creep.memory.role = rU.name
            }
            return
        }
        if(!creep.memory.flagRoom){
            creep.memory.flagRoom = Memory.flags.claim.roomName
        }
        if(Game.time % 100 == 0){
            if(!Memory.flags.claim.startTime){
                Memory.flags.claim.startTime = Game.time
            }
            if(Memory.flags.claim.startTime < Game.time - 10000){
                u.removeFlags(Memory.flags.claim.roomName)
                if(Cache.roomData && Cache.roomData[Memory.flags.claim.roomName]){
                    Cache.roomData[Memory.flags.claim.roomName].claimBlock = Game.time + 100000
                }
                return
            }
        }
        if(creep.pos.roomName === Memory.flags.claim.roomName){
            if (!creep.room.controller || !creep.room.controller.my) {
                rBr.breakStuff(creep, null)
                motion.newMove(creep, creep.room.controller.pos, 3)
                return
            }
            if(Game.time % 100 == 0 && rSB.jobDone(creep)){
                u.removeFlags(Memory.flags.claim.roomName)
            }
            if(creep.store.energy == 0 && creep.memory.building){
                creep.memory.building = false
            }
            if(creep.store.energy == creep.store.getCapacity() && !creep.memory.building) {
                creep.memory.building = true
            }
            if (creep.memory.building){
                rSB.build(creep)
            } else {
                rSB.harvest(creep)
            }
        } else {
            const flag = Memory.flags.claim
            motion.newMove(creep, new RoomPosition(flag.x, flag.y, flag.roomName), 5)
        }
    },

    jobDone: function(creep) {
        const extensions = _.filter(creep.room.find(FIND_MY_STRUCTURES), structure => structure.structureType == STRUCTURE_EXTENSION)
        const cSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
        return (extensions.length > 4 && !cSites.length)
    },
    
    build: function(creep) {
        if(creep.room.controller && creep.room.controller.level < 2 
            || creep.room.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[creep.room.controller.level] - 5000
            || (creep.room.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[creep.room.controller.level] - 1000 && creep.pos.inRangeTo(creep.room.controller.pos, 3))){
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                motion.newMove(creep, creep.room.controller.pos, 3)
            }
            return
        }
        var targets = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
        var spawns = _.find(targets, site => site.structureType == STRUCTURE_SPAWN)
        var extensions = _.find(targets, site => site.structureType == STRUCTURE_EXTENSION)
        var storage = _.find(targets, site => site.structureType == STRUCTURE_STORAGE)
        var terminal = _.find(targets, site => site.structureType == STRUCTURE_TERMINAL)
        var tower = _.find(targets, site => site.structureType == STRUCTURE_TOWER)
        if(targets.length) {
            var target = targets[0]
            if (terminal){
                target = terminal
            } else if (storage){
                target = storage
            } else if (extensions){
                target = extensions
            } else if (spawns){
                target = spawns
            } else if(tower){
                target = tower
            }
            if(creep.build(target) == ERR_NOT_IN_RANGE) {
                motion.newMove(creep, target.pos, 3)
            }
        } else {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                motion.newMove(creep, creep.room.controller.pos, 3)
            }
        }  
    },
    
    harvest: function(creep) {
        const terminal = creep.room.terminal
        if(terminal && terminal.store[RESOURCE_ENERGY] >= creep.store.getCapacity()){
            a.withdraw(creep, terminal, RESOURCE_ENERGY)
            return
        }
        const dropped = _.find(creep.room.find(FIND_DROPPED_RESOURCES), r => r.resourceType == RESOURCE_ENERGY && r.amount > 50)
        if(dropped){
            a.pick(creep, dropped)
            return
        }
        var sources =  creep.room.find(FIND_SOURCES)
        if (sources.length == 1){
            const result = creep.harvest(sources[0])
            if(result == ERR_NOT_IN_RANGE) {
                motion.newMove(creep, sources[0].pos, 1)
            }
            return
        }
        const result = creep.harvest(sources[creep.memory.target])
        if(result == ERR_NOT_IN_RANGE) {
            if(creep.moveTo(sources[creep.memory.target], {reusePath: 15, range: 1}) == ERR_NO_PATH){
                creep.memory.target = (creep.memory.target + 1) % 2
            }
        } else if (result == ERR_NOT_ENOUGH_RESOURCES){
            creep.memory.target = (creep.memory.target + 1) % 2
        }
    }
}
module.exports = rSB
