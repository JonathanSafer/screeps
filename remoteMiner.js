var a = require('actions');
var t = require('types');

var rM = {
    name: "remoteMiner",
    type: t.miner,
    target: 0,
    limit: 1,

    /** @param {Creep} creep **/
    run: function(creep) {
      if(creep.memory.source == null) {
        creep.memory.source = rM.nextSource(creep);
        creep.memory.base = creep.room.id;
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
      if (a.harvest(creep, source) == ERR_NO_PATH) {
        rM.flipTarget(creep);
      }
    },

    /** pick a target id for creep **/
    nextSource: function(creep) {
      var rooms = Object.values(Game.rooms);
      
      var unownedRooms = _.filter(rooms, room => room.controller && room.controller.reservation && (room.controller.reservation.username == 'Yoner') && (!room.controller.my));
      console.log(unownedRooms);
      var targetRoom;
      if (unownedRooms.length > 0) {
        targetRoom = unownedRooms[0];
        console.log(targetRoom);
      } else {
          targetRoom = creep.room;
      }
      var sources = targetRoom.find(FIND_SOURCES);
      console.log(sources);
      return sources[creep.memory.target].id;
    },

    flipTarget: function(creep) {
      creep.memory.target = creep.memory.target == 0 ? 1 : 0;
    }
};
module.exports = rM;