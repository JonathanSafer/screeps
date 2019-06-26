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
            if (creep.saying != '*'){
                rM.harvestTarget(creep);
            }
            if (Game.time % 50 === 0){
            	if (Game.spawns[creep.memory.city].room.controller.level > 7){
            		if (!creep.memory.link){
            			//find link
            			var source = Game.getObjectById(creep.memory.source);
            			var structures = creep.room.find(FIND_MY_STRUCTURES)
            			link = _.find(structures, structure => structure.structureType === STRUCTURE_LINK && structure.pos.inRangeTo(source.pos, 3))
            			//console.log(link)
            			if (link){
            			    creep.memory.link = link.id;
            			}
            		}
            	}
            }
            if (creep.memory.link){
                if (creep.carry.energy == creep.carryCapacity){
                    let link = Game.getObjectById(creep.memory.link);
            	    a.charge(creep, link);
            	    if (link.energy >= link.energyCapacity * .5){
            	        creep.say('*', true);
            	    }
                }
            	if (creep.saying === '*'){
            	    let link = Game.getObjectById(creep.memory.link);
            		let storageLink = Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink);
            		if (storageLink.energy === 0 && !link.cooldown){
            		    link.transferEnergy(storageLink)
            		    creep.say('**', true);
            		} else {
            		    creep.say('*', true);
            		}
            	}
            }
        }
    },


    harvestTarget: function(creep) {
        var source = Game.getObjectById(creep.memory.source);
        var city = creep.memory.city;
        if (!((Game.time % 2 == 0) && (creep.body.length == 15) && (creep.pos.isNearTo(source.pos)))){
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