var a = require('actions');
var t = require('types');
var u = require('utils');
//can only maintain 2 rooms max. Also only chooses from rooms directly adjacent to city. Does not rule out 'bad' rooms. Will cause errors if room does not have a controller
var rS = {
    name: "scout",
    type: "scout",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.memory.stakingOut) {
            a.reserve(creep, creep.room.controller);
            return;
        //if room assigned, go to that room and start staking it out
        } else if (creep.memory.roomAssigned){
    		//find the room based on name stored in memory, move to center of that room if unoccupied
    		var location = _.find(Game.rooms, room => room.name == creep.memory.roomAssigned)
    		if (location){
    		    if(location.controller){
        			a.reserve(creep, location.controller);
        			if (creep.memory.roomAssigned == creep.room.name){
        			    //console.log(creep.room);
        			    //console.log(creep.name)
        				creep.memory.stakingOut = true;
        				a.reserve(creep, creep.room.controller);
        			}
    		    } else {
    		        let badRooms = Game.spawns['Home'].memory.badRooms;
    		        let newRoom = creep.room.name;
    		        console.log(badRooms.push(newRoom));
    		        Game.spawns['Home'].memory.badRooms = badRooms;
    		        creep.suicide()
    		    }
			}
			else {
				creep.moveTo(new RoomPosition(25, 25, creep.memory.roomAssigned), {reusePath: 50});
			}
        } else {/*find a room to reinforce or do explorer stuff*/
        	var city = creep.memory.city;
        	var allRooms = u.splitRoomsByCity();
        	var reservedRooms = _.filter(allRooms[city], room => u.iReserved(room.name));
        	var allCreeps = u.splitCreepsByCity();
        	var localScouts = _.find(allRooms[city], room => rS.roomReservers(room.name, city) > 1);
        	//var scoutRooms = Object.values(localScouts[0]);
        	//currently only works for 2 or fewer remote rooms per city
        	var reinforceRooms = _.reject(reservedRooms, room => room == localScouts )
        	//console.log(localScouts);
        	//console.log(scoutRooms);
        	//console.log(doNotReinforceRooms);
        	//console.log(reservedRooms);
        	//console.log('reinforcing: ' + reinforceRooms);
        	if(reinforceRooms.length){
        		creep.memory.roomAssigned = reinforceRooms[0].name;
        		console.log('reinforcing: ' + reinforceRooms);
        	} else {
        		//explorer
        		let neighbors = Object.values(Game.map.describeExits(creep.room.name));
        		let interests = _.filter(neighbors, roomName => !u.iReservedOrOwn(roomName));
        		//console.log(interests)
        		let badRooms = Game.spawns['Home'].memory.badRooms;
        		let goodRooms = _.filter(interests, roomName => !badRooms.includes(roomName));
        		if (goodRooms.length){
        			creep.memory.roomAssigned = goodRooms[0];
        		} else {
        			console.log(city + ": scout can't find a room")
        		}

        	}



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