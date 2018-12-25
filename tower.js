var T = {
    
defend: function(t) {
    var hostiles = t.room.find(FIND_HOSTILE_CREEPS);
    if(hostiles.length > 0) {
       // var username = hostiles[0].owner.username;
       // Game.notify(`User ${username} spotted in room ${roomName}`);
        t.attack(hostiles[0]);
    }
},
    
run: function(tower) {
    locations = tower.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure) &&
                            structure.hits < structure.hitsMax;
                    }
        });
    if(locations.length > 0) {tower.repair(locations[0])}
    }
}
module.exports = T;