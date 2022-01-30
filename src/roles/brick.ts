import motion = require("../lib/motion")
import a = require("../lib/actions")
import cU = require("../lib/creepUtils")

var rBk = {
    name: cU.BRICK_NAME,
    type: "brick",
   
    run: function(creep: Creep) {
        const targetRoom = creep.memory.flag
        if(Game.rooms[targetRoom]){
            const hostileStructures = Game.rooms[targetRoom].find(FIND_HOSTILE_STRUCTURES)
            if(hostileStructures.length){
                a.attack(creep, hostileStructures[0])
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    }
}
export = rBk