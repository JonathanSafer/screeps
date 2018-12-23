var actions = require('actions');
var t = require('types');

var rT = {
    name: "transporter",
    type: t.transporter,
    target: 0,
    limit:1,

    /** @param {Creep} creep **/
    run: function(creep) {
      if (creep.carry.energy < creep.carryCapacity) {
          var targets = creep.room.find(FIND_STRUCTURES);
          var location = targets[1];
          actions.withdraw(creep, location);
      } else {
          locations = creep.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType == STRUCTURE_EXTENSION || structure.structureType == STRUCTURE_TOWER) &&
                            structure.energy < structure.energyCapacity;
                    }
            });
            if (locations.length > 0){
          actions.charge(creep, locations[0]);
            }
      }
    }
};
module.exports = rT;