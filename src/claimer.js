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

        rC.cheapMove(creep, flag);
        if (flag.pos.x == creep.pos.x && flag.pos.y == creep.pos.y) {
            creep.memory.rally = true
        }
        return true
    },

    runClaimer: function(creep, flag, actionFn) {
        if (flag.pos.roomName != creep.pos.roomName) {
            rC.cheapMove(creep, flag)
        } else if (!creep.pos.isNearTo(creep.room.controller.pos)) {
            rC.cheapMove(creep, creep.room.controller.pos)
        } else { 
            actionFn(creep)
        }
        return true
    },

    claim: function(creep) {
        var newCity = creep.room.name + "0"
        creep.signController(creep.room.controller, newCity)
        creep.room.memory.city = newCity;
        creep.claimController(creep.room.controller);
    },

    cheapMove: function(creep, target) {
        creep.moveTo(target, { reusePath: 50 })
    }      
};
module.exports = rC;
