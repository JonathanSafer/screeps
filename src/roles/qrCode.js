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
        const qrs = _.filter(localCreeps, c => c.memory.role == rQr.name)
        if(creep.memory.row === undefined){
            let freeRow = null
            for(let i = 0; i < template.qrCoords.length; i++){
                if(!_.find(qrs, c => c.memory.row == i && c.memory.target == 0)){
                    freeRow = i
                    break
                }
            }
            if(freeRow === null){
                const targetPos = new RoomPosition(Math.max(flag.x - 2,0), Math.max(flag.x - 2,0), flag.roomName)
                if(!creep.pos.isEqualTo(targetPos))
                    motion.newMove(creep, targetPos)
                return
            }
            creep.memory.row = freeRow
        }
        const row = creep.memory.row
        while(creep.memory.target < template.qrCoords[row].length - 1 
            && !_.find(qrs, c => c.memory.row == row && c.memory.target == creep.memory.target + 1)){
            creep.memory.target++
        }
        const target = template.qrCoords[row][creep.memory.target]
        const targetPos = new RoomPosition(target.x + flag.x, target.y + flag.y, flag.roomName)
        if(!creep.pos.isEqualTo(targetPos))
            motion.newMove(creep, targetPos)
    }
}
module.exports = rQr