var u = require("utils");

var actions = {
    interact: function(creep, location, fnToTry, logSuccess) {
        var result = fnToTry();
        switch (result) {
            case ERR_NOT_IN_RANGE:
                if(false) {//creep.memory.test) {
                    actions.move(creep, location);
                } else {
                    if(creep.memory.role === 'Upgrader' && location.structureType && location.structureType === STRUCTURE_CONTROLLER){
                        return creep.moveTo(location, {reusePath: 15, range: 3, swampCost: 2, plainCost: 2});
                    } else {
                        return creep.moveTo(location, {reusePath: 15, maxOps: 10000, maxRooms: 32});
                    }
                }
            case OK:
                if (logSuccess) {
                    console.log(creep.name+ " at " + creep.pos + ": " + fnToTry.toString())
                }
                return 1;
            case ERR_BUSY:
            case ERR_FULL:
            case ERR_TIRED:
                return result;
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
        console.log(creep.name);
        console.log("need new path");
        //console.log(plannedPath);
        // Get here if there's no planned path or plan failed
        var newPath = creep.pos.findPathTo(location);
        //console.log(newPath);
        creep.memory.path = newPath;
        return actions.move(creep);
    },
    
    reserve: function(creep, target){
        var city = creep.memory.city;
        if (Game.time % 2000 == 0){
            return actions.interact(creep, target, () => creep.signController(target, city));
        }
        if(target.room.memory.city != city){
            creep.room.memory.city = city;
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

    enablePower: function(creep) {
        return actions.interact(creep, 
            creep.room.controller, 
            () => creep.enableRoom(creep.room.controller), 
            true)
    },

    powerSource: function(creep, target) {
        return actions.interact(creep, 
            target, 
            () => creep.usePower(PWR_REGEN_SOURCE, target), 
            true)
    },

    renewPowerCreep: function(creep, target) {
        return actions.interact(creep, target, () => creep.renew(target), true)
    },
    
    rangedAttack: function(creep, target){
        var result = creep.rangedAttack(target);
        switch(result){
            case ERR_NOT_IN_RANGE:
                if (creep.pos.roomName == target.pos.roomName){
                    creep.moveTo(target, {reusePath: 5});
                }
                break;
            case OK:
                if(creep.memory.noFear){
                    creep.moveTo(target, {reusePath: 5});
                    break;
                }
                creep.moveTo(Game.spawns[creep.memory.city], {reusePath: 5});
                break;
            case ERR_NO_BODYPART:
                creep.moveTo(Game.spawns[creep.memory.city], {reusePath: 5});
        }
        return;
    },
    
    withdraw: function(creep, location, mineral, amount) {
        if (mineral == undefined){
            return actions.interact(creep, location, () => creep.withdraw(location, RESOURCE_ENERGY));
        } else if (amount == undefined){
            return actions.interact(creep, location, () => creep.withdraw(location, mineral));
        } else {
            return actions.interact(creep, location, () => creep.withdraw(location, mineral, amount));
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
                      break;
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
        //console.log(newTargets)
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
        if (Object.keys(carry).length > 1){
            let mineral = _.keys(carry)[1];
            return actions.interact(creep, location, () => creep.transfer(location, mineral));
        } else{
            return actions.interact(creep, location, () => creep.transfer(location, Object.keys(carry)[0]));
        }
    },

    // priorities: very damaged structures > construction > mildly damaged structures
    // stores repair id in memory so it will continue repairing till the structure is at max hp
	build: function(creep) {
	    if(Game.time % 200 === 0){
	        creep.memory.repair = null;
	        creep.memory.build = null;
	    }
		if (creep.memory.repair){
			var target = Game.getObjectById(creep.memory.repair);
			if(target){
    			if (target.hits < target.hitsMax){
    				return actions.repair(creep, target);
    			}
			}
		}
        let city = creep.memory.city;
        let myRooms = u.splitRoomsByCity();
        let buildings = _.flatten(_.map(myRooms[city], room => room.find(FIND_STRUCTURES)));
        let needRepair = _.filter(buildings, structure => (structure.hits < (0.2*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL) && (structure.structureType != STRUCTURE_RAMPART));
        let walls = _.filter(buildings, structure => (structure.hits < 1000000) && (structure.hits < structure.hitsMax) && (structure.structureType != STRUCTURE_ROAD));
        //console.log(buildings);
    	if(needRepair.length){
    		creep.memory.repair = needRepair[0].id;
    		return actions.repair(creep, needRepair[0]);
    		//actions.interact(creep, needRepair[0], () => creep.repair(needRepair[0]));
    	} else {
        	var targets = _.flatten(_.map(myRooms[city], room => room.find(FIND_MY_CONSTRUCTION_SITES)));
     		//var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
      		if(targets.length) {
        	    return actions.interact(creep, targets[0], () => creep.build(targets[0]));
      		} else {
      			var damagedStructures = _.filter(buildings, structure => (structure.hits < (0.4*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL) && (structure.structureType != STRUCTURE_RAMPART));
  				if (damagedStructures.length) {
  					creep.memory.repair = damagedStructures[0].id;
  					return actions.repair(creep, damagedStructures[0]);
  				}
  				if (walls.length) {
  					let sortedWalls = _.sortBy(walls, structure => structure.hits)
  				    creep.memory.repair = sortedWalls[0].id;
  					return actions.repair(creep, sortedWalls[0]);
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
            result = creep.withdraw(closeStones[0], _.keys(closeStones[0])[0]);
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
    },
    
    getBoosted: function(creep){
        let boosts = {'move': 'XZHO2', 'tough': 'XGHO2', 'work': 'XZH2O', 'heal': 'XLHO2', 'ranged_attack': 'XKHO2'}
        for(let i = creep.body.length - 1; i >= 0; i--){
            if(!creep.body[i].boost){
                let type = creep.body[i].type;
                let boost = boosts[type];
                for(let j = 0; j < 4; j++){
                    if(Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[j][2] == boost){
                        let lab = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[j][0]);
                        //boost self
                        if (lab.boostCreep(creep) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(lab);
                        }
                        return;
                    }
                }
            }
        }
        creep.memory.boosted = true;
        return;
    },

    breakStuff: function(creep) {
        var structures = creep.room.find(FIND_HOSTILE_STRUCTURES);
        var structGroups = _.groupBy(structures, structure => structure.structureType);
        var targetOrder = [STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_POWER_SPAWN,
            STRUCTURE_EXTRACTOR, STRUCTURE_LAB, STRUCTURE_TERMINAL, STRUCTURE_OBSERVER, STRUCTURE_NUKER, STRUCTURE_STORAGE, 
            STRUCTURE_RAMPART];
 
        for (var i = 0; i < targetOrder.length; i++) {
            var type = targetOrder[i];
            var breakThese = structGroups[type];
            if (breakThese) {
                creep.memory.target = breakThese[0].id;
                return actions.dismantle(creep, breakThese[0]);
            }
        }     
    },
    
    retreat: function(creep) {
        if(Game.time % 20 === 0){
            creep.memory.retreat = false;
        }
        let checkpoints = creep.memory.checkpoints;
        if (checkpoints) {
            let oldCheckpoint = checkpoints[0];
            let o = oldCheckpoint;
            return creep.moveTo(new RoomPosition(o.x, o.y, o.roomName), {reusePath: 0});
        }
    }
};

module.exports = actions;
