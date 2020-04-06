var a = require("./actions")
var u = require("./utils")
var rH = require("./harasser")
var CreepState = {
    START: 1,
    BOOST: 2,
    ENGAGE: 3,
    DORMANT: 4,
}
var CS = CreepState

var rD = {
    name: "defender",
    type: "defender",
    target: () => 0,
   


    /** @param {Creep} creep **/
    run: function(creep) {//modified harasser
        const city = creep.memory.city
        if(Game.spawns[city].room.controller.level == 8){
            //rcl8 runs new experimental defender
            //creep is mostly RA, with a tiny bit of heal.
            //boosted variant has one tough part as well
            //defenders only made during defcon 2, # of defenders made based on number of enemies
            if (!creep.memory.state) {
                creep.memory.state = CS.START
            }
            let hostiles = []
            if(creep.memory.state != CS.DORMANT){
                hostiles = creep.room.find(FIND_HOSTILE_CREEPS)
            }
            switch (creep.memory.state) {
            case CS.START:
                rD.init(creep)
                break
            case CS.BOOST:
                rD.boost(creep)
                break
            case CS.ENGAGE:
                if(!rH.maybeRetreat(creep, hostiles) && hostiles.length && creep.pos.inRangeTo(Game.spawns[city], 11)){
                    rH.aMove(creep, hostiles)
                }
                break
            case CS.DORMANT:
                rD.dormant(creep)
                return
            }
            rH.shoot(creep, hostiles)
            rH.maybeHeal(creep, hostiles)
            if(!hostiles.length && creep.hits == creep.hitsMax){
                creep.say("sleep")
                if(creep.saying == "sleep"){
                    creep.moveTo(Game.spawns[creep.memory.city].room.controller, {range: 2})
                }
                if(creep.pos.inRangeTo(Game.spawns[creep.memory.city].room.controller, 2)){
                    creep.memory.state = CS.DORMANT
                }
            }
            return
        }

        const target = Game.getObjectById(creep.memory.target)
        if (target){
            a.attack(creep, target)
            return
        }
        if (Game.time % 5 == 0){
            var localRooms = u.splitRoomsByCity()
            const rooms = _.filter(localRooms[city], room => room.find(FIND_HOSTILE_CREEPS) != 0)
            if (rooms.length){
                var enemies = _.filter(rooms[0].find(FIND_HOSTILE_CREEPS), enemy => enemy.owner.username != "TuN9aN0")
                if (enemies.length) {
                    a.attack(creep, enemies[0])
                    creep.memory.target = enemies[0].id
                    creep.memory.location = enemies[0].room.name
                    return
                }
            }
        }
        if (creep.memory.location && !(creep.room.name == creep.memory.location && creep.pos.x > 5 && creep.pos.y > 5 && creep.pos.x < 45 && creep.pos.y < 45)){
            creep.moveTo(new RoomPosition(25, 25, creep.memory.location), {reusePath: 10})
        }
    },

    init: function(creep){//same init as harasser for now
        if(!creep.memory.target){
            creep.memory.target = null
        }
        if(!creep.memory.anger){//the more angry the creep gets, the more aggressive it'll get
            creep.memory.anger = 0//anger increases when hostiles run away, and decreases when hostiles give chase (see rH.aMove)
        }
        creep.memory.state = CS.BOOST
    },

    boost: function(creep){
        if(creep.memory.boosted){
            creep.memory.state = CS.ENGAGE
            return
        }
        a.getBoosted(creep)
        return
        //get boosted, may get boosted using same method as offensive creeps
    },

    engage: function(creep){
        return creep
        //TODO
        //attack designated weak target, or nearest target if no designation
    },

    dormant: function(creep){
        if(Game.spawns[creep.memory.city].memory.towersActive){
            creep.memory.state = CS.ENGAGE
        }
        return creep
        //if in a safe space, hibernate until towers active
    },

    iOwn: function(roomName) {
        var room = Game.rooms[roomName]
        return (room && room.controller && room.controller.my)
    }
}
module.exports = rD