
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
        return _.filter(structures, structure => structure.structureType == STRUCTURE_STORAGE);
    },
    
    getNextLocation: function(current, locations) {
        return (current + 1) % locations.length;
    },
    
    getGoodPickups: function(creep) {
        var rooms = Game.rooms;
        var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
        var goodLoads = _.filter(drops, drop => drop.amount >= 0.5 * creep.carryCapacity);
        return goodLoads;
    },
    
    getDropTotals: function() {
        var rooms = Game.rooms;
        var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
        return _.sum(_.map(drops, drop => drop.amount));
    }
};