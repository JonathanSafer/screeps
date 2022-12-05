import u = require("../lib/utils")
import motion = require("../lib/motion")
import rB = require("./builder")
import rR = require("./runner")
import { cN, BodyType } from "../lib/creepNames"

const rRe = {
    name: cN.REPAIRER_NAME,
    type: BodyType.repairer,

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

    repair: function(creep: Creep){
        const needRepair = rRe.findRepair(creep)
        if (needRepair) {
            creep.memory.repair = needRepair.id
            if(creep.repair(needRepair) == ERR_NOT_IN_RANGE){
                motion.newMove(creep, needRepair.pos, 1)
                rRe.closeRepair(creep)
            }
        }
    },

    build: function(creep: Creep){
        if(creep.memory.build){
            const site = Game.getObjectById(creep.memory.build)
            if(site){
                if(creep.build(site) === ERR_NOT_IN_RANGE){
                    motion.newMove(creep, site.pos, 1)
                    rRe.closeRepair(creep)
                }
                return true
            } else {
                creep.memory.build = null
            }
        }
        if(!creep.memory.nextCheckTime || creep.memory.nextCheckTime < Game.time){//occasionally scan for construction sites
            const runners = _.filter(u.splitCreepsByCity()[creep.memory.city], c => c.memory.role == rR.name)
            const rooms = Object.keys(_.countBy(runners, s => s.pos.roomName))
            let targets: ConstructionSite[] = []
            for(let i = 0; i < rooms.length; i++){
                if(Game.rooms[rooms[i]])
                    targets = targets.concat(Game.rooms[rooms[i]].find(FIND_MY_CONSTRUCTION_SITES, { filter: s => s.structureType == STRUCTURE_ROAD} ))
            }
            targets = targets.concat(creep.room.find(FIND_MY_CONSTRUCTION_SITES, { filter: s => s.structureType == STRUCTURE_ROAD} ))
            if(targets.length){
                creep.memory.build = _.min(targets, s => u.getRangeTo(creep.pos, s.pos)).id
                return true
            }
            creep.memory.nextCheckTime = Game.time + 200
        }
        return false
    },

    closeRepair: function(creep: Creep){
        const target = _.find(creep.pos.findInRange(FIND_STRUCTURES, 3), s => s.hits && s.hitsMax - s.hits > creep.memory.repPower)
        if(target){
            creep.repair(target)
        } else {
            const sites = creep.pos.findInRange(FIND_MY_CONSTRUCTION_SITES, 3)
            if(sites.length){
                creep.build(sites[0])
            }
        }
    },

    findRepair: function(creep: Creep){
        if(creep.memory.repair){
            const target = Game.getObjectById(creep.memory.repair)
            if(target)
                return target
        }
        const runners = _.filter(u.splitCreepsByCity()[creep.memory.city], c => c.memory.role == rR.name)
        const rooms = Object.keys(_.countBy(runners, s => s.pos.roomName))
        let targets: Structure[] = []
        for(let i = 0; i < rooms.length; i++)
            if(Game.rooms[rooms[i]])
                targets = targets.concat(Game.rooms[rooms[i]].find(FIND_STRUCTURES, { filter : s => s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART && s.hits && s.hits/s.hitsMax < 0.3 }))
        targets = targets.concat(creep.room.find(FIND_STRUCTURES, { filter : s => s.structureType != STRUCTURE_WALL && s.structureType != STRUCTURE_RAMPART && s.hits && s.hits/s.hitsMax < 0.3 }))
        if(targets.length){
            return _.min(targets, s => u.getRangeTo(creep.pos, s.pos))
        }
        return false
    }
}
export = rRe