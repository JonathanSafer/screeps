var actions = require('actions');
var t = require('types');
var u = require('utils');

var rT = {
    name: "transporter",
    type: "transporter",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.saying > 0){
            creep.say(creep.saying - 1)
            return;
        }
        var city = creep.memory.city;
        if (creep.carry.energy == 0) {
            //refill on energy
            if(rT.refill(creep, city) === 1){
                //start moving to target
                let target = rT.findTarget(creep, null)
                if(!target){
                    creep.say(20)
                    return
                }
                if(!creep.pos.isNearTo(target.pos)){
                    creep.moveTo(target, {reusePath: 15, range: 1});
                }
            }
        } else {
            //findClosestByRange(deposit locations)
            let target = rT.findTarget(creep, null)//for now we will call every tick
            //do we call this every tick or cache result or something in between?

            if(!target){
                creep.say(20)
                return
            }

            let result = actions.charge(creep, target)
            if(result === 1){//successful deposit
                //if creep still has energy, start moving to next target
                if(creep.store[RESOURCE_ENERGY] > target.store.getFreeCapacity(RESOURCE_ENERGY)){
                    //start moving to next target if target not already in range
                    newTarget = rT.findTarget(creep, target)//make sure to remove current target from search list
                    if(!newTarget){
                        creep.say(creep.saying - 1)
                        return;
                    }
                    if(!newTarget.pos.isNearTo(creep.pos)){
                        creep.moveTo(newTarget, {reusePath: 15, range: 1});
                    }
                } else {
                    //start moving to storage already
                    rT.refill(creep, city)
                }

            }
        }
    },
 
    findTarget: function(creep, oldTarget){
        let id = 0;
        if(oldTarget){
            id = oldTarget.id
        }
        let locations = creep.room.find(FIND_STRUCTURES, {
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
                    );
                }
        });
        if(locations.length){
            return creep.pos.findClosestByPath(locations)
        } else {
            return false;
        }
    },

    refill: function(creep, city){
        let result = 0;
        if (creep.memory.location){
            var bucket = Game.getObjectById(creep.memory.location);
            result = actions.withdraw(creep, bucket)
            if (result == ERR_NOT_ENOUGH_RESOURCES){
                var targets = u.getWithdrawLocations(creep);
                creep.memory.target = u.getNextLocation(creep.memory.target, targets);
                if (targets[creep.memory.target]){
                    creep.memory.location = targets[creep.memory.target].id
                }
            }
        } else {
            var targets = u.getWithdrawLocations(creep);
            var location = targets[creep.memory.target];
            if (location == undefined) {
              location = Game.spawns[city];
              creep.memory.noContainers = true;
            } else {
                creep.memory.noContainers = false;
            }
            creep.memory.location = location.id;
            result = actions.withdraw(creep, location)
            if (result == ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.target = u.getNextLocation(creep.memory.target, targets);
            }
        }
        return result;
    }
};
module.exports = rT;