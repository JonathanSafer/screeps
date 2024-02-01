import actions = require("../lib/actions")
import linkLib = require("../buildings/link")
import motion = require("../lib/motion")
import { MoveStatus, cU} from "../lib/creepUtils"
import roomU = require("../lib/roomUtils")
import u = require("../lib/utils")
import { cN, BodyType } from "../lib/creepNames"
import { CreepActions as cA } from "../lib/boosts"


const rU = {
    name: cN.UPGRADER_NAME,
    type: BodyType.normal,
    target: 0,
    boosts: [RESOURCE_CATALYZED_GHODIUM_ACID],
    actions: [cA.UPGRADE],

    /** @param {Creep} creep **/
    run: function(creep: Creep) {
        if(creep.memory.needBoost && !creep.memory.boosted){
            rU.getBoosted(creep, rU.boosts[0])
            return
        }
        cU.setMoveStatus(creep)
        rU.setUpgradingLocation(creep)
        const creepCache = u.getCreepCache(creep.id)
        if(!creepCache.works){
            creepCache.works = creep.getActiveBodyparts(WORK)
        }
        if(creep.store.energy <= creepCache.works * 2)
            rU.getEnergy(creep)
        if(creep.store.energy > 0)
            actions.upgrade(creep)
        if(Game.time % 50 == 49)
            rU.checkConstruction(creep)
    },

    checkConstruction: function(creep){
        if(!creep.memory.boosted && creep.memory.moveStatus != MoveStatus.STATIC){
            const extensionSite = _.find(creep.room.find(FIND_MY_CONSTRUCTION_SITES) as [ConstructionSite], c => c.structureType == STRUCTURE_EXTENSION
                || c.structureType == STRUCTURE_CONTAINER
                || c.structureType == STRUCTURE_STORAGE)
            if(extensionSite && creep.room.controller.ticksToDowngrade > CONTROLLER_DOWNGRADE[creep.room.controller.level] * 0.8){
                creep.memory.role = cN.BUILDER_NAME
            }
        }
    },

    setUpgradingLocation: function(creep) {
        if (creep.memory.destination || creep.memory.moveStatus != MoveStatus.STATIC) {
            return
        }
        const link = rU.getUpgradeLink(creep) as StructureLink | StructureContainer
        let location
        if (link) {
            location = rU.findFreeSpot(creep, link.pos)
        }
        if (!location) {
            Log.error(`No free spot for upgrader at ${creep.pos}`)
        }
        creep.memory.destination = location
    },

    findFreeSpot: function(creep, pos: RoomPosition) {
        const otherUpgraders = _.filter(creep.room.find(FIND_MY_CREEPS) as [Creep], c => c.memory.role == cN.UPGRADER_NAME && c.id != creep.id)
        for (let x = -1; x < 2; x++) {
            for (let y = -1; y < 2; y++) {
                const newPos = new RoomPosition(pos.x + x, pos.y + y, pos.roomName)
                if (!roomU.isPositionBlocked(newPos)
                    && newPos.inRangeTo(creep.room.controller.pos, 3)
                    && !_.find(otherUpgraders, c => c.memory.destination && newPos.isEqualTo(c.memory.destination.x, c.memory.destination.y))){
                    return newPos
                }
            }
        }
        return null
    },

    getEnergy: function(creep){
        const link = rU.getUpgradeLink(creep) as StructureLink | StructureContainer
        if(link){
            actions.withdraw(creep, link)
            if(link && link.structureType == STRUCTURE_CONTAINER && link.pos.isNearTo(creep.pos) && link.pos.inRangeTo(link.room.controller.pos,3)){
                creep.move(creep.pos.getDirectionTo(link.pos))
            }
            return
        }
        cU.getEnergy(creep)
    },
    // Get the upgrade link. Check creep memory, then lib. May return null
    getUpgradeLink: function(creep: Creep) {
        let link = Game.getObjectById(creep.memory.upgradeLink)
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
        if(!Game.spawns[creep.memory.city].memory.ferryInfo.labInfo){
            creep.memory.boosted = true
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