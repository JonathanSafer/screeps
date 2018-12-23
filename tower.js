var T = {
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