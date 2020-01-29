var a = require('actions');
var u = require('utils');
var CreepState = {
    START: 1,
    BOOST: 2,
    ENGAGE: 3,
    RETREAT: 4,
    DORMANT: 5,
};
var CS = CreepState;

var rD = {
    name: "defender",
    type: "defender",
    target: () => 0,
   


    /** @param {Creep} creep **/
    run: function(creep) {//
        const city = creep.memory.city
        if(Game.spawns[city].room.controller.level == 8){
            //rcl8 runs new experimental defender
            //creep is mostly RA, with a tiny bit of heal.
            //boosted variant has one tough part as well
            //defenders only made during defcon 2, # of defenders made based on number of enemies
            if (!creep.memory.state) {
                creep.memory.state = CS.START
            }
            switch (creep.memory.state) {
                case CS.START:
                    rD.init(creep)
                    break
                case CS.BOOST:
                    rD.boost(creep)
                    break
                case CS.ENGAGE:
                    rD.engage(creep)
                    break
                case CS.RETREAT:
                    rD.retreat(creep)
                    break
                case CS.DORMANT:
                    rD.dormant(creep)
                    break
            }

        }



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

    init: function(creep){
        //initialization
    },

    boost: function(creep){
        //get boosted, may get boosted using same method as offensive creeps
    },

    engage: function(creep){
        //attack designated weak target, or nearest target if no designation
    },

    retreat: function(creep){
        //move towards spawn
    },

    dormant: function(creep){
        //if in a safe space, hibernate until towers active
    },
    
    iOwn: function(roomName) {
        var room = Game.rooms[roomName];
        return (room && room.controller && room.controller.my);
    }
};
module.exports = rD;