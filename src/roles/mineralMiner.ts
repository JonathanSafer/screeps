import a = require("../lib/actions")
import roomU = require("../lib/roomUtils")
import cN = require("../lib/creepNames")

var rMM = {
    name: cN.MINERAL_MINER_NAME,
    type: "mineralMiner",

    run: function(creep: Creep) {
        if(!creep.memory.suicideTime && creep.memory.source){
            const works = creep.getActiveBodyparts(WORK) * HARVEST_MINERAL_POWER
            const carry = creep.getActiveBodyparts(CARRY) * CARRY_CAPACITY
            const ticksToFill = Math.ceil(carry/works * EXTRACTOR_COOLDOWN)
            const mineral = Game.getObjectById(creep.memory.source)
            const distance = Game.spawns[creep.memory.city].pos.getRangeTo(mineral.pos)
            creep.memory.suicideTime = distance + ticksToFill
        }
        if (_.sum(Object.values(creep.store)) == 0 && creep.ticksToLive < creep.memory.suicideTime){
            creep.suicide()
        }
        if (!creep.memory.source){
            var sources = creep.room.find(FIND_MINERALS)
            creep.memory.source = sources[0].id
        }
        if (rMM.needEnergy(creep)){
            rMM.harvestTarget(creep)
        } else {
            var bucket = roomU.getStorage(creep.room)
            a.charge(creep, bucket)
        }
    },

    needEnergy: function(creep: Creep) {
        const store = _.sum(Object.values(creep.store))
        return (store < creep.store.getCapacity())
    },

    harvestTarget: function(creep: Creep) {
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
export = rMM