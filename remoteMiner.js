var a = require('actions');
var t = require('types');

var rM = {
    name: "remoteMiner",
    type: t.miner,
    target: Game.spawns["Home"].memory.nextSource,
    limit: Game.spawns["Home"].memory["miner"],

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.source == null) {
            creep.memory.source = rM.nextSource(creep);
        }
        rM.harvestTarget(creep);
    },

    needEnergy: function(creep) {
      return (creep.carry.energy < creep.carryCapacity) || (creep.carry.energy == 0);
    },

    harvestTarget: function(creep) {
      var source = Game.getObjectById(creep.memory.source);
      if (a.harvest(creep, source) == ERR_NO_PATH) {
          console.log("no path for mining :/");
        //rM.flipTarget(creep);
      }
    },

    /** pick a target id for creep **/
    nextSource: function(creep) {
        var myRooms = _.filter(Game.rooms, room =>  (room.controller && room.controller.reservation && room.controller.reservation.username == "Yoner")
                                                            || (room.controller && room.controller.my));
        var sources = _.flatten(_.map(myRooms, room => room.find(FIND_SOURCES)));
      
        Game.spawns["Home"].memory.nextSource = (Game.spawns["Home"].memory.nextSource + 1) % sources.length;
      
        console.log(sources);
        if (sources[creep.memory.target] == undefined){
            sources[creep.memory.target] = 0;
        }
        return sources[creep.memory.target].id;
    }
};
module.exports = rM;