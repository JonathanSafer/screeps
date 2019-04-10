var a = require('actions');
var t = require('types');
var u = require('utils');

var rMe = {
    name: "medic",
    type: "medic",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
    	if (!creep.memory.breaker){
    		creep.memory.breaker = null
    	}
    	var breaker = Game.getObjectById(creep.memory.breaker);
    	if (Game.time % 10 == 0 && breaker){
    	    if (breaker && breaker.memory.medic && breaker.memory.medic != creep.id){
    	        creep.memory.breaker = null
    	    }
    	}
    	if (!breaker){
	   		var allCreeps = u.splitCreepsByCity();
    		var breakerSearch = _.filter(allCreeps[creep.memory.city], targetCreep => (targetCreep.memory.role == 'breaker' 
    		                                        || targetCreep.memory.role == 'defender' 
    		                                        || targetCreep.memory.role == 'powerMiner')
    		    && (targetCreep.memory.medic == null || targetCreep.memory.medic == creep.id));
    		if (breakerSearch.length){
    			creep.memory.breaker = breakerSearch[0].id;
    		}
    		return;
    	} else {
    		//moveTo and heal as needed
    		var breakerTarget = Game.getObjectById(breaker.memory.target)
    		creep.moveTo(breaker, {reusePath: 5})
    		if (breaker.hits < (0.75 * breaker.hitsMax)){
    			creep.heal(breaker);
    			return;
    		} else if (creep.hits < creep.hitsMax){
		        creep.heal(creep);
		        return;
		    } else if (breaker.hits <= breaker.hitsMax){
		       creep.heal(breaker);
		       return;
    		}
		}
    }
   
};
module.exports = rMe;