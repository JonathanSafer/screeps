var a = require('actions');
var rM = {

    /** @param {Creep} creep **/
    run: function(creep) {
      if(creep.memory.source = null) {
        creep.memory.source = rM.nextSource(creep);
        creep.memory.base = creep.memory.room.id;
      }

      if(rM.needEnergy(creep)) {
        rM.harvestTarget(creep);
      } else {
        location = Game.spawns['Home'];
        a.charge(creep, location);
      }
    },

    needEnergy: function(creep) {
      return (creep.carry.energy < creep.carryCapacity) || (creep.carry.energy == 0);
    },

    harvestTarget: function(creep) {
      var source = Game.getObjectById(creep.memory.source);
      rM.nextSource(creep);
console.log(source);
      if (a.harvest(creep, source) == ERR_NO_PATH) {
        rM.flipTarget(creep);
      }
    },

    /** pick a target id for creep **/
    nextSource: function(creep) {
      var neighbors = Object.values(Game.map.describeExits(creep.room.name));
      console.log(neighbors);
      var options = _.filter(neighbors, Game.map.isRoomAvailable);
      console.log(options[0]);
      console.log(Game.rooms);
      var room = options.length ? Game.rooms[options[0]] : creep.room;
      console.log(room);
      var sources = room.find(FIND_SOURCES);
      console.log(sources);
      var source = sources[creep.memory.target]; 
      console.log(source);
      return source.id;
    },

    flipTarget: function(creep) {
      creep.memory.target = creep.memory.target == 0 ? 1 : 0;
    }
};
module.exports = rM;