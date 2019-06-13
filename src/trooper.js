var a = require('actions');
var u = require('utils');

var rTr = {
    name: "trooper",
    type: "trooper",
    target: () => 0,
   

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.ticksToLive === 1490) {
            creep.notifyWhenAttacked(false);
        }
        u.updateCheckpoints(creep);
        creep.notifyWhenAttacked(false)
        
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        let buildings = _.reject(creep.room.find(FIND_HOSTILE_STRUCTURES), structure => structure.structureType == STRUCTURE_CONTROLLER);
        let target = Game.getObjectById(creep.memory.target);

        rTr.rangedAttack(creep, hostiles, buildings, target)
        if (!rTr.meetMedic(creep)) return
        if (rTr.avoidTowers(creep, buildings)) return
        if (rTr.maybeRetreat(creep)) return
        if (rTr.maybeRally(creep)) return
        if (rTr.maybeShoot(creep)) return
        if(target) return creep.moveTo(target)

        rTr.destroyBuildings(creep, buildings)
    },

    rangedAttack: function(creep, hostiles, buildings, target) {
        let combo = hostiles.concat(buildings);
        let attack = 0
        for(let i = 0; i < combo.length; i++){
            if(combo[i].pos.isNearTo(creep.pos)){
                creep.rangedMassAttack();
                attack = 1
                break;
            }
        }

        if(!attack && target && target.pos.roomName === creep.pos.roomName && target.pos.inRangeTo(creep.pos, 3)) {
            creep.rangedAttack(target);
            attack = 1
        }
        if(!attack && hostiles.length){
            creep.memory.target = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS).id
        }
    },

    meetMedic: function(creep) {
        let allCreeps = u.splitCreepsByCity();

        // Don't bother if some trooper already has the medic
        let otherTrooperWithMedic = _.find(allCreeps[creep.memory.city], localCreep => localCreep.memory.role === 'trooper' &&
                localCreep.memory.medic && localCreep.name !== creep.name)
        if (otherTrooperWithMedic) return true

        if (!creep.memory.medic){
            // undefined causes error, so using null
            creep.memory.medic = null
        }
        var medic = Game.getObjectById(creep.memory.medic);
        if (medic){
            //set tolerance
            if(!creep.memory.tolerance){
                let tolerance = 0;
                for(var i = 0; i < medic.body.length; ++i){
                    if(medic.body[i].type == HEAL){
                        tolerance++;
                    }
                }
                if(medic.memory.role.substring(0, 3) === 'big'){
                    tolerance = (tolerance*12)
                }
                tolerance = (tolerance*12)
                creep.memory.tolerance = (tolerance * 0.8)
            }
            // Wait for medic to get closer unless on the border
            if ((!creep.pos.isNearTo(medic.pos) && !(creep.pos.x == 0 || creep.pos.x == 49 || creep.pos.y == 0 || creep.pos.y == 49)) || (medic.fatigue > 0)){
                return false
            }
        } else {
            //look for medics
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
            return false
        }
        return true
    },

    avoidTowers: function(creep, buildings) {
        let towers = _.filter(buildings, structure => structure.structureType === STRUCTURE_TOWER)
        if(towers.length){
            let damage = 0
            for(let i = 0; i < towers.length; i++){
                if(towers[i].energy >= TOWER_ENERGY_COST){
                    let distance = towers[i].pos.getRangeTo(creep.pos)
                    let damage_distance = _.max(TOWER_OPTIMAL_RANGE, _.min(distance, TOWER_FALLOFF_RANGE))
                    let steps = TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE
                    let step_size = TOWER_FALLOFF * TOWER_POWER_ATTACK / steps
                    damage += TOWER_POWER_ATTACK - (damage_distance - TOWER_OPTIMAL_RANGE) * step_size
                }
            }
            if(damage > creep.memory.tolerance){
                creep.memory.retreat = true;
                a.retreat(creep);
                return true
            }
        }
        return false
    },

    maybeRetreat: function(creep) {
        if(creep.hits < creep.hitsMax * 0.85){
            creep.memory.retreat = true
        }
        if(creep.memory.retreat) {
            a.retreat(creep)
            return true
        }
        return false
    },

    maybeRally: function(creep) {
        // Go to rally en route to target
        var rallyFlag = creep.memory.city + 'trooperRally'
        if (Game.flags[rallyFlag] && !creep.memory.rally){
            creep.moveTo(Game.flags[rallyFlag], {reusePath: 50})
            if (Game.flags[rallyFlag].pos.x == creep.pos.x && Game.flags[rallyFlag].pos.y == creep.pos.y && Game.flags[rallyFlag].pos.roomName == creep.pos.roomName){
                creep.memory.rally = true
            }
            return true
        }
        return false
    },

    maybeShoot: function(creep) {
        // If there is a 'shoot' flag, move to the flag before attacking. 
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
                return true      
            }
        }
        return false
    },

    destroyBuildings: function(creep, buildings) {
        if (buildings.length){
            let spawns = _.filter(buildings, structure => structure.structureType == STRUCTURE_SPAWN)
            if(spawns.length){
                creep.moveTo(spawns[0])
                return;
            }
            creep.moveTo(buildings[0])
            return;
        }
    }
}
module.exports = rTr;