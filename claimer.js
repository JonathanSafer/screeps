var rC = {
    name: "claimer",
    type: "scout",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (Game.flags.Flag2.pos.x == creep.pos.x && Game.flags.Flag2.pos.y == creep.pos.y && Game.flags.Flag2.pos.roomName == creep.pos.roomName) {
            //console.log(Game.flags.Flag.pos);
            //console.log(creep.pos);
        	var newCity = 'Yonland Outer Territory'
        	creep.signController(creep.room.controller, newCity);
            creep.claimController(creep.room.controller);
        } else {
            //console.log(Game.flags.Flag2.pos.x == creep.pos.x && Game.flags.Flag2.pos.y == creep.pos.y && Game.flags.Flag2.pos.roomName == creep.pos.roomName);
            //console.log(creep.pos);
            //console.log(Game.flags.Flag);
        	creep.moveTo(Game.flags.Flag2, {reusePath: 50});
        }
    }
      
};
module.exports = rC;