
var u = {
    getWithdrawLocations: function(creep) {
        var city = creep.memory.city;
        var spawn = Game.spawns[city];
        var structures = spawn.room.find(FIND_STRUCTURES);
        return _.filter(structures, structure => structure.structureType == STRUCTURE_CONTAINER ||
                                                 structure.structureType == STRUCTURE_STORAGE ||
                                                 structure.structureType == STRUCTURE_TERMINAL);
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

    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        var hasController = room && room.controller;
        return hasController && room.controller.my;
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

    getMyCities: function() {
        return _.filter(Game.rooms, (room) => u.iOwn(room.name));
    },

    getAvailableSpawn: function(spawns) {
        var validSpawns = _.filter(spawns, spawn => !spawn.spawning);
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
    },

    findMultiRoomPath: function(startPos, endPos) {
        return PathFinder.search(startPos, {pos: endPos, range: 1 }, {
            plainCost: 1,
            swampCost: 1,
            maxOps: 10000,
            maxRooms: 64,
            roomCallback: function(roomName) {
                const isHighway = u.isHighway(roomName)
                const nearStart = u.roomInRange(2, startPos.roomName, roomName)
                const nearEnd = u.roomInRange(2, endPos.roomName, roomName)

                if (!isHighway && !nearStart && !nearEnd) {
                    return false
                }

                const costs = new PathFinder.CostMatrix()
                return isHighway ? costs : _.map(costs, cost => cost * 3)
            }
        })
    },

    // E0,E10... W0, 10 ..., N0, N10 ...
    isHighway: function(roomName) {
        const coords = roomName.match(/[0-9]+/g)
        const x = Number(coords[0])
        const y = Number(coords[1])
        return (x % 10 == 0) || (y % 10 == 0)
    },

    getAllRoomsInRange: function(d, rooms) {
        const pos = _.map(rooms, u.roomNameToPos)
        const posXY = _.unzip(pos);
        const ranges = _.map(posXY, coords => _.range(_.min(coords) - d, _.max(coords) + 1 + d))
        const roomCoords = _.flatten(_.map(ranges[0], x => _.map(ranges[1], y => [x, y])))
        const roomNames = _.map(roomCoords, u.roomPosToName)
        return roomNames
    },

    roomInRange: function(range, roomName1, roomName2) {
        const pos1 = u.roomNameToPos(roomName1)
        const pos2 = u.roomNameToPos(roomName2)
        return (Math.abs(pos1[0] - pos2[0]) <= range) && (Math.abs(pos1[1] - pos2[1]) <= range)
    },

    roomNameToPos: function(roomName) {
        const quad = roomName.match(/[NSEW]/g)
        const coords = roomName.match(/[0-9]+/g)
        const x = Number(coords[0])
        const y = Number(coords[1])
        return [
            quad[0] === 'W' ? 0 - x : 1 + x,
            quad[1] === 'S' ? 0 - y : 1 + y
        ]
    },

    roomPosToName: function(roomPos) {
        const x = roomPos[0]
        const y = roomPos[1]
        return (x <= 0 ? "W" + String(-x) : "E" + String(x - 1)) +
            (y <= 0 ? "S" + String(-y) : "N" + String(y - 1))
    },
};

module.exports = u;