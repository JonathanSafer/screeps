var a = require('actions');
var t = require('types');
var u = require('utils');

var rA = {
    name: "attacker",
    type: "attacker",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        var city = creep.memory.city;
        var localRooms = u.splitRoomsByCity();
        //var enemies = localRooms[city].find(FIND_HOSTILE_CREEPS);
        let rooms = _.filter(localRooms[city], room => room.find(FIND_HOSTILE_CREEPS) != 0);
        //console.log(rooms)
        if (rooms.length){
            var enemies = rooms[0].find(FIND_HOSTILE_CREEPS);
            //console.log(enemies)
            if (enemies.length) {
                console.log(enemies);
                a.attack(creep, enemies[0]);
                creep.memory.location = enemies[0].room.name;
                return;
            }
        } else if(creep.memory.location){
            creep.moveTo(new RoomPosition(25, 25, creep.memory.location), {reusePath: 10});
        }
        /*var enemyStructures = creep.room.find(FIND_HOSTILE_STRUCTURES);
        var notWalls = _.reject(enemyStructures, structure => structure.structureType == STRUCTURE_WALL);
        var alsoNotController = _.reject(notWalls, structure => structure.structureType == STRUCTURE_CONTROLLER 
                                                        || structure.structureType == STRUCTURE_KEEPER_LAIR);
        if(alsoNotController.length) {
            a.attack(creep, alsoNotController[0]);
            return;
        }
             
        
        var neighbors = Object.values(Game.map.describeExits(creep.room.name));
        var interests = _.filter(neighbors, roomName => !rA.iOwn(roomName));
        var target = interests[0];
        var middle = new RoomPosition(25, 25, target);
        var result = creep.moveTo(middle);*/
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        return (room && room.controller && room.controller.my);
    }
};
module.exports = rA;