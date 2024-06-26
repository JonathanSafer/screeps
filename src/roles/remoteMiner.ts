import a = require("../lib/actions")
import motion = require("../lib/motion")
import settings = require("../config/settings")
import { MoveStatus , cU } from "../lib/creepUtils"
import u = require("../lib/utils")
import { cN, BodyType } from "../lib/creepNames"
import roomU = require("../lib/roomUtils")

const rM = {
    name: cN.REMOTE_MINER_NAME,
    type: BodyType.miner,

    run: function(creep: Creep) {
        if(creep.spawning){
            return
        }
        rM.checkRespawn(creep)
        if (rM.retreat(creep)) return
        if (creep.memory.paired && !Game.getObjectById(creep.memory.paired))
            creep.memory.paired = null
        if (!creep.memory.source || !creep.memory.sourcePos) {
            rM.nextSource(creep)
            return
        }
        const source = Game.getObjectById(creep.memory.source) as Source
        cU.setMoveStatus(creep)
        rM.maybeMove(creep, source)
        if(!source)
            return
        if(creep.memory.construction && rM.build(creep, source))
            return
        if(creep.memory.link){
            const link = Game.getObjectById(creep.memory.link)
            if(link){
                if(source.energy > 0 && creep.store.getFreeCapacity() > 0)
                    creep.harvest(source)
                if(!creep.store.getFreeCapacity())
                    a.charge(creep, link)
                return
            } else {
                creep.memory.link = null
            }
        } else if(creep.memory.container){
            const container = Game.getObjectById(creep.memory.container)
            if(container){
                if(container.hits < container.hitsMax * 0.3 && creep.store.getUsedCapacity() > 0 && !creep.store.getFreeCapacity()){
                    creep.repair(container)
                } else if(source.energy > 0 && (container.store.getFreeCapacity() > 0 || creep.store.getFreeCapacity() > 0)){
                    creep.harvest(source)
                } else if (container.hits < container.hitsMax * 0.9 && creep.store.getUsedCapacity() > 0){
                    creep.repair(container)
                }
            } else {
                creep.memory.container = null
            }
        } else if(source.energy > 0){
            creep.harvest(source)
        }
        if(Game.time % settings.minerUpdateTime == 0){
            if(creep.pos.isNearTo(source.pos) && !creep.memory.spawnBuffer){
                creep.memory.spawnBuffer = PathFinder.search(Game.spawns[creep.memory.city].pos, source.pos).cost
            }
            //update container/link status
            //if we have a link no need to search
            if(creep.memory.link && Game.getObjectById(creep.memory.link))
                return
            //get Destination assigns structures/sites anyway so might as well reuse
            rM.getDestination(creep, source)
            if(!creep.memory.link && !creep.memory.container && !creep.memory.construction && creep.body.length > 5)
                rM.placeContainer(creep, source)
        }
    },

    checkRespawn: function(creep: Creep) {
        if(creep.ticksToLive == creep.memory.spawnBuffer + (creep.body.length * CREEP_SPAWN_TIME)) {
            const spawn = Game.spawns[creep.memory.city]
            const creeps = u.splitCreepsByCity()[creep.memory.city]

            // 2 creeps needed, because one is still alive
            cU.scheduleIfNeeded(cN.REMOTE_MINER_NAME, 2, false, spawn, creeps, creep.memory.flag)
        }
    },

    retreat: function(creep: Creep){
        if (creep.memory.aware || creep.hits < creep.hitsMax || Game.time % 10 == 9) {
            creep.memory.aware = true
            // if creep has a hostile within 15 spaces, become aware
            const hostiles = _.filter(u.findHostileCreeps(creep.room), (c) => c.pos.getRangeTo(creep.pos) < 15)
            // check nearby sourcekeeper lairs
            const lair = _.find(creep.room.find(FIND_HOSTILE_STRUCTURES), (s) => s.structureType == STRUCTURE_KEEPER_LAIR && s.pos.getRangeTo(creep.pos) < 10) as StructureKeeperLair
            const dangerousLair = lair && lair.ticksToSpawn < 20
            //lose awareness if no hostiles or lairs
            if(hostiles.length == 0 && !dangerousLair && creep.hits == creep.hitsMax){
                creep.memory.aware = false
            } else if (creep.pos.roomName == Game.spawns[creep.memory.city].pos.roomName) {
                Game.spawns[creep.memory.city].memory.towersActive = true
            }
            // if creep has an enemy within 5 spaces, retreat
            const enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 5) as Array<Creep | Structure>
            if(dangerousLair) {
                enemies.push(lair)
            }
            if(enemies.length > 0){
                motion.retreat(creep, enemies)
                return true
            }
        }
        return false
    },

    placeContainer: function(creep, source){
        const spawn = Game.spawns[creep.memory.city]
        if(!spawn.memory.sources[source.id] || spawn.room.energyCapacityAvailable < 800 || Math.random() < 0.95)
            return
        if(spawn.memory.sources[source.id][STRUCTURE_CONTAINER + "Pos"]){
            const pos = spawn.memory.sources[source.id][STRUCTURE_CONTAINER + "Pos"]
            source.room.createConstructionSite(Math.floor(pos/50), pos%50, STRUCTURE_CONTAINER)
            return
        }
        if(creep.memory.miningPos || creep.memory.destination){
            const pos = creep.memory.miningPos || creep.memory.destination
            if(creep.pos.isEqualTo(new RoomPosition(pos.x, pos.y, pos.roomName))){
                spawn.memory.sources[source.id][STRUCTURE_CONTAINER + "Pos"] = creep.pos.x * 50 + creep.pos.y
                creep.pos.createConstructionSite(STRUCTURE_CONTAINER)
            }
        }
    },

    build: function (creep, source){
        const cSite = Game.getObjectById(creep.memory.construction)
        if(!cSite){
            creep.memory.construction = null
            return false
        }
        if(creep.store.getUsedCapacity() > creep.store.getCapacity()/2){
            creep.build(cSite)
        } else {
            creep.harvest(source)
        }
        return true
    },

    maybeMove: function(creep: Creep, source: Source){
        if(creep.memory.moveStatus == MoveStatus.STATIC){
            if(!source){
                creep.memory.destination = creep.memory.sourcePos
                return
            }
            if(!creep.memory.destination 
                || new RoomPosition(creep.memory.destination.x, creep.memory.destination.y, creep.memory.destination.roomName).isEqualTo(creep.memory.sourcePos.x, creep.memory.sourcePos.y))
                creep.memory.destination = rM.getDestination(creep, source)
            return
        }
        if(!source){
            motion.newMove(creep, new RoomPosition(creep.memory.sourcePos.x, creep.memory.sourcePos.y, creep.memory.sourcePos.roomName), 1)
            return
        }
        if(!creep.memory.miningPos){
            creep.memory.miningPos = rM.getDestination(creep, source)
            if(!creep.memory.miningPos)
                return
        }
        const miningPos = new RoomPosition(creep.memory.miningPos.x, creep.memory.miningPos.y, creep.memory.miningPos.roomName)
        if(!creep.pos.isEqualTo(miningPos))
            motion.newMove(creep, miningPos)
    },

    getLinkMiningPos: function(link, source){
        for(let i = link.pos.x - 1; i <= link.pos.x + 1; i++){
            for(let j = link.pos.y - 1; j <= link.pos.y + 1; j++){
                const testPos = new RoomPosition(i, j, link.pos.roomName)
                if(testPos.isNearTo(source) && !rM.isPositionBlockedMiner(testPos))
                    return testPos
            }
        }
        return null
    },

    getDestination: function(creep, source) {
        //look for links
        const link = rM.findStruct(creep, source, STRUCTURE_LINK)
        if(link){
            creep.memory.link = link.id
            return rM.getLinkMiningPos(link, source)
        }
        const linkSite = rM.findStruct(creep, source, STRUCTURE_LINK, true)
        if(linkSite){
            creep.memory.construction = linkSite.id
            return rM.getLinkMiningPos(linkSite, source)
        }
        //look for containers
        const container = rM.findStruct(creep, source, STRUCTURE_CONTAINER)
        if(container){
            creep.memory.container = container.id
            return container.pos
        }
        const containerSite = rM.findStruct(creep, source, STRUCTURE_CONTAINER, true)
        if(containerSite){
            creep.memory.construction = containerSite.id
            return containerSite.pos
        }
        //look for empty space to mine
        for(let i = source.pos.x - 1; i <= source.pos.x + 1; i++){
            for(let j = source.pos.y - 1;j <= source.pos.y + 1; j++){
                if(!rM.isPositionBlockedMiner(new RoomPosition(i, j, source.pos.roomName)))
                    return new RoomPosition(i, j, source.pos.roomName)
            }
        }
    },

    findStruct: function(creep: Creep, source: Source, structureType, construction = false){
        const type = construction ? LOOK_CONSTRUCTION_SITES : LOOK_STRUCTURES
        const memory = Game.spawns[creep.memory.city].memory
        if(!memory.sources[source.id])
            return null
        const structPos = memory.sources[source.id][structureType + "Pos"]
        if(structPos){
            const realPos = new RoomPosition(Math.floor(structPos/50), structPos%50, source.pos.roomName)
            const look = realPos.lookFor(type)
            const structure = _.find(look, struct => struct.structureType == structureType && (!(struct instanceof OwnedStructure) || struct.my))
            if(structure)
                return structure
        }
        return null
    },

    isPositionBlockedMiner: function(roomPos: RoomPosition){
        const look = roomPos.look()
        for(const lookObject of look){
            if((lookObject.type == LOOK_TERRAIN 
                && lookObject[LOOK_TERRAIN] == "wall")//no constant for wall atm
                || (lookObject.type == LOOK_STRUCTURES
                && OBSTACLE_OBJECT_TYPES[lookObject[LOOK_STRUCTURES].structureType])
                || (lookObject.type == LOOK_CREEPS
                    && (!lookObject[LOOK_CREEPS].my 
                        || (lookObject[LOOK_CREEPS].memory.role == cN.REMOTE_MINER_NAME) && lookObject[LOOK_CREEPS].ticksToLive > 100))) {
                return true
            }
        }
        return false
    },

    canCarry: function(creep){
        return creep.getActiveBodyparts(CARRY) > 0
    },

    harvestTarget: function(creep: Creep) {
        const source = Game.getObjectById(creep.memory.source)
        if(!creep.pos.inRangeTo(source, 2)){
            motion.newMove(creep, source.pos, 2)
            return
        }
        if (creep.body.length === 15 && creep.pos.isNearTo(source) && Game.time % 2 === 0) {
            return
        }

        if(a.harvest(creep, source) === 1 && !creep.memory.spawnBuffer){
            creep.memory.spawnBuffer = PathFinder.search(Game.spawns[creep.memory.city].pos, source.pos).cost
        }
    },

    /** pick a target id for creep **/
    nextSource: function(creep: Creep) {
        if(creep.memory.flag){
            const spawn = Game.spawns[creep.memory.city]
            roomU.initializeSources(spawn)
            creep.memory.source = creep.memory.flag as Id<Source>
            creep.memory.sourcePos = spawn.memory.sources[creep.memory.source]
            if(!creep.memory.sourcePos)
                creep.suicide()
        } else {
            creep.suicide()
        }
    }
}
export = rM
