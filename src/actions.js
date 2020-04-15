const u = require("./utils")
const motion = require("./motion")


var actions = {
    interact: function(creep, location, fnToTry, range, logSuccess) {
        var result = fnToTry()
        switch (result) {
        case ERR_NOT_IN_RANGE:
            return motion.newMove(creep, location.pos, range)
        case OK:
            if (logSuccess) {
                Log.info(creep.name+ " at " + creep.pos + ": " + fnToTry.toString())
            }
            return 1
        case ERR_BUSY:
        case ERR_FULL:
        case ERR_TIRED:
            return result
        case ERR_NOT_ENOUGH_RESOURCES:
            creep.memory.path = null
            return result
        default:
            Log.info(creep.memory.role + " at " + creep.pos + ": " + result.toString())
            return result
        }
    },
    
    reserve: function(creep, target){
        var city = creep.memory.city
        if (Game.time % 2000 == 0){
            return actions.interact(creep, target, () => creep.signController(target, city))
        }
        if(target.room.memory.city != city){
            creep.room.memory.city = city
        } else {
            return actions.interact(creep, target, () => creep.reserveController(target), 1)
        }
    },

    dismantle: function(creep, target){
        return actions.interact(creep, target, () => creep.dismantle(target), 1)
    },
    
    attack: function(creep, target){
        return actions.interact(creep, target, () => creep.attack(target), 1)
    },

    enablePower: function(creep) {
        return actions.interact(creep, 
            creep.room.controller, 
            () => creep.enableRoom(creep.room.controller), 1)
    },

    usePower: function(creep, target, power) {
        return actions.interact(creep, target, () => creep.usePower(power, target), POWER_INFO[power].range)
    },

    renewPowerCreep: function(creep, target) {
        return actions.interact(creep, target, () => creep.renew(target), 1)
    },
     
    withdraw: function(creep, location, mineral, amount) {
        if (mineral == undefined){
            if (!location || !location.store.getUsedCapacity(RESOURCE_ENERGY)) return ERR_NOT_ENOUGH_RESOURCES
            return actions.interact(creep, location, () => creep.withdraw(location, RESOURCE_ENERGY), 1)
        } else if (amount == undefined){
            return actions.interact(creep, location, () => creep.withdraw(location, mineral), 1)
        } else {
            return actions.interact(creep, location, () => creep.withdraw(location, mineral, amount), 1)
        }
    },

    harvest: function(creep, target) {
        return actions.interact(creep, target, () => creep.harvest(target), 1)
    },
    
    pickup: function(creep) {
        var goodLoads = u.getGoodPickups(creep)
        
        if(creep.memory.targetId) {
            var target = Game.getObjectById(creep.memory.targetId)
            if(_.contains(goodLoads, target)) {
                const result = actions.interact(creep, target, () => creep.pickup(target), 1)
                switch (result) {
                case OK:
                    break
                case ERR_INVALID_TARGET:
                    creep.memory.targetId = null
                    break
                default:
                    break
                }
                return result
            }
        }
        //Log.info("finding a target");
        
        var newTargets = _.sortBy(goodLoads, drop => -1*drop.amount + 28*PathFinder.search(creep.pos, drop.pos).cost)
        //Log.info(newTargets)
        if (newTargets.length) {
            creep.memory.targetId = newTargets[0].id

            return actions.pickup(creep)
        }
    },

    upgrade: function(creep) {
        location = creep.room.controller
        return actions.interact(creep, location, () => creep.upgradeController(location), 3)
    },
    
    charge: function(creep, location) {
        const store = creep.store
        if (Object.keys(store).length > 1){
            const mineral = _.keys(store)[1]
            return actions.interact(creep, location, () => creep.transfer(location, mineral), 1)
        } else if (Object.keys(store).length > 0) {
            return actions.interact(creep, location, () => creep.transfer(location, Object.keys(store)[0]), 1)
        }
    },

    // priorities: very damaged structures > construction > mildly damaged structures
    // stores repair id in memory so it will continue repairing till the structure is at max hp
    build: function(creep) {
        if(Game.time % 200 === 0){
            creep.memory.repair = null
            creep.memory.build = null
        }
        if (creep.memory.repair){
            var target = Game.getObjectById(creep.memory.repair)
            if(target){
                if (target.hits < target.hitsMax){
                    return actions.repair(creep, target)
                }
            }
        }
        const city = creep.memory.city
        const myRooms = u.splitRoomsByCity()
        const buildings = _.flatten(_.map(myRooms[city], room => room.find(FIND_STRUCTURES)))
        const needRepair = _.filter(buildings, structure => (structure.hits < (0.2*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL) && (structure.structureType != STRUCTURE_RAMPART))
        const walls = _.filter(buildings, structure => (structure.hits < 1000000) && (structure.hits < structure.hitsMax) && (structure.structureType != STRUCTURE_ROAD))
        //Log.info(buildings);
        if(needRepair.length){
            creep.memory.repair = needRepair[0].id
            return actions.repair(creep, needRepair[0])
            //actions.interact(creep, needRepair[0], () => creep.repair(needRepair[0]));
        } else {
            var targets = _.flatten(_.map(myRooms[city], room => room.find(FIND_MY_CONSTRUCTION_SITES)))
            //var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length) {
                return actions.interact(creep, targets[0], () => creep.build(targets[0]), 3)
            } else {
                var damagedStructures = _.filter(buildings, structure => (structure.hits < (0.4*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL) && (structure.structureType != STRUCTURE_RAMPART))
                if (damagedStructures.length) {
                    creep.memory.repair = damagedStructures[0].id
                    return actions.repair(creep, damagedStructures[0])
                }
                if (walls.length) {
                    const sortedWalls = _.sortBy(walls, structure => structure.hits)
                    creep.memory.repair = sortedWalls[0].id
                    return actions.repair(creep, sortedWalls[0])
                }
            }
        }
    },

    repair: function(creep, target){
        return actions.interact(creep, target, () => creep.repair(target), 3)
    },
    
    // Pick up stuff lying next to you as you pass by
    notice: function(creep) {
        var tombstones = creep.room.find(FIND_TOMBSTONES)
        var closeStones = _.filter(tombstones, stone => stone.pos.isNearTo(creep.pos))
        if (closeStones.length) {
            //Log.info(closeStones);
            // we can only get one thing per turn, success is assumed since we're close
            const result = creep.withdraw(closeStones[0], _.keys(closeStones[0])[0])
            switch (result) {
            case ERR_FULL:
                return
            case ERR_NOT_ENOUGH_RESOURCES:
                break
            default:
                //Log.info(result);
                return result
            }
        }
        var resources = creep.room.find(FIND_DROPPED_RESOURCES)
        var closeStuff = _.filter(resources, thing => thing.pos.isNearTo(creep.pos))
        if (closeStuff.length) {
            // we can only get one thing per turn, success is assumed since we're close
            return creep.pickup(closeStuff[0])
        }
    },
    
    getBoosted: function(creep){
        if(creep.spawning){
            return
        }
        const boosts = {"move": "XZHO2", "tough": "XGHO2", "work": "XZH2O", "heal": "XLHO2", "ranged_attack": "XKHO2"}
        for(let i = creep.body.length - 1; i >= 0; i--){
            if(!creep.body[i].boost){
                const type = creep.body[i].type
                const boost = boosts[type]
                const labs = Object.keys(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers)
                for(const labId of labs){
                    const lab = Game.getObjectById(labId)
                    if(lab.mineralType == boost){
                        //boost self
                        if (lab.boostCreep(creep) === ERR_NOT_IN_RANGE) {
                            motion.newMove(creep, lab.pos, 1)
                        }
                        return
                    }
                }
            }
        }
        creep.memory.boosted = true
        return
    },

    breakStuff: function(creep) {
        var structures = creep.room.find(FIND_HOSTILE_STRUCTURES)
        var structGroups = _.groupBy(structures, structure => structure.structureType)
        var targetOrder = [STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_POWER_SPAWN,
            STRUCTURE_EXTRACTOR, STRUCTURE_LAB, STRUCTURE_TERMINAL, STRUCTURE_OBSERVER, STRUCTURE_NUKER, STRUCTURE_STORAGE, 
            STRUCTURE_RAMPART]
 
        for (var i = 0; i < targetOrder.length; i++) {
            var type = targetOrder[i]
            var breakThese = structGroups[type]
            if (breakThese) {
                creep.memory.target = breakThese[0].id
                return actions.dismantle(creep, breakThese[0]) // TODO break things in your way
            }
        }     
    },
    
    retreat: function(creep) {
        if(Game.time % 20 === 0){
            creep.memory.retreat = false
        }
        const checkpoints = creep.memory.checkpoints
        if (checkpoints) {
            const oldCheckpoint = checkpoints[0]
            const o = oldCheckpoint
            return motion.newMove(creep, new RoomPosition(o.x, o.y, o.roomName), 0)//creep.moveTo(new RoomPosition(o.x, o.y, o.roomName), {reusePath: 0})
        }
    }
}

module.exports = actions
