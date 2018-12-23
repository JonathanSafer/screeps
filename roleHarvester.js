var a = require('actions');
var rH = {

    /** @param {Creep} creep **/
    run: function(creep) {
      if(rH.needEnergy(creep)) {
        rH.harvestTarget(creep);
      } else {
        rH.flipTarget(creep);
       location = Game.spawns['Home'];
        a.charge(creep, location);
      }
    },

    needEnergy: function(creep) {
      return (creep.carry.energy < creep.carryCapacity) || (creep.carry.energy == 0);
    },

    harvestTarget: function(creep) {
      var sources = creep.room.find(FIND_SOURCES);
      var target = sources[creep.memory.target];

      if (a.harvest(creep, target) == ERR_NO_PATH) {
        rH.flipTarget(creep);
      }
    },

    flipTarget: function(creep) {
      creep.memory.target = creep.memory.target == 0 ? 1 : 0;
    }
};
module.exports = rH;
