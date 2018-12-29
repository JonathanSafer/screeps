var a = require('actions');
var t = require('types');
var u = require('utils');

var rA = {
    name: "attacker",
    type: t.attacker,
    target: 0,
    limit: Game.spawns["Home"].memory['attacker'],
   

    /** @param {Creep} creep **/
    run: function(creep) {
        var enemies = creep.room.find(FIND_HOSTILE_CREEPS);
        if (enemies.length) {
            a.attack(creep, enemies[0]);
            return;
        }
        var enemyStructures = creep.room.find(FIND_HOSTILE_STRUCTURES);
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
        var result = creep.moveTo(middle);
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        return (room && room.controller && room.controller.my);
    }
};
module.exports = rA;