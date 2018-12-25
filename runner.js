var actions = require('actions');
var t = require('types');
var u = require('utils');

var rR = {
    name: "runner",
    type: t.runner,
    target: 0,
    limit: 3,

    /** @param {Creep} creep **/
    run: function(creep) {
      if (creep.carry.energy < creep.carryCapacity) {
          actions.pickup(creep);
      } else {
          var targets =  u.getTransferLocations(creep);
          var bucket = targets[creep.memory.target];
          actions.charge(creep, bucket);
          if (actions.charge(creep, bucket) == ERR_FULL) {
                console.log('Container Full');
                rR.flipTarget(creep);
        }
      }
      
      
    },
    flipTarget: function(creep) {
        creep.memory.target = u.getNextLocation(creep.memory.target, u.getTransferLocations(creep));
    }
    
};
module.exports = rR;