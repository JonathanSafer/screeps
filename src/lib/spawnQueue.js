var sq = {
    schedule: function(spawn, role, boosted = false) {
        sq.initialize(spawn)
        spawn.memory.sq.push({role: role, boosted: boosted})
    },

    peekNextRole: function(spawn) {
        sq.initialize(spawn)
        return spawn.memory.sq[0]
    },

    removeNextRole: function(spawn) {
        sq.initialize(spawn)
        return spawn.memory.sq.shift()
    },

    getCounts: function(spawn) {
        sq.initialize(spawn)
        return _.countBy(spawn.memory.sq, creep => creep.role)
    },

    respawn: function(creep, boosted) {
        const spawn = Game.spawns[creep.memory.city]
        if(!spawn) return
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