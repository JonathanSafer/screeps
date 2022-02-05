
const sq = {
    schedule: function(spawn: StructureSpawn, role: string, boosted = false, flag = null) {
        sq.initialize(spawn)
        spawn.memory.sq.push({role: role, boosted: boosted, flag: flag})
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

    sortBy: function(spawn: StructureSpawn, sortFn: (item: QueuedCreep) => number) {
        if (spawn.memory.sq.length > 0) {
            spawn.memory.sq = _.sortBy(spawn.memory.sq, sortFn)
        }
    }
}
export = sq