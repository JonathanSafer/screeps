var a = require('actions');
var t = require('types');
var u = require('utils');

var rB = {
    name: "builder",
    type: t.normal,
    target: 0,
    limit: 0,

    /** @param {Creep} creep **/
    run: function(creep) {
      if(creep.carry.energy == 0 && creep.memory.building) {
            creep.memory.building = false;
      }
      if(creep.carry.energy == creep.carryCapacity && !creep.memory.building) {
          creep.memory.building = true;
      }
      var targets = u.getWithdrawLocations(creep);
      var location = targets[creep.memory.target];
      
      if (creep.memory.building ? a.build(creep) : a.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES){
          creep.memory.target = u.getNextLocation(creep.memory.target, targets);
      };
    }
};
module.exports = rB;