var sq = {
    schedule: function(spawn, role) {
        sq.initialize()
        spawn.memory.sq.push(role)
    },

    getNext: function(spawn) {
        sq.initialize()
        return spawn.memory.sq.shift()
    },

    initialize: function(spawn) {
        if (!spawn.memory.sq) {
            spawn.memory.sq = []
        }
    }

};
module.exports = sq;