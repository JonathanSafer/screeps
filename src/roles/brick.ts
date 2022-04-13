import motion = require("../lib/motion")
import a = require("../lib/actions")
import { cN, BodyType } from "../lib/creepNames"

const rBk = {
    name: cN.BRICK_NAME,
    type: BodyType.brick,
   
    run: function(creep: Creep) {
        if(creep.memory.target){
            const target = Game.getObjectById(creep.memory.target)
            if(target){
                a.attack(creep, target)
                return
            } 
        }
        const targetRoom = creep.memory.flag
        if(Game.rooms[targetRoom]){
            const hostileStructures = Game.rooms[targetRoom].find(FIND_HOSTILE_STRUCTURES)
            if(hostileStructures.length){
                a.attack(creep, hostileStructures[0])
                creep.memory.target = hostileStructures[0].id
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    }
}
export = rBk