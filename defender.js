var a = require('actions');
var t = require('types');
var u = require('utils');

var rD = {
    name: "defender",
    type: "defender",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        // attack targets within 3, otherwise recalculate
        var breakerTarget = Game.getObjectById(creep.memory.target)
		if (breakerTarget && creep.pos.inRangeTo(breakerTarget.pos, 3)){
		    return a.attack(creep, breakerTarget);
		} 
    	if (!creep.memory.medic){
            // undefined causes error, so using null
    		creep.memory.medic = null
    	}
    	var medic = Game.getObjectById(creep.memory.medic);
    	if (medic){
            // Wait for medic to get closer unless on the border
    	    //console.log(!creep.pos.isNearTo(medic.pos) && !creep.memory.attack)
    		if ((!creep.pos.isNearTo(medic.pos) && !(creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49)) || (medic.fatigue > 0)){
    			return;
    		}
    	} else {
    		//look for medics
    		var allCreeps = u.splitCreepsByCity();
    		var medicSearch = _.filter(allCreeps[creep.memory.city], localCreep => localCreep.memory.role === 'medic' && localCreep.pos.isNearTo(creep.pos));
    		if (medicSearch.length){
    			creep.memory.medic = medicSearch[0].id;
    		}
    		return;
    	}
        // Go to rally en route to target
    	var rallyFlag = creep.memory.city + 'defenderRally'
        if (Game.flags[rallyFlag] && !creep.memory.rally){
            creep.moveTo(Game.flags[rallyFlag], {reusePath: 50})
            if (Game.flags[rallyFlag].pos.x == creep.pos.x && Game.flags[rallyFlag].pos.y == creep.pos.y && Game.flags[rallyFlag].pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return;
        }
        // attack hostile creeps if within 3, otherwise focus on previous target
    	var target = Game.getObjectById(creep.memory.target);
    	if (target){
	    	    newTarget = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, creep =>  RANGED_ATTACK in creep.body || ATTACK in creep.body);
	    	    if (newTarget && creep.pos.inRangeTo(newTarget, 3)){
	    	        creep.memory.target = newTarget.id;
	    	        return a.attack(creep, newTarget);
	    	    } else {
	    		    return a.attack(creep, target);
	    	    }	    
    		return;
    	}
        // If there is a 'defend' flag, move to the flag before attacking. 
    	var city = creep.memory.city;
    	var flagName = city + 'defend';
    	if(Game.flags[flagName]){
    		if(creep.pos.roomName === Game.flags[flagName].pos.roomName){
    			rD.attackNewTarget(creep); 			
    		} else {
    			creep.moveTo(Game.flags[flagName].pos, {reusePath: 50});
    		}
    	} else {
    	   rD.attackNewTarget(creep);
        }
    },

    attackNewTarget: function(creep) {
        // Attack hostiles before harmless creeps
        var enemies = creep.room.find(FIND_HOSTILE_CREEPS, creep =>  RANGED_ATTACK in creep.body || ATTACK in creep.body);
        var harmless = creep.room.find(FIND_HOSTILE_CREEPS);
        if (enemies.length) {
            creep.memory.target = enemies[0].id
            a.attack(creep, enemies[0]);
        } else if (harmless.length){
            creep.memory.target = harmless[0].id
            a.attack(creep, harmless[0]);
        }
    }
};
module.exports = rD;