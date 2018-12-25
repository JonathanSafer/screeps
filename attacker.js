var a = require('actions');
var t = require('types');
var u = require('utils');

var rS = {
    name: "attacker",
    type: t.attacker,
    target: 0,
    limit: 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.room.controller && (!creep.room.controller.owner || (creep.room.controller.owner == 'Yoner'))) {
            //a.reserve
            console.log(creep.room.controller);
            var reserving = a.reserve(creep, creep.room.controller);
            //var middle = new RoomPosition(25, 25, creep.room.name);
            //var result = creep.moveTo(middle);
            return; // stake out a new room
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
module.exports = rA;