var actions = require('actions');
var t = require('types');
var u = require('utils');

var rT = {
    name: "transporter",
    type: "transporter",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        var city = creep.memory.city;
        if(city == "E9N10"){//new transporter only in this room fort now so we can profile and compare
            rT.init(creep)
            if (creep.saying > 0){
                creep.say(creep.saying - 1)
                return;
            }
            if(!creep.memory.targetId){
                creep.memory.targetId = null;
            }
            if (creep.carry.energy == 0) {
                //refill on energy
                if(rT.refill(creep, city) === 1){
                    //start moving to target
                    let target = Game.getObjectById(creep.memory.targetId)
                    if(!target || !rT.needsEnergy(target)){//if no target or current target doesn't need energy, try to get a new target
                        target = rT.getNextTarget(creep)
                    }
                    if(!target){//if no targets go dormant
                        creep.say(20)
                        return
                    }
                    if(!creep.pos.isNearTo(target.pos)){//start moving to target if not already in range
                        creep.moveTo(target, {reusePath: 15, range: 1});
                    }
                }
            } else {
                let target = Game.getObjectById(creep.memory.targetId)
                if(!target || !rT.needsEnergy(target)){//if no target or current target doesn't need energy, try to get a new target
                    target = rT.getNextTarget(creep)
                }
                if(!target){//if no targets go dormant
                    creep.say(20)
                    return
                }
                if(actions.charge(creep, target) === 1){//if deposit successful, start moving to next location
                    if(creep.store[RESOURCE_ENERGY] > target.store.getFreeCapacity(RESOURCE_ENERGY)){
                        //if energy left over, go to next extension
                        target = rT.getNextTarget(creep)
                        if(!target){
                            creep.say(20)
                            return;
                        }
                        if(!creep.pos.isNearTo(target.pos)){
                            creep.moveTo(target, {reusePath: 15, range: 1});
                        }
                    } else{//go to storage
                        rT.refill(creep, city)
                    }
                }
            }
            return
        }
        if (creep.saying > 0){
            creep.say(creep.saying - 1)
            return;
        }
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
                        creep.say(20)
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
                    );
                },
                maxOps: 30
        });
    },

    init: function(creep){//set a transporter to a direction to parse the extension list
        if(creep.memory.direction){
            return
        }
        //1 === forwards, 2 === backwards
        let transporter = _.find(creep.room.find(FIND_MY_CREEPS), creep => creep.memory.role == 'transporter' && creep.memory.direction)
        if(transporter){
            creep.memory.direction = 3 - transporter.memory.direction;
        } else {
            creep.memory.direction = 1;
        }
    },

    needsEnergy: function(structure){
        switch(structure.structureType){
            case STRUCTURE_EXTENSION:
            case STRUCTURE_SPAWN:
            case STRUCTURE_LAB:
            case STRUCTURE_NUKER:
                //if there is any room for energy, needs energy
                if(structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0){
                    return true;
                } else {
                    return false;
                }
            case STRUCTURE_TOWER:
                //arbitrary buffer
                if(structure.store.getFreeCapacity(RESOURCE_ENERGY) > 300){
                    return true;
                } else {
                    return false;
                }
            case STRUCTURE_POWER_SPAWN:
                //arbitrary buffer
                if(structure.store.getFreeCapacity(RESOURCE_ENERGY) > 1000){
                    return true;
                } else {
                    return false;
                }
            case STRUCTURE_FACTORY:
                //arbitrary max value
                if(structure.store.getUsedCapacity(RESOURCE_ENERGY) < 10000){
                    return true;
                } else {
                    return false;
                }
        }
    },

    getNextTarget: function(creep){
        let target = null;
        let extensions = Game.spawns[creep.memory.city].memory.extensions
        if(!creep.memory.target){
            creep.memory.target = 0;
        }
        if(!extensions){
            return null;
        }
        if(creep.memory.direction === 2){
            extensions.reverse();
        }
        for(var i = creep.memory.target; i < extensions.length; i++){//look at each element starting at memory point
            //once target is found, save (i + 1) so creep knows not to recheck location it is already depositing at
            target = Game.getObjectById(extensions[i])
            if(rT.needsEnergy(target)){
                //target found
                creep.memory.targetId = target.id
                creep.memory.target = i + 1
                return target
            }
        }
        //if list completed without finding a target, reset to 0, and return null
        creep.memory.target = 0
        creep.memory.targetId = null;
        return null
    },

    refill: function(creep, city){
        let result = 0;
        if (creep.memory.location){
            var bucket = Game.getObjectById(creep.memory.location);
            if(creep.carry.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(bucket.pos)){
                    creep.moveTo(bucket, {reusePath: 15, range: 1});
                }
                return result;
            }
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
            if(creep.carry.getUsedCapacity() > 0){
                if(!creep.pos.isNearTo(location.pos)){
                    creep.moveTo(location, {reusePath: 15, range: 1});
                }
                return result;
            }
            result = actions.withdraw(creep, location)
            if (result == ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.target = u.getNextLocation(creep.memory.target, targets);
            }
        }
        return result;
    }
};
module.exports = rT;