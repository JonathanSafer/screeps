var a = require('actions');
var t = require('types');
var u = require('utils');

var rS = {
    name: "scout",
    type: "scout",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.memory.controllerId && Game.getObjectById(creep.memory.controllerId)) {
            //console.log(creep.reserveController(Game.getObjectById(creep.memory.controllerId)))
            var controller = Game.getObjectById(creep.memory.controllerId)
            a.reserve(creep, controller);
            //console.log(creep.moveTo(controller, {reusePath: 15}, {range: 1, maxOps: 5000}))
            if (Game.time % 100 === 0){
               rS.updateRoom(creep);
            }
            return;
        //if room assigned, go to that room and start staking it out
        } else if (creep.memory.roomAssigned){
    		//find the room based on name stored in memory, move to center of that room if unoccupied
    		var location = Game.rooms[creep.memory.roomAssigned];
    		if (location){
    		    if(location.controller){
        			a.reserve(creep, location.controller);
        			creep.memory.controllerId = location.controller.id;
    		    } else {
    		    	//put room on bad list
    		        Game.spawns['Home'].memory.badRooms.push(creep.memory.roomAssigned)
    		        creep.suicide()
    		    }
			} else {
				creep.moveTo(new RoomPosition(25, 25, creep.memory.roomAssigned), {reusePath: 50});
			}
        } else {/*find a room to reinforce or do explorer stuff*/
        	var city = creep.memory.city;
        	var remoteRooms = [];
        	if (Game.spawns[city].memory.remoteRooms){
        	    var remoteRooms = Object.keys(Game.spawns[city].memory.remoteRooms)
        	}
        	var scouts = _.filter(Game.creeps, creep => creep.memory.role === 'scout')
        	var occupied = []
        	_.each(scouts, function(scoutInfo){
        		occupied.push(scoutInfo.memory.roomAssigned)
        	})
        	var reinforceRooms = _.filter(remoteRooms, roomName => !occupied.includes(roomName));
        	if(reinforceRooms.length){
        		var rooms = _.sortBy(reinforceRooms, room => Game.spawns[city].memory.remoteRooms[room].reinforceTime);
        		creep.memory.roomAssigned = rooms[0];
        		creep.memory.controllerId = Game.spawns[city].memory.remoteRooms[rooms[0]].controllerId;
        		console.log('reinforcing: ' + rooms[0]);
        	} else {
        		//explorer
        		let neighbors = Object.values(Game.map.describeExits(creep.room.name));
        		let interests = _.filter(neighbors, roomName => !u.iReservedOrOwn(roomName));
        		//console.log(interests)
        		let badRooms = Game.spawns['Home'].memory.badRooms;
                if(!badRooms){
                    Game.spawns['Home'].memory.badRooms = [];
                }
        		let goodRooms = _.filter(interests, roomName => !badRooms.includes(roomName));
        		if (goodRooms.length){
        			creep.memory.roomAssigned = goodRooms[0];
        		} else {
        			console.log(city + ": scout can't find a room")
        		}
        	}
        }
    },
    
    updateRoom: function(creep) {
        var city = creep.memory.city;
    	if (creep.memory.roomAssigned === creep.room.name){
    	    if (Game.spawns[city].memory.remoteRooms){
                if (!([creep.memory.roomAssigned] in Game.spawns[city].memory.remoteRooms)){
                    var roomAssigned = creep.memory.roomAssigned;
                    Game.spawns[city].memory.remoteRooms[roomAssigned] = null;
                }
            } else {
                var roomAssigned = creep.memory.roomAssigned;
                Game.spawns[city].memory.remoteRooms = {};
            }
    		if (creep.room.controller.reservation && (creep.room.controller.reservation.ticksToEnd > 0)) {
    			//let reinforceTime = (Game.time + creep.room.controller.reservation.ticksToEnd - 1000);
    			Game.spawns[city].memory.remoteRooms[creep.memory.roomAssigned] = {
        			'roomName': creep.memory.roomAssigned,
        			'controllerId': creep.room.controller.id,
        			'reinforceTime': (Game.time + creep.room.controller.reservation.ticksToEnd - 1500)
        		}
    		} else {
        		Game.spawns[city].memory.remoteRooms[creep.memory.roomAssigned] = {
        			'roomName': creep.memory.roomAssigned,
        			'controllerId': creep.room.controller.id,
        			'reinforceTime': 0
        		}
    		}
    		//console.log((Game.time + creep.room.controller.reservation.ticksToEnd - 1000));
    		//console.log(JSON.stringify(Game.spawns[city].memory.remoteRooms[creep.room.name]));
    	}
    },
    
    roomReservers: function(roomName, city){
        var allCreeps = u.splitCreepsByCity();
        var result = _.filter(allCreeps[city], creep => (creep.memory.role == 'scout') && (creep.memory.roomAssigned == roomName)).length;
        return result;
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        var hasController = room && room.controller;
        return hasController && room.controller.my;
    },
    
};
module.exports = rS;