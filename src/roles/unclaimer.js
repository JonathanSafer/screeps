const rC = require("./claimer")

var rUC = {
    name: "unclaimer",
    type: "unclaimer",

    /** @param {Creep} creep **/
    run: function(creep) {
        return rC.claimRally(creep, Memory.flags.unclaimRally) || 
                rC.runClaimer(creep, Memory.flags.unclaim, rUC.unclaim)
    },

    unclaim: function(creep) {
        const result = creep.attackController(creep.room.controller)
        if(result === OK){
            Game.spawns[creep.memory.city].memory[rUC.name] = 0
            creep.suicide()
        }
    }    
}
module.exports = rUC
