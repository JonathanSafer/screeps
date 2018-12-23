var actions = require('actions');

var rmR = {

    /** @param {Creep} creep **/
    run: function(creep) {
      if(creep.memory.source = null) {
        creep.memory.source = rmR.nextSource(creep);
        creep.memory.base = creep.memory.room.id;
      }

      if (creep.carry.energy < creep.carryCapacity) {
          actions.pickup(creep);
      } else {
        var room = 
          var targets = creep.room.find(FIND_STRUCTURES);
          var bucket = targets[creep.memory.target];
          actions.charge(creep, bucket);
          if (actions.charge(creep, bucket) == ERR_FULL) {
              console.log('Container Full')
        rR.flipTarget(creep);
        }
      
          
     // Gets ERR_NO_BODYPART when trying to store in extractor. You need "WORK" I think
      }
      
      
    },
    flipTarget: function(creep) {
      creep.memory.target = creep.memory.target == 0 ? 1 : 0;
    }
    
};
module.exports = rmR;