var a = require('actions');
var t = require('types');
var u = require('utils');

var rH = {
    name: "harasser",
    type: "harasser",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.hits < creep.hitsMax){
            creep.heal(creep);
        }
    	var target = Game.getObjectById(creep.memory.target);
    	if (target){
    	    newTarget = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS, creep =>  RANGED_ATTACK in creep.body || ATTACK in creep.body);
    	    if (creep.pos.inRangeTo(newTarget, 3)){
    	        creep.memory.target = newTarget.id;
    	        return a.rangedAttack(creep, newTarget);
    	    } else {
    		    return a.rangedAttack(creep, target);
    	    }
    	}
    	var city = creep.memory.city;
    	var flagName = city + 'harass';
    	if(Game.flags[flagName]){
    		if(creep.pos.roomName === Game.flags[flagName].pos.roomName){
    			//harass
    			var enemies = creep.room.find(FIND_HOSTILE_CREEPS, creep =>  RANGED_ATTACK in creep.body || ATTACK in creep.body);
    			var harmless = creep.room.find(FIND_HOSTILE_CREEPS);
    			if (enemies.length) {
    				creep.memory.target = enemies[0].id
    				a.rangedAttack(creep, enemies[0]);
    			} else if (harmless.length){
    			    creep.memory.target = harmless[0].id
    				a.rangedAttack(creep, harmless[0]);
    			}
    		} else {
    			creep.moveTo(Game.flags[flagName].pos, {reusePath: 30});
    		}
    	} else {
    		//harass
    		var enemies = creep.room.find(FIND_HOSTILE_CREEPS);
    			if (enemies.length) {
    				creep.memory.target = enemies[0].id
    				a.rangedAttack(creep, enemies[0]);
				}
    	}
    }
   
};
module.exports = rH;