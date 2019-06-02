var T = {
    
defend: function(t) {
    var hostiles = t.room.find(FIND_HOSTILE_CREEPS);
    if(hostiles.length > 0) {
        t.attack(hostiles[0]);
    }
},
heal: function(tower) {
    targets = tower.room.find(FIND_MY_CREEPS, {filter: (injured) => { 
                                                return (injured) &&
                                                    injured.hits < injured.hitsMax;
                                                                 }
                                            }
                                
    );
    if (targets.length > 0){
        tower.heal(targets[0])
    }
},    
run: function(tower) {
    let locations = tower.room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure) &&
                            structure.hits < (structure.hitsMax * 0.1);
                    }
        });
    let notWalls = _.reject(locations, location => location.structureType == STRUCTURE_WALL);
    if(notWalls.length > 0) {tower.repair(notWalls[0])}
    }
}
module.exports = T;