var actions = require('actions');

var rR = {
    role: "runner",
    type: t.miner,
    target: 0,
    limit: 5,

    /** @param {Creep} creep **/
    run: function(creep) {
      if (creep.carry.energy < creep.carryCapacity) {
          actions.pickup(creep);
      } else {
          var rooms = Game.rooms;
          var targets = _flatten(_.map(rooms, room => room.find(FIND_STRUCTURES)));
          var bucket = targets[creep.memory.target];
          actions.charge(creep, bucket);
          if (actions.charge(creep, bucket) == ERR_FULL) {
              console.log('Container Full')
          rR.flipTarget(creep);
        }
      }
      
      
    },
    flipTarget: function(creep) {
      creep.memory.target = creep.memory.target == 0 ? 1 : 0;
    }
    
};
module.exports = rR;