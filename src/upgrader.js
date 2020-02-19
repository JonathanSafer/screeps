var actions = require("./actions")
var u = require("./utils")
var linkLib = require("./link")

var CreepState = {
    START: 0,
    BOOST: 1,
    UPGRADE: 2
}
var CS = CreepState

var rU = {
    name: "upgrader",
    type: "normal",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        var city = creep.memory.city
        if(!creep.memory.state){
            creep.memory.state = CS.START
        }
        const boost = "XGH2O"
        rU.checkBoost(creep, city, boost)
        rU.getBoosted(creep, city, boost)

        if (creep.memory.state == CS.UPGRADE){
            if(creep.memory.upgrading && creep.carry.energy == 0) {
                creep.memory.upgrading = false
            } else if(!creep.memory.upgrading && creep.store.energy >= creep.store.getCapacity() * 0.5) {
                creep.memory.upgrading = true
            }

            creep.memory.upgrading ? actions.upgrade(creep) : rU.withdraw(creep, city)
        }
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

    checkBoost: function(creep, city, boost){
        if(creep.memory.state != CS.START){
            return
        }
        if(Game.spawns[city].room.controller.level < 6 || !creep.room.terminal){
            creep.memory.state = CS.UPGRADE
            return
        }
        if(Game.spawns[city].room.controller.level < 8){
            const lab = _.find(Game.spawns[city].room.find(FIND_STRUCTURES), structure => structure.structureType === STRUCTURE_LAB)
            rU.updateStateFromLab(lab, creep, boost)
            return
        }
        if(!Game.spawns[city].memory.ferryInfo || !Game.spawns[city].memory.ferryInfo.boosterInfo){
            creep.memory.state = CS.UPGRADE
            return
        }
        const lab = Game.getObjectById(Game.spawns[city].memory.ferryInfo.boosterInfo[0][0])
        rU.updateStateFromLab(lab, creep, boost)
    },

    updateStateFromLab: function(lab, creep, boost) {
        if(rU.checkMaterials(lab, creep, boost)){
            creep.memory.lab = lab.id
            creep.memory.state = CS.BOOST
        } else {
            creep.memory.state = CS.UPGRADE
        }
    },

    checkMaterials: function(lab, creep, boost){
        if (!lab || !lab.room.terminal) return false
        const terminal = lab.room.terminal
        const work = creep.getActiveBodyparts(WORK)
        return (terminal.store[boost] > (LAB_BOOST_MINERAL * work) && lab.mineralAmount == 0)
    },


    getBoosted: function(creep, city, boost){
        if(creep.memory.state != 1){
            return
        }
        const lab = Game.getObjectById(creep.memory.lab)
        if(_.sum(creep.carry) == 0 && !creep.pos.isNearTo(lab.pos)){
            if(Game.time % 50 == 0){
                creep.memory.state = CS.START
                return
            }
            const work = creep.getActiveBodyparts(WORK)
            actions.withdraw(creep, creep.room.terminal, boost, LAB_BOOST_MINERAL * work)
            return
        }
        if(_.sum(creep.carry) > 0){
            actions.charge(creep, lab)
            return
        }
        if(creep.body[0].boost){
            creep.memory.state = CS.UPGRADE
            return
        } else {
            lab.boostCreep(creep)
            creep.memory.state = CS.UPGRADE
            return
        }
    }
}
module.exports = rU