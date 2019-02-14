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
        if (creep.carry.energy == 0) {
            var targets = u.getWithdrawLocations(creep);
            var location = targets[creep.memory.target];
            if (location == undefined) {
              location = Game.spawns[city];
              creep.memory.noContainers = true;
            } else {
                creep.memory.noContainers = false;
            }
            if (actions.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.target = u.getNextLocation(creep.memory.target, targets);
            }
        } else {
            if (creep.memory.targetId){
                let target = Game.getObjectById(creep.memory.targetId)
                if (target && target.energy < target.energyCapacity){
                    actions.charge(creep, target)
                } else {
                    if(creep.memory.noContainers){
                       let locations = creep.room.find(FIND_STRUCTURES, {
                             filter: (structure) => {
                                return (structure.structureType == STRUCTURE_EXTENSION 
                                    || structure.structureType == STRUCTURE_TOWER) 
                                    && structure.energy < structure.energyCapacity;
                            }
                        });
                        if (locations.length > 2){
                            actions.charge(creep, locations[Number(creep.name) % 3]);
                        } else if (locations.length) {
                            actions.charge(creep, locations[0]);
                        } 
                    } else {
                        let locations = creep.room.find(FIND_STRUCTURES, {
                                filter: (structure) => {
                                    return (structure.structureType == STRUCTURE_EXTENSION 
                                            || structure.structureType == STRUCTURE_TOWER
                                            || structure.structureType == STRUCTURE_SPAWN
                                            || structure.structureType == STRUCTURE_LAB
                                            || structure.structureType == STRUCTURE_NUKER
                                            || structure.structureType == STRUCTURE_POWER_SPAWN) 
                                            && structure.energy < structure.energyCapacity;
                                }
                        });
                        if (locations.length > 4){
                            actions.charge(creep, locations[Number(creep.name) % 5]);
                            creep.memory.targetId = locations[Number(creep.name) % 5].id
                        } else if (locations.length) {
                            actions.charge(creep, locations[0]);
                        }
                    }
                }
            } else {
                creep.memory.targetId = 'new';
            }
        }
    }
};
module.exports = rT;