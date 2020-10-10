var sq = {
    schedule: function(spawn, role, boosted = false, flag = null) {
        sq.initialize(spawn)
        spawn.memory.sq.push({role: role, boosted: boosted, flag: flag})
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

    countByInfo: function(spawn, role, flag = null){
        sq.initialize(spawn)
        return _.filter(spawn.memory.sq, creep => creep.role == role && creep.flag == flag).length
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