var a = require('actions');
var u = require('utils');

var rTr = {
    name: "trooper",
    type: "trooper",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        u.updateCheckpoints(creep);
        
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        let buildings = _.reject(creep.room.find(FIND_HOSTILE_STRUCTURES), structure => structure.structureType == STRUCTURE_CONTROLLER);
        let towers = _.filter(buildings, structure => structure.structureType === STRUCTURE_TOWER)
        let combo = hostiles.concat(buildings);
        let attack = 0
        for(let i = 0; i < combo.length; i++){
            if(combo[i].pos.isNearTo(creep.pos)){
                creep.rangedMassAttack();
                attack = 1
                break;
            }
        }
        let target = Game.getObjectById(creep.memory.target);
        if(!attack && target && target.pos.roomName === creep.pos.roomName && target.pos.inRangeTo(creep.pos, 3)) {
            creep.rangedAttack(target);
            attack = 1
        }
        if(!attack && hostiles.length){
            creep.memory.target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS).id
        }
        if (!creep.memory.medic){
            // undefined causes error, so using null
            creep.memory.medic = null
        }
        var medic = Game.getObjectById(creep.memory.medic);
        if (medic){
            // Wait for medic to get closer unless on the border
            if ((!creep.pos.isNearTo(medic.pos) && !(creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49)) || (medic.fatigue > 0)){
                return;
            }
        } else {
            //look for medics
            var allCreeps = u.splitCreepsByCity();
            let status = creep.memory.role.substring(0, 3);
            var medicSearch = 0
            if (status == 'big'){
                medicSearch = _.find(allCreeps[creep.memory.city], localCreep => localCreep.memory.role === 'bigMedic' &&
                    localCreep.pos.isNearTo(creep.pos) && localCreep.memory.breaker == creep.id);
            } else {
                medicSearch = _.find(allCreeps[creep.memory.city], localCreep => localCreep.memory.role === 'medic' &&
                    localCreep.pos.isNearTo(creep.pos) && localCreep.memory.breaker == creep.id);
            }
            if (medicSearch){
                creep.memory.medic = medicSearch.id;
            }
            return;
        }
        if(towers.length){
            console.log(towers)
            for(let i = 0; i < towers.length; i++){
                if(towers[i].energy > 9){
                    creep.memory.retreat = true;
                    return a.retreat(creep);
                }
            }
        }
        if(creep.hits < creep.hitsMax * 0.85){
            creep.memory.retreat = true
        }
        if(creep.memory.retreat) {
            return a.retreat(creep);
        }
        // Go to rally en route to target
        var rallyFlag = creep.memory.city + 'trooperRally'
        if (Game.flags[rallyFlag] && !creep.memory.rally){
            creep.moveTo(Game.flags[rallyFlag], {reusePath: 50})
            if (Game.flags[rallyFlag].pos.x == creep.pos.x && Game.flags[rallyFlag].pos.y == creep.pos.y && Game.flags[rallyFlag].pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return;
        }

        // If there is a 'defend' flag, move to the flag before attacking. 
        var city = creep.memory.city;
        var flagName = 'shoot'
        var status = creep.memory.role.substring(0, 3);
        if(status === 'big'){
            flagName = city + 'bigShoot'
        } else {
            flagName = city + 'shoot'
        }
        if(Game.flags[flagName]){
            if(creep.pos.roomName != Game.flags[flagName].pos.roomName){
                creep.moveTo(Game.flags[flagName].pos); 
                return;       
            }
        }

        
        if(target){
            creep.moveTo(target);
            return;
        }
        if (buildings.length){
            let spawns = _.filter(buildings, structure => structure.structureType == STRUCTURE_SPAWN)
            if(spawns.length){
                creep.moveTo(spawns[0])
                return;
            }
            creep.moveTo(buildings[0])
            return;
        }
    },
}
module.exports = rTr;