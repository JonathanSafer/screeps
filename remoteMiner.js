var a = require('actions');
var t = require('types');
var u = require('utils');

var rM = {
    name: "remoteMiner",
    type: "miner",
    target: () => Game.spawns["Home"].memory.nextSource,

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.source == null) {
            creep.memory.source = rM.nextSource(creep);
        }
        //if(creep.memory.source.pos == null) {
         //   console.log(creep.memory.source);
        //    creep.memory.source = rM.nextSource(creep);
       // }
        if (creep.memory.source == undefined){
            creep.memory.source = rM.nextSource(creep);
            
        }
        rM.harvestTarget(creep);
    //    if ((creep.ticksToLive < 5) || (creep.hits/creep.hitsMax < 0.5)){
     //   var num = creep.memory.target
    //    n = num.toString();
    //    Game.spawns['Home'].memory.sources.n = false;    
   //     }
    },

    needEnergy: function(creep) {
      return (creep.carry.energy < creep.carryCapacity) || (creep.carry.energy == 0);
    },

    harvestTarget: function(creep) {
      var source = Game.getObjectById(creep.memory.source);
      var city = creep.memory.city;
      if (a.harvest(creep, source) == ERR_NO_PATH) {
        	console.log("no path for mining :/");
        //rM.flipTarget(creep);
      } else if ((Game.time % 2 == 0) && (Game.spawns[city].room.controller.level > 6)){
      		creep.cancelOrder('harvest');
      }
    },

    /** pick a target id for creep **/
    nextSource: function(creep) {
        var city = creep.memory.city;
        var allRooms = u.splitRoomsByCity();
        var myRooms = allRooms[city];
        var sources = _.flatten(_.map(myRooms, room => room.find(FIND_SOURCES)));
        currentSource = Game.spawns[city].memory.nextSource;
        tempSource = currentSource + 1;
        length = sources.length;
        //console.log(currentSource);
        Game.spawns[city].memory.nextSource = (currentSource + 1) % length;
        //console.log(Game.spawns[city].memory.nextSource)
        console.log(city + ': # of sources: ' + sources.length);
        var target = sources[currentSource];
        if (target == undefined){
            target = sources[0];
        }
        return target.id;
    }
};
module.exports = rM;