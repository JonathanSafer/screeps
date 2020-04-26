var a = require("../lib/actions")
var u = require("../lib/utils")
var rU = require("./upgrader")
var template = require("../config/template")
var rD = require("./defender")
var motion = require("../lib/motion")

var rB = {
    name: "builder",
    type: "builder",
    boosts: [RESOURCE_CATALYZED_LEMERGIUM_ACID],

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
            rB.getEnergy(creep)
        }
    },

    repair: function(creep){
        const needRepair = _.find(creep.room.find(FIND_STRUCTURES), structure => (structure.hits < (0.4*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL) && (structure.structureType != STRUCTURE_RAMPART))
        if (needRepair) {
            creep.memory.repair = needRepair.id
            return a.repair(creep, needRepair)
        }
    },

    getEnergy: function(creep) {
        var location = rB.getLocation(creep)
        if(location.store.energy < 300){
            return
        }
        if (a.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES) {
            var targets = u.getWithdrawLocations(creep)
            creep.memory.target = u.getNextLocation(creep.memory.target, targets)
        }
    },

    getLocation: function(creep) {
        var targets = u.getWithdrawLocations(creep)
        var location = targets[creep.memory.target]
        if (location == undefined) {
            location = Game.spawns[creep.memory.city]
        }
        return location
    },

    build: function(creep){
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
        if(Game.time % 20 === 0){//occasionally scan for construction sites
            //if room is under siege (determined by presence of a defender),
            // ignore any construction sites outside of wall limits
            var targets = Game.spawns[creep.memory.city].room.find(FIND_MY_CONSTRUCTION_SITES)
            var siege = _.find(creep.room.find(FIND_MY_CREEPS), c => c.memory.role == rD.name)
            if(siege){
                const plan = creep.room.memory.plan
                targets = _.reject(targets, site => site.pos.x > plan.x + template.dimensions.x + 2
                        || site.pos.y > plan.y + template.dimensions.y + 2
                        || site.pos.x < plan.x - 3
                        || site.pos.y < plan.y - 3)
            }
            if(targets.length){
                var targetsByCost = _.sortBy(targets, target => target.progressTotal)
                creep.memory.build = targetsByCost[0].id
                return true
            }
        }
        return false
    },

    repWalls: function(creep){
        const lookTime = 5
        if(creep.memory.repair){//check for target and repair
            const target = Game.getObjectById(creep.memory.repair)
            if(target){//if there is a target, repair it
                if(creep.repair(target) === ERR_NOT_IN_RANGE){
                    motion.newMove(creep, target.pos, 3)
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
            const walls = _.filter(buildings, struct => [STRUCTURE_RAMPART, STRUCTURE_WALL].includes(struct.structureType))
            if(walls.length){//find lowest hits wall
                const minWall = _.min(walls, wall => wall.hits)
                creep.memory.repair = minWall.id
                return
            }
        }
        return
    },

    getNukeRampart: function(structures, room){
        const nukes = room.find(FIND_NUKES)
        if(!nukes.length){
            return null
        }
        const ramparts = _.filter(structures, s => s.structureType == STRUCTURE_RAMPART && u.isNukeRampart(s.pos))
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
module.exports = rB