var a = require('actions');
var t = require('types');
var u = require('utils');

var rBr = {
    name: "breaker",
    type: "breaker",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
    	if (!creep.memory.medic){
    		creep.memory.medic = 'empty'
    	}
    	var medic = Game.getObjectById(creep.memory.medic);
    	if (medic){
    	    //console.log(!creep.pos.isNearTo(medic.pos) && !creep.memory.attack)
    		if (!creep.pos.isNearTo(medic.pos) && !(creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49) && !(medic.fatigue > 0)){
    			return;
    		}
    	} else {
    		//look for medics
    		var allCreeps = u.splitCreepsByCity();
    		var medicSearch = _.find(allCreeps[creep.memory.city], creep => creep.memory.role === 'medic');
    		if (medicSearch){
    			creep.memory.medic = medicSearch.id;
    		}
    		return;
    	}
    	var target = Game.getObjectById(creep.memory.target);
    	if (target){
    		return a.dismantle(creep, target);
    	}
    	var city = creep.memory.city;
    	var flagName = city + 'break';
    	if(Game.flags[flagName]){
    		if(creep.pos.roomName === Game.flags[flagName].pos.roomName){
    			//break stuff
    			var structures = creep.room.find(FIND_HOSTILE_STRUCTURES);
    			var notController = _.reject(structures, structure => structure.structureType == STRUCTURE_CONTROLLER);
    			if (notController.length) {
    				creep.memory.target = notController[0].id
    				a.dismantle(creep, notController[0]);
				}
    		} else {
    			creep.moveTo(Game.flags[flagName].pos, {reusePath: 30});
    		}
    	} else {
    		//harass
    		var structures = creep.room.find(FIND_HOSTILE_STRUCTURES);
    			var notController = _.reject(structures, structure => structure.structureType == STRUCTURE_CONTROLLER);
			if (notController.length) {
				creep.memory.target = notController[0].id
				a.dismantle(creep, notController[0]);
			}
    	}
    }
   
};
module.exports = rBr;