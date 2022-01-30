import actions = require("../lib/actions")
import linkLib = require("../buildings/link")
import motion = require("../lib/motion")
import rB = require("./builder")
import cU = require("../lib/creepUtils")


var rU = {
    name: cU.UPGRADER_NAME,
    type: "normal",
    target: 0,
    boosts: [RESOURCE_CATALYZED_GHODIUM_ACID],

    /** @param {Creep} creep **/
    run: function(creep: Creep) {
        if(creep.memory.needBoost && !creep.memory.boosted){
            rU.getBoosted(creep, rU.boosts[0])
            return
        }
        creep.store.energy > 0 ? actions.upgrade(creep) : rU.getEnergy(creep)
        if(Game.time % 50 == 0){
            rU.checkConstruction(creep)
        }
    },

    checkConstruction: function(creep){
        if(!creep.memory.boosted){
            if(creep.room.find(FIND_MY_CONSTRUCTION_SITES).length 
                && creep.room.controller.ticksToDowngrade > 3000){
                creep.memory.role = rB.name
            }
        }
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
    getUpgradeLink: function(creep: Creep) {
        var link = Game.getObjectById(creep.memory.upgradeLink)
        link = link || linkLib.getUpgradeLink(creep.room) as StructureLink
        if (link) {
            creep.memory.upgradeLink = link.id
            return link
        } else {
            return null
        }
    },

    getBoosted: function(creep: Creep, boost){
        if(creep.spawning){
            return
        }
        const labs = Object.keys(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers) as Id<StructureLab>[]
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
export = rU