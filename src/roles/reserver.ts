import motion = require("../lib/motion")
import settings = require("../config/settings")
import { cN, BodyType } from "../lib/creepNames"
import u = require("../lib/utils")

const rRr = {
    name: cN.RESERVER_NAME,
    type: BodyType.reserver,
   
    run: function(creep: Creep) {
        const targetRoom = creep.memory.flag
        if (u.isCenterRoom(targetRoom)){
            rRr.claimReactor(creep, targetRoom)
        }
        if(Game.rooms[targetRoom]){
            if(Game.rooms[targetRoom].controller.pos.isNearTo(creep.pos)){
                if(Game.rooms[targetRoom].controller.reservation && Game.rooms[targetRoom].controller.reservation.username != settings.username){
                    creep.attackController(Game.rooms[targetRoom].controller)
                } else {
                    creep.reserveController(Game.rooms[targetRoom].controller)
                }
            } else{
                motion.newMove(creep, Game.rooms[targetRoom].controller.pos, 1)
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    },

    claimReactor: function(creep: Creep, targetRoom: string) {
        if (Game.rooms[targetRoom]) {
            // find reactor
            const reactor = _.find(Game.rooms[targetRoom].find(FIND_REACTORS)) as Structure
            if (reactor) {
                // move to reactor
                motion.newMove(creep, reactor.pos, 1)
                // claim reactor
                if (creep.pos.isNearTo(reactor.pos)) {
                    creep.claimReactor(reactor)
                }
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    }
}
export = rRr
