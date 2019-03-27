var actions = require('actions');
var t = require('types');
var u = require('utils');

var rF = {
    name: "ferry",
    type: "ferry",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        switch(creep.memory.target){
            case 0:
                //no jobs available
                //console.log('hi')
                if (Game.time % 10 === 0){
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 1:
                //move energy from storage to terminal
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.terminal);
                } else if(creep.room.storage.store.energy > 150000 && creep.room.terminal.store.energy < 150000){
                	if (Game.time % 10 === 0){
                		creep.memory.target = rF.getJob(creep);
                		break;
                	}
                    actions.withdraw(creep, creep.room.storage, RESOURCE_ENERGY);
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 2:
                //move minerals from storage to terminal
                if (_.sum(creep.carry) > 0){
                    actions.charge(creep, creep.room.terminal);
                    break;
                }
                if(Object.keys(creep.room.storage.store).length > 1){
                	let mineral =_.keys(creep.room.storage.store)[1];
                    actions.withdraw(creep, creep.room.storage, mineral);
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 3:
                //move energy from terminal to storage
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.storage);
                } else if(creep.room.terminal.store.energy > 151000){
                    actions.withdraw(creep, creep.room.terminal, RESOURCE_ENERGY);
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 4:
                //move power from terminal to power spawn
                let powerSpawn = _.find(Game.structures, (structure) => structure.structureType == STRUCTURE_POWER_SPAWN && structure.room.memory.city == creep.memory.city)
                if ((creep.carry.power) > 0){
                    actions.charge(creep, powerSpawn)
                    //creep.transfer(powerSpawn, 'power')
                } else if(powerSpawn.power < 30 && creep.room.terminal.store.power){
                    actions.withdraw(creep, creep.room.terminal, RESOURCE_POWER, Math.min(70, creep.room.terminal.store[RESOURCE_POWER]));
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 5:
            	//move energy from storage link to storage
            	var link = Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink)
            	if (creep.carry.energy > 0){
            		actions.charge(creep, creep.room.storage);
            	} else if (link.energy > 0){
                    actions.withdraw(creep, link, RESOURCE_ENERGY);
                } else {
                	creep.memory.target = rF.getJob(creep);
                }
        }
     
    },
    
    getJob: function(creep){
    	if (Game.spawns[creep.memory.city].memory.storageLink && Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink).energy > 0){
    		return 5;
    	}
    	if (creep.room.storage.store.energy > 150000 && creep.room.terminal.store.energy < 150000){
    		return 1;
    	}
        if(Object.keys(creep.room.storage.store).length > 1){
    		return 2;
    	}
    	if (creep.room.terminal.store.energy > 151000){
    		return 3;
    	}
    	if (Game.spawns[creep.memory.city].memory.ferryInfo.needPower === true && Game.spawns[creep.memory.city].room.terminal.store[RESOURCE_POWER] > 0){
    		return 4;
    	}
    	//console.log(Game.spawns[creep.memory.city].memory.ferryInfo.needPower)
	    return 0;
    }
};
module.exports = rF;