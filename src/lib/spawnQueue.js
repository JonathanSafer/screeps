var sq = {
    schedule: function(spawn, role, boosted = false) {
        sq.initialize(spawn)
        spawn.memory.sq.push({role: role, boosted: boosted})
    },

    getNextRole: function(spawn) {
        sq.initialize(spawn)
        return spawn.memory.sq[0]
    },

    getCounts: function(spawn) {
        sq.initialize(spawn)
        return _.countBy(spawn.memory.sq, creep => creep.role)
    },

    respawn: function(creep, boosted) {
        const spawn = Game.spawns[creep.memory.city]
        sq.initialize(spawn)
        sq.schedule(spawn, creep.memory.role, boosted)
    },

    initialize: function(spawn) {
        if (!spawn.memory.sq) {
            spawn.memory.sq = []
        }
    }

}
module.exports = sq