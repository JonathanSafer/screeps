var actions = require('actions');
var t = require('types');
var u = require('utils');

var rRo = {
    name: "robber",
    type: "robber",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
      if (_.sum(creep.carry) < 0.1 * creep.carryCapacity) {
          if(creep.ticksToLive < 270){
              creep.suicide();
          }
          var target = Game.getObjectById('5cad9508f10dfb205d9c38db');
          if (target){
              return actions.interact(creep, target, () => creep.withdraw(target, RESOURCE_ENERGY));
          } else {
              return creep.moveTo(new RoomPosition(25, 25, 'W41N37'), {reusePath: 50})
          }

      } else {
          //console.log(creep.moveTo(Game.spawns[creep.memory.city].room.storage, {maxRooms: 32} ))
          actions.charge(creep, Game.spawns[creep.memory.city].room.storage)
      }
      
      
    },
    flipTarget: function(creep) {
        creep.memory.target = u.getNextLocation(creep.memory.target, u.getTransferLocations(creep));
    }
    
};
module.exports = rRo;