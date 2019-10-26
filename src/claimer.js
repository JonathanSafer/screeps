var rC = {
    name: "claimer",
    type: "claimer",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (Game.flags.claimRally && !creep.memory.rally){
            creep.moveTo(Game.flags.claimRally, {reusePath: 50})
            if (Game.flags.claimRally.pos.x == creep.pos.x && Game.flags.claimRally.pos.y == creep.pos.y && Game.flags.claimRally.pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return;
        }
        if(creep.memory.target == 1){//creep is an unclaimer
            //unclaimer stuff
            if(!Game.flags.unclaim){
                return;
            }
            if (Game.flags.unclaim.pos.roomName == creep.pos.roomName) {
                if (creep.pos.isNearTo(creep.room.controller.pos)) {
                    let result = creep.attackController(creep.room.controller);
                    if(result === OK){
                        Game.spawns[creep.memory.city].memory.claimer = 0;
                        creep.suicide();
                    }
                } else {
                    creep.moveTo(creep.room.controller.pos, {reusePath: 50})
                }
            } else {
                creep.moveTo(Game.flags.unclaim, {reusePath: 50});
            }
            return;
        }
        if(Game.flags.unclaim){
            //if unclaimer flag, become an unclaimer
            creep.memory.target = 1
            return;
        }
        if(!Memory.flags.claim){
            return;
        }
        if (Memory.flags.claim.pos.roomName == creep.pos.roomName) {
            if (creep.pos.isNearTo(creep.room.controller.pos)) {
                var newCity = creep.room.name + "0"
                creep.signController(creep.room.controller, newCity)
                creep.room.memory.city = newCity;
                creep.claimController(creep.room.controller);
            } else {
                creep.moveTo(creep.room.controller.pos, {reusePath: 50})
            }
        } else {
            creep.moveTo(Game.flags.claim, {reusePath: 50});
        }
    }
      
};
module.exports = rC;
