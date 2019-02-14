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
    		creep.memory.breaker = 'empty'
    	}
    	var breaker = Game.getObjectById(creep.memory.breaker);
    	if (!breaker){
	   		var allCreeps = u.splitCreepsByCity();
    		var breakerSearch = _.find(allCreeps[creep.memory.city], creep => creep.memory.role == 'breaker');
    		//console.log(breakerSearch)
    		if (breakerSearch){
    			creep.memory.breaker = breakerSearch.id;
    		}
    		return;
    	} else {
    		//moveTo and heal as needed
    		creep.moveTo(breaker, {reusePath: 5})
    		if (breaker.hits < (0.75 * breaker.hitMax)){
    			creep.heal(breaker);
    		} else {
    			creep.heal(creep);
    		}
		}
    }
   
};
module.exports = rMe;