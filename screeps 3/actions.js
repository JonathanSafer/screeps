var u = require("utils");

var actions = {
    interact: function(creep, location, fnToTry) {
        var result = fnToTry();
        switch (result) {
            case ERR_NOT_IN_RANGE:
                if(false) {//creep.memory.test) {
                    actions.move(creep, location);
                } else {
                    creep.moveTo(location, {reusePath: 15});
                }
                return result;
            case OK:
            case ERR_BUSY:
            case ERR_FULL:
            case ERR_TIRED:
            case ERR_NOT_ENOUGH_RESOURCES:
                creep.memory.path = null;
                return result;
            default:
                console.log(creep.memory.role + " at " + creep.pos + ": " + result.toString());
                return result;
      }
    },

    move: function(creep, location) {
        // check if there's a path. try moving along it
        var plannedPath = creep.memory.path;
        if (plannedPath) {
            //console.log(plannedPath + " Hi");
            var result = creep.moveByPath(plannedPath);
            switch (result) {
                case OK:
                case ERR_TIRED: // tired is fine
                    return result;
                case ERR_NOT_FOUND:
                    //break; // let's get a new path
                default:
                    console.log(creep.memory.role + " at " + creep.pos + ": " + result.toString());
                    break;
            }
        }
        console.log(creep.name)
        console.log("need new path");
        //console.log(plannedPath);
        // Get here if there's no planned path or plan failed
        var newPath = creep.pos.findPathTo(location);
        //console.log(newPath);
        creep.memory.path = newPath;
        return actions.move(creep);
    },
    
    reserve: function(creep, target){
        var city = creep.memory.city
        if(!creep.room.controller.sign || (creep.room.controller.sign.text != city)){
            return actions.interact(creep, target, () => creep.signController(target, city));
        } else {
            return actions.interact(creep, target, () => creep.reserveController(target));
        }
    },

    dismantle: function(creep, target){
        return actions.interact(creep, target, () => creep.dismantle(target));
    },
    
    attack: function(creep, target){
        return actions.interact(creep, target, () => creep.attack(target));
    },
    
    withdraw: function(creep, location, mineral) {
        if (mineral == undefined){
            return actions.interact(creep, location, () => creep.withdraw(location, RESOURCE_ENERGY));
        } else {
            return actions.interact(creep, location, () => creep.withdraw(location, mineral));
        }
    },

    harvest: function(creep, target) {
      return actions.interact(creep, target, () => creep.harvest(target));
    },
    
    pickup: function(creep) {
        var goodLoads = u.getGoodPickups(creep);
        
        if(creep.memory.targetId) {
            var target = Game.getObjectById(creep.memory.targetId);
            if(_.contains(goodLoads, target)) {
                result = actions.interact(creep, target, () => creep.pickup(target));
                switch (result) {
                  case OK:
                  case ERR_INVALID_TARGET:
                      creep.memory.targetId = null;
                      break;
                  default:
                      break;
                }
                return result;
            }
        }
        //console.log("finding a target");
        
        var newTargets = _.sortBy(goodLoads, drop => -1*drop.amount + 28*PathFinder.search(creep.pos, drop.pos).cost);
        if (newTargets.length) {
            creep.memory.targetId = newTargets[0].id;

            return actions.pickup(creep);
        }
    },

    upgrade: function(creep) {
      location = creep.room.controller;
      return actions.interact(creep, location, () => creep.upgradeController(location));
    },
    
    charge: function(creep, location) {
        let carry = creep.carry;
        delete carry.energy;
        let mineral = _.keys(carry)[0];
        if (creep.carry[mineral] > 0){
            return actions.interact(creep, location, () => creep.transfer(location, /*creep.carry[0]*/mineral));
        } else{
            return actions.interact(creep, location, () => creep.transfer(location, /*creep.carry[0]*/RESOURCE_ENERGY));
        }
    },

    // priorities: very damaged structures > construction > mildly damaged structures
    // stores repair id in memory so it will continue repairing till the structure is at max hp
	build: function(creep) {
		if (creep.memory.repair){
			var target = Game.getObjectById(creep.memory.repair);
			if(target){
    			if (target.hits < target.hitsMax){
    				return actions.repair(creep, target)
    			}
			}
		}
        let city = creep.memory.city;
        let myRooms = u.splitRoomsByCity()
        let buildings = _.flatten(_.map(myRooms[city], room => room.find(FIND_STRUCTURES)));
        let needRepair = _.filter(buildings, structure => (structure.hits < (0.2*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL));
        //console.log(buildings);
    	if(needRepair.length){
    		creep.memory.repair = needRepair[0].id
    		return actions.repair(creep, needRepair[0])
    		//actions.interact(creep, needRepair[0], () => creep.repair(needRepair[0]));
    	} else {
        	var targets = _.flatten(_.map(myRooms[city], room => room.find(FIND_MY_CONSTRUCTION_SITES)));
     		//var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      		if(targets.length) {
        	return actions.interact(creep, targets[0], () => creep.build(targets[0]));
      		} else {
      			var damagedStructures = _.filter(buildings, structure => (structure.hits < (0.4*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL));
  				if (damagedStructures.length){
  					creep.memory.repair = damagedStructures[0].id
  					return actions.repair(creep, damagedStructures[0])
  				}
      		}
  		}
    },

    repair: function(creep, target){
    	return actions.interact(creep, target, () => creep.repair(target));


    },
    
    // Pick up stuff lying next to you as you pass by
    notice: function(creep) {
        var tombstones = creep.room.find(FIND_TOMBSTONES);
        var closeStones = _.filter(tombstones, stone => stone.pos.isNearTo(creep.pos));
        if (closeStones.length) {
            //console.log(closeStones);
            // we can only get one thing per turn, success is assumed since we're close
            result = creep.withdraw(closeStones[0], RESOURCE_ENERGY);
            switch (result) {
                case ERR_FULL:
                    return;
                case ERR_NOT_ENOUGH_RESOURCES:
                    break;
                default:
                    //console.log(result);
                    return result;
            }
        }
        var resources = creep.room.find(FIND_DROPPED_RESOURCES);
        var closeStuff = _.filter(resources, thing => thing.pos.isNearTo(creep.pos));
        if (closeStuff.length) {
            // we can only get one thing per turn, success is assumed since we're close
            return creep.pickup(closeStuff[0]);
        }
    }
};

module.exports = actions;