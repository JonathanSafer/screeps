var a = require('actions');
var u = require('utils');

var rD = {
    name: "defender",
    type: "defender",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.ticksToLive === 1490) {
            creep.notifyWhenAttacked(false);
        }
    	let target = Game.getObjectById(creep.memory.target);
    	if (target){
    		a.attack(creep, target);
    		return;
    	}
    	if (Game.time % 5 == 0){
    	    var city = creep.memory.city;
    	    var localRooms = u.splitRoomsByCity();
    	    let rooms = _.filter(localRooms[city], room => room.find(FIND_HOSTILE_CREEPS) != 0);
    	    if (rooms.length){
    	        var enemies = _.filter(rooms[0].find(FIND_HOSTILE_CREEPS), enemy => enemy.owner.username != 'TuN9aN0')
    	        if (enemies.length) {
    	            console.log(enemies);
    	            a.attack(creep, enemies[0]);
    	            creep.memory.target = enemies[0].id
    	            creep.memory.location = enemies[0].room.name;
    	            return;
    	        }
            }	
        }
        if (creep.memory.location && !(creep.room.name == creep.memory.location && creep.pos.x > 5 && creep.pos.y > 5 && creep.pos.x < 45 && creep.pos.y < 45)){
            creep.moveTo(new RoomPosition(25, 25, creep.memory.location), {reusePath: 10});
        }
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        return (room && room.controller && room.controller.my);
    }
};
module.exports = rD;