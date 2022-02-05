import motion = require("../lib/motion")
import u = require("../lib/utils")
import cN = require("../lib/creepNames")

const rS = {
    name: cN.SCOUT_NAME,
    type: "scout",
   
    run: function(creep: Creep) {
        const targetRoom = Memory.creeps[creep.name].targetRoom
        if(!targetRoom || creep.room.name == targetRoom 
            || (Cache.roomData && Cache.roomData[targetRoom] && Cache.roomData[targetRoom].sct > Game.time))
            rS.getNextTarget(creep)
        if(Memory.creeps[creep.name].targetRoom)
            motion.newMove(creep, new RoomPosition(25, 25, Memory.creeps[creep.name].targetRoom), 24)
    },

    getNextTarget: function(creep){
        const rcache = u.getRoomCache(Game.spawns[creep.memory.city].pos.roomName)
        const targets = u.getsetd(rcache, "scannerTargets", [])
        if(targets.length){
            Memory.creeps[creep.name].targetRoom = targets.shift()
            return
        }
        creep.suicide()
    }
}
export = rS
