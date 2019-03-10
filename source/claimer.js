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
        if (Game.flags.claim.pos.x == creep.pos.x && Game.flags.claim.pos.y == creep.pos.y && Game.flags.claim.pos.roomName == creep.pos.roomName) {
            //console.log(Game.flags.Flag.pos);
        	var newCity = 'sAmalia'
        	//console.log(newCity);
        	creep.signController(creep.room.controller, newCity)
        	creep.room.memory.city = newCity;
            creep.claimController(creep.room.controller);
        } else {
            //console.log(Game.flags.Flag2.pos.x == creep.pos.x && Game.flags.Flag2.pos.y == creep.pos.y && Game.flags.Flag2.pos.roomName == creep.pos.roomName);
            //console.log(creep.pos);
            //console.log(Game.flags.Flag);
        	creep.moveTo(Game.flags.claim, {reusePath: 50});
        }
    }
      
};
module.exports = rC;