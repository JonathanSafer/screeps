const motion = require("../lib/motion")
const u = require("../lib/utils")

var rS = {
    name: "scout",
    type: "scout",
   
    run: function(creep) {
        if(!Memory.creeps[creep.name].targetRoom || creep.room.name == Memory.creeps[creep.name].targetRoom){
            rS.getNextTarget(creep)
        }
        motion.newMove(creep, new RoomPosition(25, 25, creep.memory.targetRoom), 24)
        return

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
