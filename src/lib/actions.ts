import u = require("./utils")
import motion = require("./motion")
import { boosts, CreepActions } from "./boosts"


const actions = {
    interact: function(creep: Creep, location, fnToTry: () => ScreepsReturnCode, range=undefined, logSuccess=false, local=false): ScreepsReturnCode | 1 {
        const result = fnToTry()
        switch (result) {
        case ERR_NOT_IN_RANGE: {
            const box = local ? motion.getBoundingBox(creep.room) : null
            motion.newMove(creep, location.pos, range, true, box)
            return null
        }
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
            if (creep.hits == creep.hitsMax) {
                Log.info(`${creep.memory.role} at ${creep.pos} operating on ${location}: ${result.toString()}`)
            }
            return result
        }
    },
    
    reserve: function(creep, target){
        const city = creep.memory.city
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
    
    attack: function(creep: Creep, target){
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
     
    withdraw: function(creep, location, mineral?, amount?) {
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
        const res = actions.interact(creep, target, () => creep.harvest(target), 1)
        if (res == 1) {
            // Record mining totals in memory for stat tracking
            const works = creep.getActiveBodyparts(WORK)
            if (!creep.memory.mined) {
                creep.memory.mined = 0
            }
            creep.memory.mined += works
        }
        return res
    },

    pick: function(creep, target){
        return actions.interact(creep, target, () => creep.pickup(target), 1)
    },

    upgrade: function(creep) {
        const location = creep.room.controller
        return actions.interact(creep, location, () => creep.upgradeController(location), 3)
    },
    
    charge: function(creep, location, local=false) {
        const store = creep.store
        if (Object.keys(store).length > 1){
            const mineral = _.keys(store)[1]
            const result =  actions.interact(creep, location, () => creep.transfer(location, mineral), 1, false, local)
            if(result == ERR_INVALID_TARGET)
                return creep.drop(mineral)
        } else if (Object.keys(store).length > 0) {
            return actions.interact(creep, location, () => creep.transfer(location, Object.keys(store)[0]), 1, false, local)
        }
    },

    // priorities: very damaged structures > construction > mildly damaged structures
    // stores repair id in memory so it will continue repairing till the structure is at max hp
    build: function(creep: Creep) {
        if(Game.time % 200 === 0){
            creep.memory.repair = null
            creep.memory.build = null
        }
        if (creep.memory.repair){
            const target: Structure = Game.getObjectById(creep.memory.repair)
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
        if(needRepair.length){
            creep.memory.repair = needRepair[0].id
            return actions.repair(creep, needRepair[0])
            //actions.interact(creep, needRepair[0], () => creep.repair(needRepair[0]));
        } else {
            const targets = _.flatten(_.map(myRooms[city], room => room.find(FIND_MY_CONSTRUCTION_SITES)))
            //var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length) {
                return actions.interact(creep, targets[0], () => creep.build(targets[0]), 3)
            } else {
                const damagedStructures = _.filter(buildings, structure => (structure.hits < (0.4*structure.hitsMax)) && (structure.structureType != STRUCTURE_WALL) && (structure.structureType != STRUCTURE_RAMPART))
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
    notice: function(creep: Creep) {
        const tombstones = creep.room.find(FIND_TOMBSTONES)
        const closeStones = _.filter(tombstones, stone => stone.pos.isNearTo(creep.pos))
        if (closeStones.length) {
            // we can only get one thing per turn, success is assumed since we're close
            const result = creep.withdraw(closeStones[0], _.keys(closeStones[0])[0] as ResourceConstant)
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
        const resources = _.filter(creep.room.find(FIND_DROPPED_RESOURCES), d => d.resourceType == RESOURCE_ENERGY)
        const closeStuff = _.filter(resources, thing => thing.pos.isNearTo(creep.pos))
        if (closeStuff.length) {
            // we can only get one thing per turn, success is assumed since we're close
            return creep.pickup(closeStuff[0])
        }
    },
    
    getBoosted: function(creep: Creep, creepActions: CreepActions[], rank: number){
        if(creep.spawning){
            return
        }
        if(!Game.spawns[creep.memory.city].memory.ferryInfo.labInfo){
            creep.memory.boosted = true
            return
        }

        const boostsNeeded = boosts.getBoostsForRank(creepActions, rank)
        let nextBoost = null
        for (const boost of boostsNeeded){
            const part = boosts.mapBoostToPart(boost)
            if(_.find(creep.body, p => p.type === part && !p.boost)){
                nextBoost = boost
                break
            }
        }
        if (!nextBoost){
            creep.memory.boosted = true
            return
        }

        //{"move": "XZHO2", "tough": "XGHO2", "work": "XZH2O", "heal": "XLHO2", "ranged_attack": "XKHO2"}

        const labs = Object.keys(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers)
        for(const labId of labs){
            const lab: StructureLab = Game.getObjectById(labId)
            if(lab.store[nextBoost] >= LAB_BOOST_MINERAL){
                if(!lab.store.energy){
                    return
                }
                //boost self
                if (lab.boostCreep(creep) === ERR_NOT_IN_RANGE) {
                    motion.newMove(creep, lab.pos, 1)
                }
                return
            }
        }
    },

    breakStuff: function(creep: Creep) {
        const structures = creep.room.find(FIND_HOSTILE_STRUCTURES)
        const structGroups = _.groupBy(structures, structure => structure.structureType)
        const targetOrder = [STRUCTURE_SPAWN, STRUCTURE_TOWER, STRUCTURE_EXTENSION, STRUCTURE_LINK, STRUCTURE_POWER_SPAWN,
            STRUCTURE_EXTRACTOR, STRUCTURE_LAB, STRUCTURE_TERMINAL, STRUCTURE_OBSERVER, STRUCTURE_NUKER, STRUCTURE_STORAGE, 
            STRUCTURE_RAMPART]
 
        for (let i = 0; i < targetOrder.length; i++) {
            const type = targetOrder[i]
            const breakThese = structGroups[type]
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
            return motion.newMove(creep, new RoomPosition(o.x, o.y, o.roomName), 0)
        }
    }
}

export = actions
