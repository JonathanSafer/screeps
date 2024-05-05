import u = require("./utils")
import sq = require("./spawnQueue")
import rU = require("./roomUtils")
import a = require("./actions")
import { cN } from "../lib/creepNames"
import { CreepActions } from "./boosts"

export const enum MoveStatus {
    STATIC = "static",
    MOBILE = "mobile"
}

export const cU = {
    setMoveStatus: function(creep) {
        if(!creep.memory.moveStatus)
            creep.memory.moveStatus = creep.getActiveBodyparts(MOVE) ? MoveStatus.MOBILE : MoveStatus.STATIC
    },

    getNextLocation: function(current: number, locations) {
        return (current + 1) % locations.length
    },
    
    updateCheckpoints: function(creep) {
        if (Game.time % 50 == 0  && !u.enemyOwned(creep.room)) {
            if (creep.hits < creep.hitsMax) {
                return
            }
            if (!creep.memory.checkpoints) {
                creep.memory.checkpoints = []
            }
            creep.memory.checkpoints.push(creep.pos)
            if (creep.memory.checkpoints.length > 2) {
                creep.memory.checkpoints.shift()
            }
        }
    },

    getEnergy: function(creep: Creep) {
        const location = rU.getStorage(Game.spawns[creep.memory.city].room) as StructureStorage | StructureContainer | StructureSpawn
        if(!location || (location.store.energy < 300 && location.room.controller.level > 1) || (location.structureType != STRUCTURE_SPAWN && location.store.energy < 1200)){
            return
        }
        if (a.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES) {
            const targets = rU.getWithdrawLocations(creep)
            creep.memory.target = targets[0].id
        }
    },

    checkRoom: function(creep: Creep){
        if(creep.hits < creep.hitsMax*0.8){
            //search for hostile towers. if there are towers, room is enemy
            const tower = _.find(u.findHostileStructures(creep.room), s => s.structureType == STRUCTURE_TOWER)
            if(tower){
                if(!Cache[creep.room.name]){
                    Cache[creep.room.name] = {}
                }
                Cache[creep.room.name].enemy = true
            }
        }
    },

    logDamage: function(creep, targetPos, rma = false){
        u.getsetd(Tmp, creep.room.name,{})
        u.getsetd(Tmp[creep.room.name], "attacks",[])
        const ranged = creep.getActiveBodyparts(RANGED_ATTACK)
        const damageMultiplier = creep.memory.boosted ? (ranged * 4) : ranged
        if(rma){
            for(let i = creep.pos.x - 3; i <= creep.pos.x + 3; i++){
                for(let j = creep.pos.y - 3; j <= creep.pos.y + 3; j++){
                    if(i >= 0 && i <= 49 && j >= 0 && j <= 49){
                        const distance = Math.max(Math.abs(creep.pos.x - i),Math.abs(creep.pos.y - j))
                        switch(distance){
                        case 0: 
                        case 1:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier * 10})
                            break
                        case 2:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier * 4})
                            break
                        case 3:
                            Tmp[creep.room.name].attacks.push({x: i, y: j, damage: damageMultiplier})
                            break
                        }
                    }
                }
            }
        } else {
            Tmp[creep.room.name].attacks.push({x: targetPos.x, y: targetPos.y, damage: damageMultiplier * RANGED_ATTACK_POWER})
        }

    },

    getCreepDamage: function(creep: Creep, type){
        const creepCache = u.getCreepCache(creep.id)
        if(creepCache[type + "damage"])
            return creepCache[type + "damage"]
        const damageParts = creep.getActiveBodyparts(type)
        const boostedPart = _.find(creep.body, part => part.type == type && part.boost)
        const multiplier = boostedPart ? BOOSTS[type][boostedPart.boost][type] : 1
        const powerConstant = type == RANGED_ATTACK ? RANGED_ATTACK_POWER : ATTACK_POWER
        creepCache[type + "damage"] = powerConstant * multiplier * damageParts
        return creepCache[type + "damage"]
    },

    generateCreepName: function(counter, role){
        return role + "-" + counter
    },

    getGoodPickups: function(creep: Creep) {
        const city = creep.memory.city
        const localCreeps = u.splitCreepsByCity()
        const miners = _.filter(localCreeps[city], lcreep => lcreep.memory.role == "remoteMiner" || lcreep.memory.role == "transporter")
        const drops: (AnyStoreStructure | Resource)[] = _.flatten(_.map(miners, miner => _.filter(miner.room.find(FIND_DROPPED_RESOURCES),d => d.resourceType == RESOURCE_ENERGY)))
        const containers = _.map(miners, miner => _.find(miner.pos.lookFor(LOOK_STRUCTURES), struct => struct.structureType == STRUCTURE_CONTAINER)) as StructureContainer[]
        let hostileStorageStructures = []
        
        // Only check these occasionally because runners only need to draw them down once
        if (Game.time % 50 == 0)
            hostileStorageStructures = _.flatten(_.map(miners, miner => miner.room.find(FIND_HOSTILE_STRUCTURES, { filter: s => "store" in s }))) as AnyStoreStructure[]
        
        const runnersBySource = _.groupBy(_.filter(localCreeps[city]), c => c.memory.role == "runner", runner => runner.memory.targetId)
        const pickups = drops.concat(containers).concat(hostileStorageStructures)
        return _.filter(pickups, pickup => cU.isGoodPickup(creep, pickup, runnersBySource))
    },

    isGoodPickup: function(creep: Creep, pickup: Resource | Tombstone | AnyStoreStructure, runnersBySource: _.Dictionary<Creep[]>) {
        let amountToPickup = !pickup ? 0 : (pickup instanceof Resource ? pickup.amount : pickup.store.getUsedCapacity())

        // 1. Check it's not storage. Don't want to withdraw from the storage
        const storageId = creep.memory.location
        if (!pickup || pickup.id == storageId)
            return false
        
        // 2. Subtract energy from nearby runners
        if (runnersBySource[pickup.id]) {
            for (const runner of runnersBySource[pickup.id]) {
                amountToPickup -= runner.store.getFreeCapacity()
            }
        }
       
        // 3. If it is greater than half the creep's capacity, return true
        return amountToPickup >= 0.5 * creep.store.getCapacity()
    },

    getCreepsByRole: function(creeps: Creep[], role: string) {
        return _(creeps)
            .filter(creep => creep.memory.role == role)
            .value()
    },
    
    /// schedules creeps to spawn up until provided quota
    /// param role: role of creep(s) to spawn
    /// param count: number of creeps needed (of this role)
    /// param boosted: whether or not to spawn boosted creeps
    /// param spawn: spawn to spawn from
    /// param currentCreeps: creeps currently in the field (not including spawn queue)
    /// param flag: operation flag used to further filter creeps
    /// param tickOffset: number of ticks of overlap to provide between creeps (i.e if offset is 50, creeps will be scheduled to spawn 50 ticks before the current ones die)
    scheduleIfNeeded: function(role: cN, count: number, boosted: boolean, spawn: StructureSpawn, currentCreeps: Creep[], flag: string = null, tickOffset = 0) {
        const creepsInField = cU.getCreepsByRole(currentCreeps, role)
        const creepsOnOperation = _.filter(creepsInField, creep => creep.memory.flag == flag && !(creep.ticksToLive < tickOffset)).length
        const queued = sq.countByInfo(spawn, role, flag)
        let creepsNeeded = count - queued - creepsOnOperation
        if(role == cN.QUAD_NAME){
            Log.info(`${spawn.name} spawning quad. Queued: ${queued}, OnOp: ${creepsOnOperation}, Needed: ${creepsNeeded} `)
        }
        while (creepsNeeded > 0) {
            sq.schedule(spawn, role, boosted, flag)
            if(role == cN.POWER_MINER_NAME){
                sq.schedule(spawn, cN.MEDIC_NAME)
            }
            creepsNeeded--
        }
    },

    maybeBoost(creep: Creep, creepActions: CreepActions[], rank: number){
        if(creep.memory.needBoost && !creep.memory.boosted){
            a.getBoosted(creep, creepActions, rank)
            return true
        }
        return false
    }
}
