var a = require("../lib/actions")
var sq = require("../lib/spawnQueue")
var motion = require("../lib/motion")
const u = require("../lib/utils")
const settings = require("../config/settings")

var rM = {
    name: "remoteMiner",
    type: "miner",

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.spawning){
            return
        }
        if(creep.ticksToLive == creep.memory.spawnBuffer + (creep.body.length * CREEP_SPAWN_TIME) && Game.spawns[creep.memory.city].memory.remoteMiner > 0) {
            sq.respawn(creep)
        }
        if(creep.hits < creep.hitsMax && creep.pos.roomName == Game.spawns[creep.memory.city].pos.roomName){
            Game.spawns[creep.memory.city].memory.towersActive = true
            motion.newMove(creep, Game.spawns[creep.memory.city].pos, 7)
            return
        }
        if(!creep.memory.source) {
            rM.nextSource(creep)
            return
        }
        const source = Game.getObjectById(creep.memory.source)
        rM.setMoveStatus(creep)
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
        }
        if(creep.memory.container){
            const container = Game.getObjectById(creep.memory.container)
            if(container){
                if(source.energy > 0 && container.store.getFreeCapacity() > 0 || creep.store.getFreeCapacity() > 0){
                    creep.harvest(source)
                } else if (container.hits < container.hitsMax * 0.9 && creep.store.getUsedCapacity()){
                    creep.repair(container)
                }
            } else {
                creep.memory.container = null
            }
        }
        if(source.energy > 0)
            creep.harvest(source)
        if(Game.time % settings.minerUpdateTime == 0){
            //update container/link status
            //if we have a link no need to search
            if(creep.memory.link && Game.getObjectById(creep.memory.link))
                return
            //get Destination assigns structures/sites anyway so might as well reuse
            rM.getDestination(creep, source)
            if(!creep.memory.link && !creep.memory.container && !creep.memory.construction)
                rM.placeContainer(creep, source)
        }
    },

    placeContainer: function(creep, source){
        const spawn = Game.spawns[creep.memory.city]
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
        if(creep.store.getUsedCapacity() && !creep.store.getFreeCapacity()){
            creep.build(cSite)
        } else {
            creep.harvest(source)
        }
        return true
    },

    maybeMove: function(creep, source){
        if(creep.memory.moveStatus == "static"){
            if(!source){
                creep.memory.destination = creep.memory.sourcePos
                return
            }
            if(!creep.memory.destination || creep.memory.destination == creep.memory.sourcePos)
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
                if(testPos.isNearTo(source) && !rM.isPositionBlocked(testPos))
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
                if(!rM.isPositionBlocked(new RoomPosition(i, j, source.pos.roomName)))
                    return new RoomPosition(i, j, source.pos.roomName)
            }
        }
    },

    findStruct: function(creep, source, structureType, construction = false){
        const type = construction ? LOOK_CONSTRUCTION_SITES : LOOK_STRUCTURES
        if(!source.room.controller || !source.room.controller.my)
            return null
        const memory = Game.spawns[creep.memory.city].memory
        const structPos = memory.sources[source.id][structureType + "Pos"]
        if(structPos){
            const realPos = new RoomPosition(Math.floor(structPos/50), structPos%50, source.pos.roomName)
            const look = realPos.lookFor(type)
            const structure = _.find(look, struct => struct.structureType == structureType && (!struct.owner || struct.my))
            if(structure)
                return structure
        }
        return null
    },

    isPositionBlocked: function(roomPos){
        const look = roomPos.look()
        for(const lookObject of look){
            if((lookObject.type == LOOK_TERRAIN 
                && lookObject[LOOK_TERRAIN] == "wall")//no constant for wall atm
                || (lookObject.type == LOOK_STRUCTURES
                && OBSTACLE_OBJECT_TYPES[lookObject[LOOK_STRUCTURES].structureType])) {
                return true
            }
        }
        return false
    },

    setMoveStatus: function(creep) {
        if(!creep.memory.moveStatus)
            creep.memory.moveStatus = creep.getActiveBodyparts(MOVE) ? "mobile" : "static"
    },

    canCarry: function(creep){
        return creep.getActiveBodyparts(CARRY) > 0
    },

    harvestTarget: function(creep) {
        var source = Game.getObjectById(creep.memory.source)
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
    nextSource: function(creep) {
        var city = creep.memory.city
        var miners = _.filter(u.splitCreepsByCity()[city], c => c.memory.role === rM.name 
            && c.ticksToLive > (c.memory.spawnBuffer || 50))
        var occupied = []
        _.each(miners, function(minerInfo){
            occupied.push(minerInfo.memory.source)
        })
        const sourceMap = Game.spawns[city].memory.sources || {}
        var sources = Object.keys(sourceMap)
        var openSources = _.filter(sources, Id => !occupied.includes(Id))
        
        if (openSources.length){
            creep.memory.source = openSources[0]
            creep.memory.sourcePos = Game.spawns[city].memory.sources[openSources[0]]
        }
    }
}
module.exports = rM
