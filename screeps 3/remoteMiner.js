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
  			rM.nextSource(creep);
        } else if (Game.getObjectById(creep.memory.source) == null){
            creep.moveTo(new RoomPosition(25, 25, creep.memory.sourceRoom), {reusePath: 50}); 
        } else {
            rM.harvestTarget(creep);
        }
    },

    needEnergy: function(creep) {
      return (creep.carry.energy < creep.carryCapacity) || (creep.carry.energy == 0);
    },

    harvestTarget: function(creep) {
        var source = Game.getObjectById(creep.memory.source);
        var city = creep.memory.city;
        if (!((Game.time % 2 == 0) && (Game.spawns[city].room.controller.level > 6) && (creep.pos.isNearTo(source.pos)))){
            a.harvest(creep, source)
        }
    },

    /** pick a target id for creep **/
    nextSource: function(creep) {
        var city = creep.memory.city;
        var miners = _.filter(Game.creeps, creep => creep.memory.role === 'remoteMiner')
        var occupied = []
    	_.each(miners, function(minerInfo){
        		occupied.push(minerInfo.memory.source)
    	})
        var sources = Object.keys(Game.spawns[city].memory.sources)
        var openSources = _.filter(sources, Id => !occupied.includes(Id));
        //console.log(sources)
        if (openSources.length){
        	creep.memory.source = openSources[0]
        	creep.memory.sourceRoom = Game.spawns[city].memory.sources[openSources[0]].roomName;
        } else {
        	console.log(city + ': No sources available')
        }
    }
};
module.exports = rM;