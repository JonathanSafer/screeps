var a = require("./actions")
var u = require("./utils")

var rMM = {
    name: "mineralMiner",
    type: "mineralMiner",

    /** @param {Creep} creep **/
    run: function(creep) {
        if (_.sum(creep.store) == 0 && creep.ticksToLive < 130){
            creep.suicide()
        }
        if (!creep.memory.source){
            var sources = creep.room.find(FIND_MINERALS)
            creep.memory.source = sources[0].id
        }
        if (rMM.needEnergy(creep)){
            rMM.harvestTarget(creep)
        } else {
            var bucket = u.getStorage()
            a.charge(creep, bucket)
        }
    },

    needEnergy: function(creep) {
        const store = _.sum(creep.store)
        return (store < creep.store.getCapacity())
    },

    harvestTarget: function(creep) {
        var source = Game.getObjectById(creep.memory.source)
        const harvestResult = a.harvest(creep, source)
        if (harvestResult == ERR_NO_PATH) {
            Log.info("no path for mining :/")
        } else if (harvestResult == 1) {
        // Record mining totals in memory for stat tracking
            const works = _.filter(creep.body, part => part.type == WORK).length
            if (!creep.memory.mined) {
                creep.memory.mined = 0
            }
            creep.memory.mined += works
        }
    },


}
module.exports = rMM