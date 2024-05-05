import { cN, rolePriorities } from "./creepNames"
import types = require("../config/types")

const sq = {
    schedule: function(spawn: StructureSpawn, role: cN, boosted = false, flag = null, budget = null, priority = null) {
        sq.initialize(spawn)
        const boostTier = boosted ? 3 : 0
        const spawnTime = types.getRecipe(role, spawn.room.energyCapacityAvailable, spawn.room, boostTier, flag).length * CREEP_SPAWN_TIME
        spawn.memory.sq.push({role: role, boosted: boosted, flag: flag, budget: budget, priority: priority, spawnTime: spawnTime})
    },

    peekNextRole: function(spawn: StructureSpawn) {
        sq.initialize(spawn)
        return spawn.memory.sq[0]
    },

    removeNextRole: function(spawn: StructureSpawn) {
        sq.initialize(spawn)
        return spawn.memory.sq.shift()
    },

    getCounts: function(spawn: StructureSpawn) {
        sq.initialize(spawn)
        return _.countBy(spawn.memory.sq, creep => creep.role)
    },

    countByInfo: function(spawn: StructureSpawn, role, flag = null){
        sq.initialize(spawn)
        return _.filter(spawn.memory.sq, creep => creep.role == role && creep.flag == flag).length
    },

    respawn: function(creep: Creep, boosted=false) {
        const spawn = Game.spawns[creep.memory.city]
        if(!spawn) return
        sq.initialize(spawn)
        sq.schedule(spawn, creep.memory.role, boosted, creep.memory.flag)
    },

    initialize: function(spawn: StructureSpawn) {
        if (!spawn.memory.sq) {
            spawn.memory.sq = []
        }
    },

    sort: function(spawn: StructureSpawn) {
        const priorities = rolePriorities()
        const sortFn = (item: QueuedCreep) => item.priority || priorities[item.role]
        spawn.memory.sq = _.sortBy(spawn.memory.sq, sortFn)
    },

    getTime: function(spawn: StructureSpawn) {
        sq.initialize(spawn)
        return _.sum(spawn.memory.sq, creep => creep.spawnTime)
    }
}
export = sq