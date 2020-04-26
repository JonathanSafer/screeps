const u = require("./utils")
const actions = require("./actions")

var rMe = {
    name: "medic",
    type: "medic",
    target: u.boosterRequestFn([RESOURCE_CATALYZED_GHODIUM_ALKALIDE, 
        RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE, RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]),

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.needBoost && !creep.memory.boosted){
            return actions.getBoosted(creep)
        }
        rMe.init(creep)
        const partner = Game.getObjectById(creep.memory.partner)
        if(!partner){
            //if partner is dead, suicide
            if(rMe.endLife(creep)){
                return
            }
            //if creep not matched, wait to be picked up
        }
    },  

    init: function(creep){
        if (!creep.memory.partner){
            creep.memory.partner = null
        }
    },

    endLife: function(creep){
        if(creep.memory.partner == null){
            return false
        } else {
            creep.suicide()
            return true
        }
    }


   
}
module.exports = rMe