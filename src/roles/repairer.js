var a = require("../lib/actions")
var u = require("../lib/utils")
var motion = require("../lib/motion")
const rB = require("./builder")

var rRe = {
    name: "repairer",
    type: "repairer",

    /** @param {Creep} creep **/
    run: function(creep) {
        if(!creep.memory.repPower){
            creep.memory.repPower = REPAIR_POWER * creep.getActiveBodyparts(WORK)
        }
        rB.decideWhetherToBuild(creep)
        if(creep.memory.building){
            if(!rRe.build(creep))
                rRe.repair(creep)
        } else {
            rRe.getEnergy(creep)
        }
    },

    repair: function(creep){
        const needRepair = rRe.findRepair(creep)
        if (needRepair) {
            creep.memory.repair = needRepair.id
            if(creep.repair(needRepair) == ERR_NOT_IN_RANGE){
                motion.newMove(creep, needRepair.pos, 3)
                rRe.closeRepair(creep)
            }
        }
    },

    getEnergy: function(creep) {
        const location = u.getStorage(Game.spawns[creep.memory.city].room)
        //TODO compile all energy depots and choose closest one (probably using runner's method)
        if (a.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES) {
            //TODO set location to null so that new one is found on next tick
        }
    },

    build: function(creep){
        if(creep.memory.build){
            const site = Game.getObjectById(creep.memory.build)
            if(site){
                if(creep.build(site) === ERR_NOT_IN_RANGE){
                    motion.newMove(creep, site.pos, 3)
                    rRe.closeRepair(creep)
                }
                return true
            } else {
                creep.memory.build = null
            }
        }
        if(!creep.memory.nextCheckTime || creep.memory.nextCheckTime < Game.time){//occasionally scan for construction sites
            //TODO, compile all source rooms that are safe and get all road sites
            const rooms = Object.keys(_.countBy(Game.spawns.memory.sources, s => s.pos.roomName))
            let targets = []
            for(let i = 0; i < rooms.length; i++){
                if(Game.rooms[rooms[i]])
                    targets = targets.concat(Game.rooms[rooms[i]].find(FIND_MY_CONSTRUCTION_SITES))
            }
            if(targets.length){
                //TODO sort targets by range (will need custom getRangeTo)
                creep.memory.build = targets[0].id
                return true
            }
            creep.memory.nextCheckTime = Game.time + 100
        }
        return false
    },

    closeRepair: function(creep){
        const target = _.find(creep.pos.findInRange(FIND_STRUCTURES, 3), s => s.hits && s.hitsMax - s.hits > creep.memory.repPower)
        if(target){
            creep.repair(target)
        }
    },

    findRepair: function(creep){
        if(creep.memory.repair){
            const target = Game.getObjectById(creep.memory.repair)
            if(target)
                return target
        }
        const rooms = Object.keys(_.countBy(Game.spawns.memory.sources, s => s.pos.roomName))
        let targets = []
        for(let i = 0; i < rooms.length; i++)
            if(Game.rooms[rooms[i]])
                targets = targets.concat(Game.rooms[rooms[i]].find(FIND_STRUCTURES, s => s.structureType != STRUCTURE_WALL && s.hits && s.hitsMax - s.hits > creep.memory.repPower))
        //TODO find closest road in need of significant repair
        return false
    }
}
module.exports = rRe