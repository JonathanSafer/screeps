const motion = require("../lib/motion")
const u = require("../lib/utils")

var rS = {
    name: "scout",
    type: "scout",
   
    run: function(creep) {
        const targetRoom = Memory.creeps[creep.name].targetRoom
        if(!targetRoom || creep.room.name == targetRoom 
            || (Cache.RoomData && Cache.roomdata[targetRoom] && Cache.roomdata[targetRoom].scoutTime > Game.time))
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
module.exports = rS
