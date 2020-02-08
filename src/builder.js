var a = require("./actions")
var u = require("./utils")
var rU = require("./upgrader")
var template = require("./template")
var rD = require("./defender")

var rB = {
    name: "builder",
    type: "builder",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        //get boosted if needed
        const city = creep.memory.city
        if(!creep.memory.state){
          creep.memory.state = 0
        }
        const boost = "XLH2O"
        rU.checkBoost(creep, city, boost)
        rU.getBoosted(creep, city, boost)
        if (creep.memory.state != 2){
            return
        }
        
        if(Game.spawns[creep.memory.city].room.controller.level >= 7){//at RCL 8, only build, or repair ramparts and walls
            rB.decideWhetherToBuild(creep)
            if(creep.memory.building){
                if(!rB.build(creep)){
                    rB.repWalls(creep)
                }
            } else {
                rB.getEnergy(creep)
            }
            return
        }
        rB.decideWhetherToBuild(creep)
        if (creep.memory.building) {
            if(!rB.build(creep)){
                rB.repair(creep)
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
                    creep.moveTo(site, {reusePath: 15, range: 3, swampCost: 2, plainCost: 2})
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
        const lookTime = 1
        if(creep.memory.repair){//check for target and repair
            const target = Game.getObjectById(creep.memory.repair)
            if(target){//if there is a target, repair it
                if(creep.repair(target) === ERR_NOT_IN_RANGE){
                    creep.moveTo(target, {reusePath: 15, range: 3, swampCost: 2, plainCost: 2})
                }
            } else {
                creep.memory.repair = null
            }
        }
        if((creep.store.getFreeCapacity() == 0 && Game.time % lookTime == 0) || !creep.memory.repair){//occasionally scan for next target to repair
            const buildings = Game.spawns[creep.memory.city].room.find(FIND_STRUCTURES)
            const walls = _.filter(buildings, struct => struct.structureType === STRUCTURE_RAMPART || struct.structureType === STRUCTURE_WALL).reverse()
            if(walls.length){//find lowest hits wall
                const sortedWalls = _.sortBy(walls, wall => wall.hits)
                creep.memory.repair = sortedWalls[0].id
                return
            }
        }
        return
    },

    decideWhetherToBuild: function(creep) {
        if(creep.carry.energy == 0 && creep.memory.building) {
            creep.memory.building = false
        }
        if(creep.carry.energy == creep.carryCapacity && !creep.memory.building) {
            creep.memory.building = true
        }
    }
}
module.exports = rB