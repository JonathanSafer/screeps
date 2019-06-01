
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
        var localCreeps = u.splitCreepsByCity();
        var miners = _.filter(localCreeps[city], creep => creep.memory.role == 'remoteMiner')
        var drops = _.flatten(_.map(miners, miner => miner.room.find(FIND_DROPPED_RESOURCES)));
        // var allRooms = u.splitRoomsByCity();
        // var rooms = allRooms[city]
        // var drops = _.flatten(_.map(rooms, room => room.find(FIND_DROPPED_RESOURCES)));
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
    
    enemyOwned: function(room) {
        var hasController = room.controller;
        return hasController && room.controller.owner && room.controller.owner.username != "Yoner";
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
	    return _.groupBy(rooms, room => room.memory.city);
    },

    getAvailableSpawn: function(spawns) {
        validSpawns = _.filter(spawns, spawn => !spawn.spawning);
        if (validSpawns.length > 0) {
            return validSpawns[0];
        } else {
            return null;
        }
    },
    
    updateCheckpoints: function(creep) {
        if (Game.time % 50 == 0  && !u.enemyOwned(creep.room)) {
            if (creep.hits < creep.hitsMax) {
                return;
            }
            if (!creep.memory.checkpoints) {
                creep.memory.checkpoints = [];
            }
            creep.memory.checkpoints.push(creep.pos);
            if (creep.memory.checkpoints.length > 2) {
                creep.memory.checkpoints.shift();
            }
        }
    }
    
};

module.exports = u;