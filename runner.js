var actions = require('actions');
var t = require('types');
var u = require('utils');

var rR = {
    name: "runner",
    type: t.runner,
    target: () => 0,
    limit: () => Game.spawns['Home'].memory['runner'],

    /** @param {Creep} creep **/
    run: function(creep) {
       // notice if there's stuff next to you before wandering off!  
      actions.notice(creep);
      if (creep.carry.energy < 0.5 * creep.carryCapacity) {
          actions.pickup(creep);
      } else {
          var targets =  u.getTransferLocations(creep);
          var bucket = targets[creep.memory.target];
          if (bucket == undefined) {
              bucket = Game.spawns['Home'];
          }
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