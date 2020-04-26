var actions = require("../lib/actions")
var u = require("../lib/utils")
var linkLib = require("../buildings/link")
var motion = require("../lib/motion")


var rU = {
    name: "upgrader",
    type: "normal",
    target: 0,
    boosts: [RESOURCE_CATALYZED_GHODIUM_ACID],

    /** @param {Creep} creep **/
    run: function(creep) {
        var city = creep.memory.city
        if(creep.memory.needBoost && !creep.memory.boosted){
            rU.getBoosted(creep, rU.boosts[0])
            return
        }
        creep.store.energy > 0 ? actions.upgrade(creep) : rU.withdraw(creep, city)
    },

    withdraw: function(creep, city) {
        let location = rU.getUpgradeLink(creep)

        const targets = u.getWithdrawLocations(creep)
        location = location || targets[creep.memory.target]
        location = location || Game.spawns[city]
        if(location.structureType != STRUCTURE_LINK && location.store.energy < 300){
            return
        }
        if (actions.withdraw(creep, location) == ERR_NOT_ENOUGH_RESOURCES) {
            creep.memory.target = u.getNextLocation(creep.memory.target, targets)
        }
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
    }
}
module.exports = rU