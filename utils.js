
module.exports = {
    getWithdrawLocations: function(creep) {
        spawn = Game.spawns['Home'];
        var structures = spawn.room.find(FIND_STRUCTURES);
        return _.filter(structures, structure => structure.structureType == STRUCTURE_CONTAINER ||
                                                 structure.structureType == STRUCTURE_STORAGE);
    },
    
    getTransferLocations: function(creep) {
        spawn = Game.spawns['Home'];
        var structures = spawn.room.find(FIND_STRUCTURES);
        return _.filter(structures, structure => structure.structureType == STRUCTURE_CONTAINER ||
                                                 structure.structureType == STRUCTURE_STORAGE);
    },
    
    getNextLocation: function(current, locations) {
        return (current + 1) % locations.length;
    }
};