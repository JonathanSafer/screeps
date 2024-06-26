import a = require("../lib/actions")
import roomU = require("../lib/roomUtils")
import { cU } from "../lib/creepUtils"
import rU = require("./upgrader")
import template = require("../config/template")
import rD = require("./defender")
import motion = require("../lib/motion")
import { cN, BodyType } from "../lib/creepNames"
import { CreepActions as cA } from "../lib/boosts"

const rB = {
    name: cN.BUILDER_NAME,
    type: BodyType.builder,
    boosts: [RESOURCE_CATALYZED_LEMERGIUM_ACID],
    actions: [cA.REPAIR],

    /** @param {Creep} creep **/
    run: function(creep) {
        //get boosted if needed
        if(creep.memory.needBoost && !creep.memory.boosted){
            const boost = "XLH2O"
            rU.getBoosted(creep, boost)
            return
        }

        const rcl = Game.spawns[creep.memory.city].room.controller.level
        
        rB.decideWhetherToBuild(creep)
        if(creep.memory.building){
            if(!rB.build(creep)){
                if(rcl >= 4){
                    rB.repWalls(creep)
                } else {
                    rB.repair(creep)
                }
            }
        } else {
            cU.getEnergy(creep)
        }
    },

    repair: function(creep: Creep){
        const needRepair = _.find(creep.room.find(FIND_STRUCTURES), structure => (structure.hits < (0.4*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL) && (structure.structureType != STRUCTURE_RAMPART))
        if (needRepair) {
            creep.memory.repair = needRepair.id
            return a.repair(creep, needRepair)
        } else if(Game.time % 100 == 0 
            && !Game.spawns[creep.memory.city].room.find(FIND_MY_CONSTRUCTION_SITES).length ){
            creep.memory.role = cN.UPGRADER_NAME
        }
    },

    build: function(creep: Creep){
        if(creep.memory.build){//check for site and build
            const site = Game.getObjectById(creep.memory.build)
            if(site){//if there is a build site, build it, else set build to null
                //build site
                if(creep.build(site) === ERR_NOT_IN_RANGE){
                    motion.newMove(creep, site.pos, 3)
                }
                return true
            } else {
                creep.memory.build = null
            }
        }
        if(!creep.memory.nextCheckTime || creep.memory.nextCheckTime < Game.time){//occasionally scan for construction sites
            //if room is under siege (determined by presence of a defender OR active towers),
            // ignore any construction sites outside of wall limits
            let targets = Game.spawns[creep.memory.city].room.find(FIND_MY_CONSTRUCTION_SITES)
            const siege = (_.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.role == rD.name) || Game.spawns[creep.memory.city].memory.towersActive)
                && !Game.spawns[creep.memory.city].room.controller.safeMode
            if(siege){
                const plan = creep.room.memory.plan
                targets = _.reject(targets, site => (site.pos.x > plan.x + template.dimensions.x
                        || site.pos.y > plan.y + template.dimensions.y
                        || site.pos.x < plan.x
                        || site.pos.y < plan.y)
                        && !(site.structureType == STRUCTURE_RAMPART || site.structureType == STRUCTURE_WALL))
            }
            if(targets.length){
                const targetsByCost = _.sortBy(targets, target => target.progressTotal)
                creep.memory.build = targetsByCost[0].id
                return true
            }
            creep.memory.nextCheckTime = Game.time + 100
        }
        return false
    },

    repWalls: function(creep: Creep){
        const lookTime = 5
        if(creep.memory.repair){//check for target and repair
            const target = Game.getObjectById(creep.memory.repair)
            if(target){//if there is a target, repair it
                if(creep.repair(target) === ERR_NOT_IN_RANGE){
                    const box = creep.pos.roomName == Game.spawns[creep.memory.city].pos.roomName 
                        && Game.spawns[creep.memory.city].memory.towersActive 
                        && motion.getBoundingBox(creep.room)
                    if(box){
                        box.top--
                        box.bottom++
                        box.left--
                        box.right++
                    }
                    motion.newMove(creep, target.pos, 3, true, box)
                }
            } else {
                creep.memory.repair = null
            }
        }
        if((creep.store.getFreeCapacity() == 0 && Game.time % lookTime == 0) || !creep.memory.repair){//occasionally scan for next target to repair
            const buildings = Game.spawns[creep.memory.city].room.find(FIND_STRUCTURES)
            const nukeRampart = rB.getNukeRampart(buildings, Game.spawns[creep.memory.city].room)
            if(nukeRampart){
                creep.memory.repair = nukeRampart.id
                return
            }
            const walls = _.filter(buildings, struct => ([STRUCTURE_RAMPART, STRUCTURE_WALL] as string[]).includes(struct.structureType) && !roomU.isNukeRampart(struct.pos))
            if(walls.length){//find lowest hits wall
                const minWall = _.min(walls, wall => wall.hits)
                creep.memory.repair = minWall.id
                return
            }
        }
        return
    },

    getNukeRampart: function(structures: Structure[], room: Room){
        const nukes = room.find(FIND_NUKES)
        if(!nukes.length){
            return null
        }
        const ramparts = _.filter(structures, s => s.structureType == STRUCTURE_RAMPART && roomU.isNukeRampart(s.pos))
        for(const rampart of ramparts){
            let hitsNeeded = 0
            for(const nuke of nukes){
                if(rampart.pos.isEqualTo(nuke.pos)){
                    hitsNeeded += 5000000
                }
                if(rampart.pos.inRangeTo(nuke.pos, 2)){
                    hitsNeeded += 5000000
                }
            }
            if(hitsNeeded > 0 && hitsNeeded + 50000 > rampart.hits){
                return rampart
            }
        }
        return null
    },

    decideWhetherToBuild: function(creep) {
        if(creep.store.energy == 0 && creep.memory.building) {
            creep.memory.building = false
        }
        if(creep.store.energy == creep.store.getCapacity() && !creep.memory.building) {
            creep.memory.building = true
        }
    }
}
export = rB