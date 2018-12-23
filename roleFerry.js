var actions = require('actions');
var t = require('types');

var rF = {
    role: "ferry",
    type: t.ferry,
    target: 0,
    limit: 2,

    /** @param {Creep} creep **/
    run: function(creep) {
      if (creep.carry.energy < creep.carryCapacity) {
          var targets = creep.room.find(FIND_STRUCTURES);
          var location = targets[0];
          actions.withdraw(creep, location);
      } else {
          location = Game.spawns['Home'];
          actions.charge(creep, location);
      }
    }
};
module.exports = rF;