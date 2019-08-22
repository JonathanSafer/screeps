var rC = {
    name: "claimer",
    type: "claimer",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        for(var i = 0; i < 3; i++){
            let flag = "pit" + i
            if (Game.flags[flag] && !creep.memory[flag]){
                creep.moveTo(Game.flags[flag], {reusePath: 50})
                if (Game.flags[flag].pos.roomName == creep.pos.roomName && creep.pos.isNearTo(Game.flags[flag].pos)){
                    let pit = creep.room.lookForAt(LOOK_STRUCTURES, Game.flags[flag].pos);
                    if(pit[0] && pit[0].structureType == STRUCTURE_SPAWN){
                        let result = pit[0].renewCreep(creep);
                        console.log(result)
                        if (result == ERR_FULL){
                            creep.memory[flag] = true
                        }
                    }
                }
                return;
            }
        }
        if (Game.flags.claimRally && !creep.memory.rally){
            creep.moveTo(Game.flags.claimRally, {reusePath: 50})
            if (Game.flags.claimRally.pos.x == creep.pos.x && Game.flags.claimRally.pos.y == creep.pos.y && Game.flags.claimRally.pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return;
        }
        if(!Game.flags.claim){
            return;
        }
        if (Game.flags.claim.pos.roomName == creep.pos.roomName) {
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
