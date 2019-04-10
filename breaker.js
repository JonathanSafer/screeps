var a = require('actions');
var t = require('types');
var u = require('utils');

var rBr = {
    name: "breaker",
    type: "breaker",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        var breakerTarget = Game.getObjectById(creep.memory.target)
		if (breakerTarget && creep.pos.isNearTo(breakerTarget.pos)){
		    return a.dismantle(creep, breakerTarget);
		} 
    	if (!creep.memory.medic){
    		creep.memory.medic = null;
    	}
    	var medic = Game.getObjectById(creep.memory.medic);
    	if (medic){
    	    //console.log(!creep.pos.isNearTo(medic.pos) && !creep.memory.attack)
    		if ((!creep.pos.isNearTo(medic.pos) && !(creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49)) || (medic.fatigue > 0)){
    			return;
    		}
    	} else {
    		//look for medics
    		var allCreeps = u.splitCreepsByCity();
    		var medicSearch = _.find(allCreeps[creep.memory.city], localCreep => localCreep.memory.role === 'medic' && localCreep.pos.isNearTo(creep.pos) 
    		                                                                        && localCreep.memory.breaker == creep.id);
    		if (medicSearch){
    			creep.memory.medic = medicSearch.id;
    		}
    		return;
    	}
    	var rallyFlag = creep.memory.city + 'breakerRally'
        if (Game.flags[rallyFlag] && !creep.memory.rally){
            creep.moveTo(Game.flags[rallyFlag], {reusePath: 50})
            if (Game.flags[rallyFlag].pos.x == creep.pos.x && Game.flags[rallyFlag].pos.y == creep.pos.y && Game.flags[rallyFlag].pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return;
        }
        var targetFlag = creep.memory.city + 'breakTarget';
        if(Game.flags[targetFlag] && creep.pos.roomName === Game.flags[targetFlag].pos.roomName){
            var found = Game.flags[targetFlag].pos.lookFor(LOOK_STRUCTURES)
            if(found.length){
                a.dismantle(creep, found[0])
                return;
            }
        } else if(Game.flags[targetFlag]){
            creep.moveTo(Game.flags[targetFlag], {reusePath: 50})
            return;
        }
    	var target = Game.getObjectById(creep.memory.target);
    	//console.log(target)
    	if (target){
    	    if (a.dismantle(creep, target) == ERR_NO_PATH){
    	        var structures = creep.room.find(FIND_HOSTILE_STRUCTURES);
    			var ramparts = _.filter(structures, structure => structure.structureType == STRUCTURE_RAMPART);
    			if (ramparts.length) {
    			    let num = Math.floor(Math.random() * ramparts.length);
    			    if(ramparts[num]){
        				creep.memory.target = ramparts[num].id
        				a.dismantle(creep, ramparts[num]);
    			    }
				}
    	    }
    	    //console.log(a.dismantle(creep, target))
    		return;
    	}
    	var city = creep.memory.city;
    	var flagName = city + 'break';
    	if(Game.flags[flagName]){
    		if(creep.pos.roomName === Game.flags[flagName].pos.roomName){
    			a.breakStuff(creep);
    		} else {
    			creep.moveTo(Game.flags[flagName].pos, {reusePath: 50});
    		}
    	} else {
    		a.breakStuff(creep);
    	}
    }
   
};
module.exports = rBr;