var actions = require("../lib/actions")
var u = require("../lib/utils")
var sq = require("../lib/spawnQueue")
var motion = require("../lib/motion")

var rT = {
    name: "transporter",
    type: "transporter",

    /** @param {Creep} creep **/
    run: function(creep) {
        if(rT.endLife(creep)){
            return
        }
        var city = creep.memory.city
        if (creep.saying > 0){
            creep.say(creep.saying - 1)
            return
        }
        if (creep.store.energy == 0) {
            //refill on energy
            if(rT.refill(creep, city) === 1){
                //start moving to target
                const target = rT.findTarget(creep, null)
                rT.moveToTargetIfPresent(creep, target)
            }
        } else {
            const target = rT.findTarget(creep, null)

            if(!target){
                creep.say(30)
                return
            }

            const result = actions.charge(creep, target, false)
            if(result === 1 || !rT.needsEnergy(target)){//successful deposit
                const extra = creep.store[RESOURCE_ENERGY] - target.store.getFreeCapacity(RESOURCE_ENERGY)
                
                if (extra >= 0 || target.store.getUsedCapacity(RESOURCE_ENERGY) >= 10000) {
                    //make sure to remove current target from search list
                    const newTarget = rT.findTarget(creep, target) 
                    //if creep still has energy, start moving to next target
                    if (extra > 0) {
                        rT.moveToTargetIfPresent(creep, newTarget)
                    } else {
                        //start moving to storage already
                        rT.refill(creep, city)
                    }
                }
            }
        }
    },

    moveToTargetIfPresent: function(creep, target) {
        if(!target){
            creep.say(0)
            return
        }
        //start moving to next target if target not already in range
        if(!target.pos.isNearTo(creep.pos)){
            const boundingBox = motion.getBoundingBox(creep.room)
            motion.newMove(creep, target.pos, 1, true, boundingBox)
        }
    },
 
    findTarget: function(creep, oldTarget){
        const ccache = u.getCreepCache(creep.id)
        if (ccache.target && !oldTarget) {
            const cachedTarget = Game.getObjectById(ccache.target)
            if (rT.needsEnergy(cachedTarget)) {
                return cachedTarget
            }
        }

        const targets = _(rT.getTargets(creep, oldTarget))
            .map(Game.getObjectById)
            .value()

        ccache.target = creep.pos.findClosestByRange(targets)
        return ccache.target
    },

    getTargets: function(creep, oldTarget) {
        const rcache = u.getRoomCache(creep.room.name)
        const refillTargets = u.getsetd(rcache, "refillTargets", [])
        const unused = _(refillTargets)
            .filter(id => !oldTarget || id != oldTarget.id)
            .value()

        if (unused.length && !rT.missingTargets(unused, creep.room)) {
            rcache.refillTargets = unused
        } else {
            rcache.refillTargets = rT.emptyTargets(creep.room)
        }
        return rcache.refillTargets
    },

    missingTargets: function(cachedTargets, room) {
        const rcl = room.controller.level
        const missingEnergy = room.energyCapacityAvailable - room.energyAvailable
        const cachedTargetsEnergy = cachedTargets.length * EXTENSION_ENERGY_CAPACITY[rcl]
        return missingEnergy - cachedTargetsEnergy > 1000
    },

    emptyTargets: function(room) {
        return _(room.find(FIND_MY_STRUCTURES))
            .filter(rT.needsEnergy)
            .map("id")
            .value()
    },

    needsEnergy: function(structure){
        if(!structure){
            return false
        }
        const store = structure.store
        switch(structure.structureType){
        case STRUCTURE_EXTENSION:
        case STRUCTURE_SPAWN:
        case STRUCTURE_LAB:
        case STRUCTURE_NUKER:
            //if there is any room for energy, needs energy
            return (store.getFreeCapacity(RESOURCE_ENERGY) > 0)
        case STRUCTURE_TOWER:
        case STRUCTURE_POWER_SPAWN:
            //arbitrary buffer
            return (store.getFreeCapacity(RESOURCE_ENERGY) > 400)
        case STRUCTURE_FACTORY:
            //arbitrary max value
            return (store.getUsedCapacity(RESOURCE_ENERGY) < 10000)
        default:
            return false
        }
    },

    endLife: function(creep){
        if(creep.ticksToLive == 200){
            const transporters = _.filter(creep.room.find(FIND_MY_CREEPS), c => c.memory.role == "transporter")
            if(transporters.length < 2){
                sq.respawn(creep)
            }
        }
        if(creep.ticksToLive > 10 || !creep.room.storage){
            return false
        }
        if(creep.store.getUsedCapacity() > 0){
            actions.charge(creep, creep.room.storage)
        } else {
            creep.suicide()
        }
        return true
    },

    refill: function(creep){
        let result = 0
        if (Game.getObjectById(creep.memory.location)) {
            var bucket = Game.getObjectById(creep.memory.location)
            if(creep.store.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(bucket.pos)){
                    motion.newMove(creep, bucket.pos, 1)
                }
                return result
            }
            result = actions.withdraw(creep, bucket)
            if (result == ERR_NOT_ENOUGH_RESOURCES){
                const targets = u.getWithdrawLocations(creep)
                creep.memory.target = u.getNextLocation(creep.memory.target, targets)
                if (targets[creep.memory.target]){
                    creep.memory.location = targets[creep.memory.target].id
                }
            }
        } else {
            const location = u.getStorage(creep.room)
            creep.memory.location = location.id
            if(creep.store.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(location.pos)){
                    motion.newMove(creep, location.pos, 1)
                }
                return result
            }
            result = actions.withdraw(creep, location)
        }
        return result
    }
}
module.exports = rT