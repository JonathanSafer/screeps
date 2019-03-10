var a = require('actions');
var t = require('types');
var u = require('utils');

var rD = {
    name: "defender",
    type: "defender",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        var breakerTarget = Game.getObjectById(creep.memory.target)
		if (breakerTarget && creep.pos.inRangeTo(breakerTarget.pos, 3)){
		    return a.attack(creep, breakerTarget);
		} 
    	if (!creep.memory.medic){
    		creep.memory.medic = null
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
    		var medicSearch = _.filter(allCreeps[creep.memory.city], localCreep => localCreep.memory.role === 'medic' && localCreep.pos.isNearTo(creep.pos));
    		if (medicSearch.length){
    			creep.memory.medic = medicSearch[0].id;
    		}
    		return;
    	}
    	var rallyFlag = creep.memory.city + 'defenderRally'
        if (Game.flags[rallyFlag] && !creep.memory.rally){
            creep.moveTo(Game.flags[rallyFlag], {reusePath: 50})
            if (Game.flags[rallyFlag].pos.x == creep.pos.x && Game.flags[rallyFlag].pos.y == creep.pos.y && Game.flags[rallyFlag].pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return;
        }
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
    	var city = creep.memory.city;
    	var flagName = city + 'defend';
    	if(Game.flags[flagName]){
    		if(creep.pos.roomName === Game.flags[flagName].pos.roomName){
    			//find hostile creeps
    			var enemies = creep.room.find(FIND_HOSTILE_CREEPS, creep =>  RANGED_ATTACK in creep.body || ATTACK in creep.body);
    			var harmless = creep.room.find(FIND_HOSTILE_CREEPS);
    			if (enemies.length) {
    				creep.memory.target = enemies[0].id
    				a.attack(creep, enemies[0]);
    			} else if (harmless.length){
    			    creep.memory.target = harmless[0].id
    				a.attack(creep, harmless[0]);
    			}    			
    		} else {
    			creep.moveTo(Game.flags[flagName].pos, {reusePath: 50});
    		}
    	} else {
    		//find hostile creeps
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
    }
   
};
module.exports = rD;