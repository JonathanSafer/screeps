var sq = {
    schedule: function(spawn, role) {
        sq.initialize(spawn)
        spawn.memory.sq.push(role)
    },

    getNextRole: function(spawn) {
        sq.initialize(spawn)
        return spawn.memory.sq.shift()
    },

    initialize: function(spawn) {
        if (!spawn.memory.sq) {
            spawn.memory.sq = []
        }
    }

};
module.exports = sq;