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
      } else {
            if(creep.pos.roomName === Game.flags.claim.pos.roomName){
                if(creep.carry.energy == 0 && creep.memory.building){
                    creep.memory.building = false;
                }
                if(creep.carry.energy == creep.carryCapacity && !creep.memory.building) {
                    creep.memory.building = true;
                }
                if (creep.memory.building){
                    rSB.build(creep)
                } else {
                    rSB.harvest(creep)
                }
            } else {
                creep.moveTo(Game.flags.claim.pos, {reusePath: 50});
          }
      }
    },
    
    build: function(creep) {
        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      if(targets.length) {
        if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(targets[0], {reusePath: 15});
        }
      } else {
        if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
            creep.moveTo(creep.room.controller, {reusePath: 15});  
        }
      }
    },
    
    harvest: function(creep) {
        var sources =  creep.room.find(FIND_SOURCES);
        if(creep.harvest(sources[creep.memory.target]) == ERR_NOT_IN_RANGE) {
            creep.moveTo(sources[creep.memory.target], {reusePath: 15});
        } else if (creep.harvest(sources[creep.memory.target]) == ERR_NOT_ENOUGH_RESOURCES){
            creep.memory.target = (creep.memory.target + 1) % 2;
        }
    }
};
module.exports = rSB;
