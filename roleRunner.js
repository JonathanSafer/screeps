var actions = require('actions');
var t = require('types');

var rR = {
    role: "runner",
    type: t.ferry,
    target: 0,
    limit: 2,

    /** @param {Creep} creep **/
    run: function(creep) {
      if (creep.carry.energy < creep.carryCapacity) {
          actions.pickup(creep);
      } else {
          // var rooms = Game.rooms;
          // var targets = _.flatten(_.map(rooms, room => room.find(FIND_STRUCTURES)));         
          var targets =  creep.room.find(FIND_STRUCTURES);
          var bucket = targets[creep.memory.target];
          actions.charge(creep, bucket);
          if (actions.charge(creep, bucket) == ERR_FULL) {
              console.log('Container Full');
          rR.flipTarget(creep);
        }
      }
      
      
    },
    flipTarget: function(creep) {
      creep.memory.target = creep.memory.target == 0 ? 1 : 0;
    }
    
};
module.exports = rR;