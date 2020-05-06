var a = require("../lib/actions")
var sq = require("../lib/spawnQueue")
const t = require("../config/types")

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
        if(creep.hits < creep.hitsMax){
            Game.spawns[creep.memory.city].memory.towersActive = true
            creep.moveTo(Game.spawns[creep.memory.city])
            return
        }
        if(!creep.memory.source) {
            rM.nextSource(creep)
        } else if (!Game.getObjectById(creep.memory.source)){
            creep.moveTo(new RoomPosition(25, 25, creep.memory.sourceRoom), {reusePath: 50}) 
        } else {
            if (creep.saying != "*"){
                rM.harvestTarget(creep)
            }
            if (Game.time % 50 === 0 && !creep.memory.link && rM.canCarry(creep)) {
                //find link
                var source = Game.getObjectById(creep.memory.source)
                var structures = source.pos.findInRange(FIND_MY_STRUCTURES, 2)
                const links = _.filter(structures, structure => structure.structureType === STRUCTURE_LINK && structure.pos.inRangeTo(source.pos, 3))
                //Log.info(link)
                if (links.length > 1){
                    creep.memory.link = source.pos.findClosestByRange(links).id
                } else if(links.length){
                    creep.memory.link = links[0].id
                }
            }
            if (creep.memory.link){
                if (creep.store.energy == creep.store.getCapacity()){
                    const link = Game.getObjectById(creep.memory.link)
                    a.charge(creep, link)
                    if (link && link.energy >= link.energyCapacity * .5){
                        creep.say("*", true)
                    }
                }
            }
        }
    },

    canCarry: function(creep) {
        return creep.getActiveBodyparts(CARRY) > 0
    },

    harvestTarget: function(creep) {
        var source = Game.getObjectById(creep.memory.source)
        if (creep.body.length === 15 && creep.pos.isNearTo(source) && Game.time % 2 === 0) {
            return
        }

        if(a.harvest(creep, source) === 1 && !creep.memory.spawnBuffer){
            creep.memory.spawnBuffer = Game.spawns[creep.memory.city].pos.getRangeTo(source)
        }
    },

    /** pick a target id for creep **/
    nextSource: function(creep) {
        var city = creep.memory.city
        var miners = _.filter(Game.spawns[city].room.find(FIND_MY_CREEPS), c => c.memory.role === rM.name && c.ticksToLive > 50)
        var occupied = []
        _.each(miners, function(minerInfo){
            occupied.push(minerInfo.memory.source)
        })
        const sourceMap = Game.spawns[city].memory.sources || {}
        var sources = Object.keys(sourceMap)
        var openSources = _.filter(sources, Id => !occupied.includes(Id))
        
        if (openSources.length){
            creep.memory.source = openSources[0]
            creep.memory.sourceRoom = Game.spawns[city].memory.sources[openSources[0]].roomName
        }
    }
}
module.exports = rM
