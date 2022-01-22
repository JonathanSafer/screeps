const motion = require("../lib/motion")
const a = require("../lib/actions")

var rBk = {
    name: "brick",
    type: "brick",
   
    run: function(creep) {
        const targetRoom = creep.memory.flag
        if(Game.rooms[targetRoom]){
            const hostileStructures = Game.rooms[targetRoom].find(FIND_HOSTILE_STRUCTURES)
            if(hostileStructures.length){
                a.attack(hostileStructures[0])
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    }
}
module.exports = rBk