var a = require('actions');
var t = require('types');
var u = require('utils');

var rBr = {
    name: "breaker",
    type: t.lightMiner,
    target: 0,
    limit: 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.room.controller && creep.room.controller.owner && !creep.room.controller.my) {
            var structures = creep.room.find(FIND_STRUCTURES);
            var spawns = _.filter(structures, structure => structure.structureType == STRUCTURE_SPAWN);
            if(spawns.length) {
                a.dismantle(creep, spawns[0]);
            }
            return; // conquer the room
        }
        
        var neighbors = Object.values(Game.map.describeExits(creep.room.name));
        var interests = _.filter(neighbors, roomName => !rA.iOwn(roomName));
        var target = interests[0];
        var middle = new RoomPosition(25, 25, target);
        var result = creep.moveTo(middle);
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        return (room && room.controller && room.controller.my);
    }
};
module.exports = rBr;