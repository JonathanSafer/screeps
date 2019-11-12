var a = require("actions")

var rSB = {
    name: "spawnBuilder",
    type: "spawnBuilder",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        var city = creep.memory.city;
        if (creep.hits < creep.hitsMax){
            creep.moveTo(Game.spawns[city])
            return;
        }
        if (Game.flags.claimRally && !creep.memory.rally){
            creep.moveTo(Game.flags.claimRally, {reusePath: 50})
            if (Game.flags.claimRally.pos.x == creep.pos.x && Game.flags.claimRally.pos.y == creep.pos.y && Game.flags.claimRally.pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return;
        }
        if(!Game.flags.claim){
            return;
        }
        if(creep.pos.roomName === Game.flags.claim.pos.roomName){
            if(Game.time % 100 == 0){
                let extensions = _.filter(creep.room.find(FIND_MY_STRUCTURES), structure => structure.structureType == STRUCTURE_EXTENSION)
                let cSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
                if (extensions.length > 4 && !cSites.length){
                    Game.flags.claim.remove();
                }
            }
            if(creep.carry.energy == 0 && creep.memory.building){
                creep.memory.building = false;
            }
            if(creep.carry.energy == creep.carryCapacity && !creep.memory.building) {
                creep.memory.building = true;
            }
            if (creep.memory.building){
                rSB.build(creep)
            } else {
                rSB.harvest(creep)
            }
        } else {
            let pos = Game.flags.claim.pos
            creep.moveTo(new RoomPosition(pos.x, pos.y, pos.roomName), {reusePath: 50});
        }
    },
    
    build: function(creep) {
        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        var spawns = _.filter(targets, site => site.structureType == STRUCTURE_SPAWN);
        if(targets.length) {
            var target = targets[0];
            if (spawns.length){
                target = spawns[0];
            }
            if(creep.build(target) == ERR_NOT_IN_RANGE) {
                creep.moveTo(target, {reusePath: 15});
            }
        } else {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {reusePath: 15});  
            }
        }   
    },
    
    harvest: function(creep) {
        var sources =  creep.room.find(FIND_SOURCES);
        if (sources.length == 1){
            let result = creep.harvest(sources[0]);
            if(result == ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], {reusePath: 15});
            }
            return;
        }
        let result = creep.harvest(sources[creep.memory.target]);
        if(result == ERR_NOT_IN_RANGE) {
            if(creep.moveTo(sources[creep.memory.target], {reusePath: 15}) == ERR_NO_PATH){
                creep.memory.target = (creep.memory.target + 1) % 2;
            }
        } else if (result == ERR_NOT_ENOUGH_RESOURCES){
            creep.memory.target = (creep.memory.target + 1) % 2;
        }
    }
};
module.exports = rSB;
