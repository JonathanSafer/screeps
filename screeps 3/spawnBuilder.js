var a = require('actions');
var t = require('types');
var u = require('utils');

var rSB = {
    name: "spawnBuilder",
    type: "spawnBuilder",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
      var city = creep.memory.city;
      if (creep.hits < creep.hitsMax){
          creep.moveTo(Game.spawns[city])
      } else{
          if(creep.carry.energy == 0 && creep.memory.building) {
                creep.memory.building = false;
          }
          if(creep.carry.energy == creep.carryCapacity && !creep.memory.building) {
              creep.memory.building = true;
          }
          var targets = u.getWithdrawLocations(creep);
          var location = targets[creep.memory.target];
          if (location == undefined) {
              location = Game.spawns[city];
          }
          if (creep.memory.building ? rSB.build(creep) : a.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES){
              creep.memory.target = u.getNextLocation(creep.memory.target, targets);
          };
      }
    },
    
    build: function(creep) {
        var target = Game.getObjectById('5c51ffc3f1371e2b122aec54');
      if(target) {
          //console.log(JSON.stringify(target));
        if(creep.build(target) == ERR_NOT_IN_RANGE) {
            creep.moveTo(target, {reusePath: 50});
        }
      } else {
      		creep.moveTo(Game.flags.Flag2.pos, {reusePath: 50});
      }
    }
};
module.exports = rSB;
