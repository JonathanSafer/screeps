var sq = {
    schedule: function(spawn, role) {
        sq.initialize(spawn)
        spawn.memory.sq.push(role)
    },

    getNextRole: function(spawn) {
        sq.initialize(spawn)
        return spawn.memory.sq.shift()
    },

    getCounts: function(spawn) {
        sq.initialize(spawn)
        return _.countBy(sq, name => name)
    },

    respawn: function(creep) {
        const spawn = Game.spawns[creep.memory.city]
        sq.initialize(spawn)
        sq.schedule(spawn, creep.memory.role)
    },

    initialize: function(spawn) {
        if (!spawn.memory.sq) {
            spawn.memory.sq = []
        }
    }

};
module.exports = sq;