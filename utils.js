
var u = {
    getWithdrawLocations: function(creep) {
        var city = creep.memory.city;
        var spawn = Game.spawns[city];
        var structures = spawn.room.find(FIND_STRUCTURES);
        return _.filter(structures, structure => structure.structureType == STRUCTURE_CONTAINER ||
                                                 structure.structureType == STRUCTURE_STORAGE);
    },
    
    getTransferLocations: function(creep) {
        var city = creep.memory.city;
        var spawn = Game.spawns[city];
        var structures = spawn.room.find(FIND_STRUCTURES);
        return _.filter(structures, structure => structure.structureType == STRUCTURE_STORAGE ||
        //mineral miner error when in use                                        structure.structureType == STRUCTURE_SPAWN ||
                                                structure.structureType == STRUCTURE_CONTAINER);
    },
    
    getNextLocation: function(current, locations) {
        return (current + 1) % locations.length;
    },
    
    getGoodPickups: function(creep) {
        var city = creep.memory.city;
        var allRooms = u.splitRoomsByCity();
        var rooms = allRooms[city]
        var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
        var goodLoads = _.filter(drops, drop => (drop.amount >= 0.5 * creep.carryCapacity) || (drop == !RESOURCE_ENERGY));
        //console.log(JSON.stringify(allRooms));
        return goodLoads;
    },
    
    iReservedOrOwn: function(roomName) {
        var room = Game.rooms[roomName];
        var hasController = room && room.controller;
        return hasController && (room.controller.my || ((room.controller.reservation) && (room.controller.reservation.username == "Yoner")));
    },
    
    iReserved: function(roomName) {
        var room = Game.rooms[roomName];
        var hasController = room && room.controller;
        return hasController && ((room.controller.reservation) && (room.controller.reservation.username == "Yoner"));
    },
    
    getDropTotals: function() {
        var rooms = Game.rooms;
        var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
        return _.sum(_.map(drops, drop => drop.amount));
    },
    
    //splitCreepsByCity
    splitCreepsByCity: function(){
	    var creeps = _.filter(Game.creeps, creep => creep.my)
	    return _.groupBy(creeps, creep => creep.memory.city);
    },
    
    //splitRoomsByCity
    splitRoomsByCity: function(){
	    var rooms = _.filter(Game.rooms, room => u.iReservedOrOwn(room.name))
	    //console.log(JSON.stringify(rooms));
	    return _.groupBy(rooms, room => room.controller.sign.text);
    },

    getAvailableSpawn: function(spawns) {
        validSpawns = _.filter(spawns, spawn => !spawn.spawning);
        if (validSpawns.length > 0) {
            return validSpawns[0];
        } else {
            return null;
        }
    }
    
};

module.exports = u;