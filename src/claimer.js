const u = require("./utils")

var rC = {
    name: "claimer",
    type: "claimer",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        return rC.claimRally(creep, Game.flags.claimRally) ||
                rC.runClaimer(creep, Game.flags.claim, rC.claim)
    },

    claimRally: function(creep, flag) {
        if (!flag || creep.memory.rally) {
            return false
        }

        u.multiRoomMove(creep, flag.pos)
        if (flag.pos.x == creep.pos.x && flag.pos.y == creep.pos.y) {
            creep.memory.rally = true
        }
        return true
    },

    runClaimer: function(creep, flag, actionFn) {
        if (!flag) {
            return false
        }

        if (flag.pos.roomName != creep.pos.roomName) {
            u.multiRoomMove(creep, flag.pos)
        } else if (!creep.pos.isNearTo(creep.room.controller.pos)) {
            u.multiRoomMove(creep, creep.room.controller.pos)
        } else { 
            actionFn(creep)
        }
        return true
    },

    claim: function(creep) {
        var newCity = creep.room.name + "0"
        creep.signController(creep.room.controller, newCity)
        creep.room.memory.city = newCity
        creep.claimController(creep.room.controller)
    }    
}
module.exports = rC
