var actions = require("./actions")
var u = require("./utils")

var rT = {
    name: "transporter",
    type: "transporter",
    target: () => 0,

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
        if (creep.carry.energy == 0) {
            //refill on energy
            if(rT.refill(creep, city) === 1){
                //start moving to target
                const target = rT.findTarget(creep, null)
                if(!target){
                    creep.say(20)
                    return
                }
                if(!creep.pos.isNearTo(target.pos)){
                    creep.moveTo(target, {reusePath: 15, range: 1})
                }
            }
        } else {
            //findClosestByRange(deposit locations)
            const target = rT.findTarget(creep, null)//for now we will call every tick
            //do we call this every tick or cache result or something in between?

            if(!target){
                creep.say(20)
                return
            }

            const result = actions.charge(creep, target)
            if(result === 1){//successful deposit
                //if creep still has energy, start moving to next target
                if(creep.store[RESOURCE_ENERGY] > target.store.getFreeCapacity(RESOURCE_ENERGY)){
                    //start moving to next target if target not already in range
                    const newTarget = rT.findTarget(creep, target)//make sure to remove current target from search list
                    if(!newTarget){
                        creep.say(20)
                        return
                    }
                    if(!newTarget.pos.isNearTo(creep.pos)){
                        creep.moveTo(newTarget, {reusePath: 15, range: 1})
                    }
                } else {
                    //start moving to storage already
                    rT.refill(creep, city)
                }

            }
        }
    },
 
    findTarget: function(creep, oldTarget){
        let id = 0
        if(oldTarget){
            id = oldTarget.id
        }
        return creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.id !== id && 
                        (((structure.structureType == STRUCTURE_EXTENSION 
                            || structure.structureType == STRUCTURE_SPAWN
                            || structure.structureType == STRUCTURE_LAB
                            || structure.structureType == STRUCTURE_NUKER)
                            && structure.energy < structure.energyCapacity)
                            || (structure.structureType == STRUCTURE_POWER_SPAWN && structure.energy < (structure.energyCapacity - 400))
                            || (structure.structureType == STRUCTURE_FACTORY && structure.store.getUsedCapacity(RESOURCE_ENERGY) < 10000)
                            || (structure.structureType == STRUCTURE_TOWER && structure.energy < (structure.energyCapacity - 400)))
                    )
                },
                maxOps: 10
        })
    },


    needsEnergy: function(structure){
        switch(structure.structureType){
            case STRUCTURE_EXTENSION:
            case STRUCTURE_SPAWN:
            case STRUCTURE_LAB:
            case STRUCTURE_NUKER:
                //if there is any room for energy, needs energy
                if(structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0){
                    return true
                } else {
                    return false
                }
            case STRUCTURE_TOWER:
                //arbitrary buffer
                if(structure.store.getFreeCapacity(RESOURCE_ENERGY) > 300){
                    return true
                } else {
                    return false
                }
            case STRUCTURE_POWER_SPAWN:
                //arbitrary buffer
                if(structure.store.getFreeCapacity(RESOURCE_ENERGY) > 1000){
                    return true
                } else {
                    return false
                }
            case STRUCTURE_FACTORY:
                //arbitrary max value
                if(structure.store.getUsedCapacity(RESOURCE_ENERGY) < 10000){
                    return true
                } else {
                    return false
                }
        }
    },

    endLife: function(creep){
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

    refill: function(creep, city){
        let result = 0
        if (Game.getObjectById(creep.memory.location)) {
            var bucket = Game.getObjectById(creep.memory.location)
            if(creep.carry.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(bucket.pos)){
                    creep.moveTo(bucket, {reusePath: 15, range: 1})
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
            const targets = u.getWithdrawLocations(creep)
            var location = targets[creep.memory.target]
            if (location == undefined) {
              location = Game.spawns[city]
              creep.memory.noContainers = true
            } else {
                creep.memory.noContainers = false
            }
            creep.memory.location = location.id
            if(creep.carry.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(location.pos)){
                    creep.moveTo(location, {reusePath: 15, range: 1})
                }
                return result
            }
            result = actions.withdraw(creep, location)
            if (result == ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.target = u.getNextLocation(creep.memory.target, targets)
            }
        }
        return result
    }
}
module.exports = rT