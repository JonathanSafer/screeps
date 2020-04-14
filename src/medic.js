var rMe = {
    name: "medic",
    type: "medic",
    target: function(spawn, boosted){
        if(boosted){
            const boosts = [RESOURCE_CATALYZED_GHODIUM_ALKALIDE, RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE]
            u.requestBoosterFill(spawn, boosts)
        }
        return 0
    },
   

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