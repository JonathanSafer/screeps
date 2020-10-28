const motion = require("../lib/motion")
const u = require("../lib/utils")
const template = require("../config/template")

const rQr = {
    name: "qrCode",
    type: "scout",
    target: 0,
   
    run: function(creep) {
        const flag = Memory.flags[creep.memory.flag]
        if(!flag)
            return
        const localCreeps = u.splitCreepsByCity()[creep.memory.city]
        while(creep.memory.target < template.qrCode.length - 2 
            && !_.find(localCreeps, c => c.memory.role == rQr.name 
                && c.memory.target == creep.memory.target + 1)){
            creep.memory.target++
        }
        const target = template.qrCode[creep.memory.target]
        const targetPos = new RoomPosition(target.x + flag.x, target.y + flag.y, flag.roomName)
        if(!creep.pos.isEqualTo(targetPos))
            motion.newMove(creep, targetPos)
    }
}
module.exports = rQr