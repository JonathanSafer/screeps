const motion = require("../lib/motion")

var rRr = {
    name: "reserver",
    type: "reserver",
   
    run: function(creep) {
        const targetRoom = creep.memory.flag
        if(Game.rooms[targetRoom]){
            if(Game.rooms[targetRoom].controller.pos.isNearTo(creep.pos)){
                creep.reserveController(Game.rooms[targetRoom].controller)
            } else{
                motion.newMove(creep, Game.rooms[targetRoom].controller, 1)
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    }
}
module.exports = rRr
