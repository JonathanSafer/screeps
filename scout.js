var a = require('actions');
var t = require('types');
var u = require('utils');

var rS = {
    name: "scout",
    type: t.scout,
    target: 0,
    limit: Game.spawns["Home"].memory['scout'],

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.memory.stakingOut) {
            a.reserve(creep, creep.room.controller);
            return;
        } else if (creep.room.controller && (!creep.room.controller.owner)) {
            var scouts = _.filter(creep.room.find(FIND_CREEPS), creep => creep.memory.role == "scout");
            if (scouts.length <= 2) {
                creep.memory.stakingOut = true;
                a.reserve(creep, creep.room.controller);
                return;
            }
        }
        
        var neighbors = Object.values(Game.map.describeExits(creep.room.name));
        var interests = _.filter(neighbors, roomName => !rS.iOwn(roomName));
        var target = interests[interests.length - 1];
        var middle = new RoomPosition(25, 25, target);
        var result = creep.moveTo(middle);
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        return (room && room.controller && room.controller.my);
    }
};
module.exports = rS;