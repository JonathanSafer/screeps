var a = require('actions');
var t = require('types');

var rM = {
    name: "remoteMiner",
    type: t.miner,
    target: () => Game.spawns["Home"].memory.nextSource,
    limit: () => Game.spawns["Home"].memory.miner,

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
            creep.memory.source = rM.nexSource(creep);
            
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
        currentSource = Game.spawns["Home"].memory.nextSource;
        tempSource = currentSource + 1;
        length = sources.length;
        console.log(currentSource);
        Game.spawns["Home"].memory.nextSource = (currentSource + 1) % length;
        console.log(Game.spawns["Home"].memory.nextSource)
        console.log(sources);
        var num = currentSource
        n = num.toString();
        Game.spawns['Home'].memory.sources.n = true;
       //Game.spawns['Home'].memory.sources = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
        var target = sources[currentSource];
        if (target == undefined){
            target = sources[0];
        }
        return target.id;
    }
};
module.exports = rM;