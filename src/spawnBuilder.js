var a = require('./actions')
var sq = require('./spawnQueue')
var rU = require('./upgrader')
var s = require('./settings')

var rSB = {
    name: "spawnBuilder",
    type: "spawnBuilder",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        // Use the spawn queue to set respawn
        if(creep.ticksToLive == 500 && Game.flags.claim) {
            sq.respawn(creep)
        }

        if (Game.cpu.bucket < s.bucket.colony) {
            return
        }

        var city = creep.memory.city;
        if(!creep.memory.state){
          creep.memory.state = 0
        }
        const boost = 'XLH2O'
        rU.checkBoost(creep, city, boost);
        rU.getBoosted(creep, city, boost);

        if(creep.memory.state != 2) {
            return
        }

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
            if(Game.time % 100 == 0 && rSB.jobDone(creep)){
                Game.flags.claim.remove();
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
            const pos = Game.flags.claim.pos
            creep.moveTo(new RoomPosition(pos.x, pos.y, pos.roomName), {reusePath: 50});
        }
    },

    jobDone: function(creep) {
        const extensions = _.filter(creep.room.find(FIND_MY_STRUCTURES), structure => structure.structureType == STRUCTURE_EXTENSION)
        const cSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES)
        return (extensions.length > 4 && !cSites.length)
    },
    
    build: function(creep) {
        var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
        var spawns = _.find(targets, site => site.structureType == STRUCTURE_SPAWN);
        var extensions = _.find(targets, site => site.structureType == STRUCTURE_EXTENSION);
        var storage = _.find(targets, site => site.structureType == STRUCTURE_STORAGE);
        var terminal = _.find(targets, site => site.structureType == STRUCTURE_TERMINAL);
        if(targets.length) {
            var target = targets[0];
            if (terminal){
                target = terminal
            } else if (storage){
                target = storage
            } else if (extensions){
                target = extensions
            } else if (spawns){
                target = spawns
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
        const terminal = _.find(creep.room.find(FIND_MY_STRUCTURES), s => s.structureType == STRUCTURE_TERMINAL)
        if(terminal && terminal.store[RESOURCE_ENERGY] >= creep.store.getCapacity()){
            a.withdraw(creep, terminal, RESOURCE_ENERGY)
            return
        }
        var sources =  creep.room.find(FIND_SOURCES);
        if (sources.length == 1){
            const result = creep.harvest(sources[0]);
            if(result == ERR_NOT_IN_RANGE) {
                creep.moveTo(sources[0], {reusePath: 15});
            }
            return;
        }
        const result = creep.harvest(sources[creep.memory.target]);
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
