var a = require("../lib/actions")
var u = require("../lib/utils")
var motion = require("../lib/motion")
const rB = require("./builder")

var rRe = {
    name: "repairer",
    type: "repairer",

    /** @param {Creep} creep **/
    run: function(creep) {
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
            return a.repair(creep, needRepair)
            //TODO if moving to target, check if road under creep needs repair
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
                    //TODO see if there's something to repair under foot
                }
                return true
            } else {
                creep.memory.build = null
            }
        }
        if(!creep.memory.nextCheckTime || creep.memory.nextCheckTime < Game.time){//occasionally scan for construction sites
            //TODO, compile all source rooms that are safe and get all road sites
            const targets = Game.spawns[creep.memory.city].room.find(FIND_MY_CONSTRUCTION_SITES)
            if(targets.length){
                //TODO sort targets by range (will need custom getRangeTo)
                creep.memory.build = targets[0].id
                return true
            }
            creep.memory.nextCheckTime = Game.time + 100
        }
        return false
    },

    findRepair: function(creep){
        if(creep.memory.repair){
            const target = Game.getObjectById(creep.memory.repair)
            if(target)
                return target
        }
        //TODO find closest road in need of significant repair
        return false
    }
}
module.exports = rRe