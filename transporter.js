var actions = require('actions');
var t = require('types');
var u = require('utils');

var rT = {
    name: "transporter",
    type: t.transporter,
    target: 0,
    limit: 3,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.carry.energy == 0) {
            var targets = u.getWithdrawLocations(creep);
            var location = targets[creep.memory.target];
            if (actions.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES){
                creep.memory.target = u.getNextLocation(creep.memory.target, targets);
            }
        } else {
            locations = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_EXTENSION 
                                || structure.structureType == STRUCTURE_TOWER
                                || structure.structureType == STRUCTURE_SPAWN) 
                                && structure.energy < structure.energyCapacity;
                    }
            });
            if (locations.length > 2){
                actions.charge(creep, locations[Number(creep.name) % 3]);
            } else {
                actions.charge(creep, locations[0]);
            }
      }
    }
};
module.exports = rT;