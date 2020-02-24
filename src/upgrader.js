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
            creep.store.energy > 0 ? actions.upgrade(creep) : rU.withdraw(creep, city)
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
        const work = _.filter(creep.body, part => !part.boost && part.type == WORK).length
        return (terminal.store[boost] > (LAB_BOOST_MINERAL * work) && lab.mineralAmount == 0)
    },


    getBoosted: function(creep, city, boost){
        if(creep.memory.state != 1){
            return
        }
        const lab = Game.getObjectById(creep.memory.lab)
        if(_.sum(creep.carry) == 0 && !lab.store[boost]){//creep and lab empty
            if(Game.time % 50 == 0){//reset occasionally in case another upgrader stole the last bit of boost
                creep.memory.state = CS.START
                return
            }
            const work = _.filter(creep.body, part => !part.boost && part.type == WORK).length
            if(!work){//if all works boosted, go upgrade
                creep.memory.state = CS.UPGRADE
                return
            }
            const carry = creep.getActiveBodyparts(CARRY)
            //withdraw amount of boost needed or amount can be carried, whichever is less
            actions.withdraw(creep, creep.room.terminal, boost, Math.min(LAB_BOOST_MINERAL * work, CARRY_CAPACITY * carry))
            return
        }
        if(_.sum(creep.carry) > 0){//creep is carrying boost
            actions.charge(creep, lab)
            return
        } else {//creep is next to lab and not holding anything
            lab.boostCreep(creep)
            creep.memory.state = CS.START
        }
    }
}
module.exports = rU