//for now this just gets utrium from storage and puts in the terminal, but in the future this will also transport other minerals to and from the terminal, storage, and labs.
var actions = require('actions');
var t = require('types');
var u = require('utils');

var rF = {
    name: "ferry",
    type: "ferry",
    target: () => 0,
    limit: () => 1,

    /** @param {Creep} creep **/
    run: function(creep) {
        if ((creep.carry['U'] == undefined) && (creep.carry.energy < 1)){
            var structures = creep.room.find(FIND_STRUCTURES);
            var targets = _.filter(structures, structure => structure.structureType == STRUCTURE_STORAGE);
            var location = targets[0];
            if (location.store['U'] == undefined){
                if (((creep.room.terminal.store.energy < 150000) || (creep.room.terminal.store.energy == undefined))
                    && (location.store.energy > 150000)){
                        actions.withdraw(creep, location, RESOURCE_ENERGY)
                    }
            } else { actions.withdraw(creep, location, RESOURCE_UTRIUM)
            }
        } else {
                locations = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                return (structure.structureType == STRUCTURE_TERMINAL);
                }
                });
                    actions.charge(creep, locations[0]);
                }
    }
};
module.exports = rF;