var actions = require("./actions")
var u = require("./utils")
var linkLib = require("./link")
var motion = require("./motion")


var rU = {
    name: "upgrader",
    type: "normal",
    target: function(spawn, boosted){
        if(boosted){
            const boosts = [RESOURCE_CATALYZED_GHODIUM_ACID]
            u.requestBoosterFill(spawn, boosts)
        }
        return 0
    },

    /** @param {Creep} creep **/
    run: function(creep) {
        var city = creep.memory.city
        if(creep.memory.needBoost && !creep.memory.boosted){
            const boost = "XGH2O"
            rU.getBoosted(creep, boost)
            return
        }
        creep.store.energy > 0 ? actions.upgrade(creep) : rU.withdraw(creep, city)
    },

    withdraw: function(creep, city) {
        var location = rU.getUpgradeLink(creep)

        var targets = u.getWithdrawLocations(creep)
        location = location || targets[creep.memory.target]
        location = location || Game.spawns[city]

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