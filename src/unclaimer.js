const rC = require("./claimer")

var rUC = {
    name: "unclaimer",
    type: "claimer",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        return rC.claimRally(creep, Game.flags.unclaimRally) || 
                rC.runClaimer(creep, Game.flags.unclaim, rUC.unclaim)
    },

    unclaim: function(creep) {
        const result = creep.attackController(creep.room.controller)
        if(result === OK){
            Game.spawns[creep.memory.city].memory[rUC.name] = 0
            creep.suicide()
        }
    }    
}
module.exports = rC
