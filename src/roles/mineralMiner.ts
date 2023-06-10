import a = require("../lib/actions")
import roomU = require("../lib/roomUtils")
import { cN, BodyType } from "../lib/creepNames"
import motion = require("../lib/motion")

const rMM = {
    name: cN.MINERAL_MINER_NAME,
    type: BodyType.mineralMiner,

    run: function(creep: Creep) {
        rMM.contemplateSuicide(creep)

        rMM.getMineral(creep)

        if (rMM.canMine(creep)){
            rMM.harvestMineral(creep)
        } else {
            const bucket = roomU.getStorage(creep.room)
            a.charge(creep, bucket)
        }
    },

    // attempt to find a mineral
    getMineral: function(creep: Creep) {
        if(creep.memory.source) return
        const targetRoom = creep.memory.flag || creep.pos.roomName
        if (Game.rooms[targetRoom]) {
            const extractor = _.find(creep.room.find(FIND_STRUCTURES), s => s.structureType == STRUCTURE_EXTRACTOR)
            const mineral = extractor && _.find(extractor.pos.lookFor(LOOK_MINERALS))
            creep.memory.source = mineral && mineral.id
        }
    },

    // suicide if not enough TTL to complete another job cycle
    contemplateSuicide: function(creep: Creep) {
        if (!creep.memory.source) return
        const mineral = Game.getObjectById(creep.memory.source) as Mineral
        if(!creep.memory.suicideTime){
            const works = creep.getActiveBodyparts(WORK) * HARVEST_MINERAL_POWER
            const carry = creep.getActiveBodyparts(CARRY) * CARRY_CAPACITY
            const ticksToFill = Math.ceil(carry/works * EXTRACTOR_COOLDOWN)
            const distance = PathFinder.search(Game.spawns[creep.memory.city].pos, {pos: mineral.pos, range: 1}).path.length
            creep.memory.suicideTime = distance + ticksToFill
        }
        if (_.sum(Object.values(creep.store)) == 0 
            && (creep.ticksToLive < creep.memory.suicideTime
                || (creep.ticksToLive < CREEP_LIFE_TIME/2 && mineral.mineralType == RESOURCE_THORIUM))) {
            creep.suicide()
        }
    },

    canMine: function(creep: Creep) {
        const hasCapacity = creep.store.getFreeCapacity()
        const sourceDepleted = creep.memory.source 
            && !Game.getObjectById(creep.memory.source) 
            && creep.pos.roomName == creep.memory.flag
        return hasCapacity && !sourceDepleted
    },

    harvestMineral: function(creep: Creep) {
        const source = Game.getObjectById(creep.memory.source)
        if (source) {
            a.harvest(creep, source)
        } else if (creep.memory.flag) {
            motion.newMove(creep, new RoomPosition(25, 25, creep.memory.flag), 24)
        } else {
            Log.error(`MineralMiner at ${creep.pos} unable to find target`)
        }
    },


}
export = rMM