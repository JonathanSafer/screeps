import rC = require("./claimer")

var rUC = {
    name: "unclaimer",
    type: "unclaimer",

    /** @param {Creep} creep **/
    run: function(creep) {
        return rC.claimRally(creep, Memory.flags.unclaimRally) || 
                rC.runClaimer(creep, Memory.flags.unclaim, rUC.unclaim)
    },

    unclaim: function(creep: Creep) {
        const result = creep.attackController(creep.room.controller)
        if(!creep.room.controller.level && !creep.room.controller.reservation){
            delete Memory.flags.unclaim
        }
        if(result === OK && !creep.room.controller.reservation){
            Game.spawns[creep.memory.city].memory[rUC.name] = 0
            creep.suicide()
        }
    }    
}
export = rUC
