var u = require("../lib/utils")
var motion = require("../lib/motion")
const rB = require("./builder")
const rR = require("./runner")

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
            rR.pickup(creep)
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
            const rooms = Object.keys(_.countBy(Game.spawns.memory.sources, s => s.pos.roomName))
            let targets = []
            for(let i = 0; i < rooms.length; i++){
                if(Game.rooms[rooms[i]])
                    targets = targets.concat(Game.rooms[rooms[i]].find(FIND_MY_CONSTRUCTION_SITES), s => s.structureType == STRUCTURE_ROAD)
            }
            if(targets.length){
                creep.memory.build = _.min(targets, s => u.getRangeTo(creep.pos, s.pos)).id
                return true
            }
            creep.memory.nextCheckTime = Game.time + 200
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
                targets = targets.concat(Game.rooms[rooms[i]].find(FIND_STRUCTURES, s => s.structureType != STRUCTURE_WALL && s.hits && s.hits/s.hitsMax < 0.3))
        if(targets.length){
            creep.memory.repair = _.min(targets, s => u.getRangeTo(creep.pos, s.pos)).id
            return true
        }
        return false
    }
}
module.exports = rRe