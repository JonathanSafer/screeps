var actions = require("../lib/actions")
var linkLib = require("../buildings/link")
var motion = require("../lib/motion")
var rB = require("./builder")


var rU = {
    name: "upgrader",
    type: "normal",
    target: 0,
    boosts: [RESOURCE_CATALYZED_GHODIUM_ACID],

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.needBoost && !creep.memory.boosted){
            rU.getBoosted(creep, rU.boosts[0])
            return
        }
        creep.store.energy > 0 ? actions.upgrade(creep) : rU.getEnergy(creep)
    },


    getEnergy: function(creep){
        const link = rU.getUpgradeLink(creep)
        if(link){
            actions.withdraw(creep, link)
            return
        }
        rB.getEnergy(creep)
    },
    // Get the upgrade link. Check creep memory, then lib. May return null
    getUpgradeLink: function(creep) {
        var link = Game.getObjectById(creep.memory.upgradeLink)
        link = link || linkLib.getUpgradeLink(creep.room)
        if (link && (link.store.getUsedCapacity(RESOURCE_ENERGY) > 0 || link.room.controller.level == 8)) {
            creep.memory.upgradeLink = link.id
            return link
        } else {
            return null
        }
    },

    getBoosted: function(creep, boost){
        if(creep.spawning){
            return
        }
        const labs = Object.keys(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers)
        for(const labId of labs){
            const lab = Game.getObjectById(labId)
            if(!lab){
                continue
            }
            if(lab.mineralType == boost){
                //boost self
                if (lab.boostCreep(creep) === ERR_NOT_IN_RANGE) {
                    motion.newMove(creep, lab.pos, 1)
                } else {
                    creep.memory.boosted = true
                }
                return
            }
        }
        creep.memory.boosted = true
    }
}
module.exports = rU