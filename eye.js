var a = require('actions');
var t = require('types');
var u = require('utils');
var rS = require('scout');

var rE = {
    name: "eye",
    type: "eye",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.room.name == 'W46N42'){
            var neighbors = Object.values(Game.map.describeExits(creep.room.name));
            var bestInterests = _.filter(neighbors, roomName => !rS.iReservedOrOwn(roomName));
            var interests = _.filter(neighbors, roomName => !rS.iReservedOrOwn(roomName));
            var target = bestInterests.length ? bestInterests[0] : interests[0];
            var middle = new RoomPosition(25, 25, target);
            var result = creep.moveTo(middle);
        } else if (creep.room.name == 'W45N42'){
            var neighbors = Object.values(Game.map.describeExits(creep.room.name));
            var bestInterests = _.filter(neighbors, roomName => !rS.iReservedOrOwn(roomName));
            var interests = _.filter(neighbors, roomName => !rS.iReservedOrOwn(roomName));
            var target = bestInterests.length ? bestInterests[1] : interests[1];
            var middle = new RoomPosition(25, 25, target);
            var result = creep.moveTo(middle)
        } else if (creep.room.name == 'W44N42'){
            var result = creep.moveTo(25,25);
        }
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        var hasController = room && room.controller;
        return hasController && room.controller.my;
    },
    
    iReservedOrOwn: function(roomName) {
        var room = Game.rooms[roomName];
        var hasController = room && room.controller;
        return hasController && (room.controller.my || (room.controller.reservation == "Yoner"));
    }
};
module.exports = rE;