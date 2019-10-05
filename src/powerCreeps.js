var powerCreeps = {
    run103207: function() {
        const city = 'E21S280'
        const creep = Game.powerCreeps['103207']
        if(creep.spawnCooldownTime > Date.now()){
            return;
        }
        if(!(creep.spawnCooldownTime > Date.now()) && !creep.hits) {
            let structures = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
            let powerSpawn = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_SPAWN)
            creep.spawn(powerSpawn);
            creep.memory.powerSpawn = powerSpawn.id;
            return;
        }
        if (creep.room.controller && !creep.room.controller.isPowerEnabled){
            if (creep.enableRoom(creep.room.controller) === ERR_NOT_IN_RANGE){
                creep.moveTo(creep.room.controller, {reusePath: 15})
            }
            return;
        }
        if (creep.saying){
            let source = Game.getObjectById(Object.keys(Game.spawns[city].memory.sources)[creep.saying])
            if (creep.usePower(PWR_REGEN_SOURCE, source) === ERR_NOT_IN_RANGE){
                creep.moveTo(source, {reusePath: 15})
                creep.say(creep.saying)
            }
            return; 
        }
        if (creep.ticksToLive < 300){
            let powerSpawn = Game.getObjectById(creep.memory.powerSpawn)
            if (creep.renew(powerSpawn) === ERR_NOT_IN_RANGE){
                creep.moveTo(powerSpawn, {reusePath: 15})
            }
            return;
        }
        if (creep.powers[PWR_GENERATE_OPS].cooldown < 1 && _.sum(creep.carry) < creep.carryCapacity){
            creep.usePower(PWR_GENERATE_OPS);
        }
        let sources = Object.keys(Game.spawns[city].memory.sources)
        if (Game.time % 250 == 0){
            let source = Game.getObjectById(sources[0])
            if (creep.usePower(PWR_REGEN_SOURCE, source) === ERR_NOT_IN_RANGE){
                creep.moveTo(source, {reusePath: 15})
                creep.say(0)
            }
            return;
        }
        if (Game.time % 250 == 125){
            let source = Game.getObjectById(sources[1])
            if (creep.usePower(PWR_REGEN_SOURCE, source) === ERR_NOT_IN_RANGE){
                creep.moveTo(source, {reusePath: 15})
                creep.say(1)
            }
            return;
        } 


    },
    
    run138066: function() {
        const city = 'E11S90'
        const creep = Game.powerCreeps['138066']
        if(creep.spawnCooldownTime > Date.now()){
            return;
        }
        if(!(creep.spawnCooldownTime > Date.now()) && !creep.hits) {
            let structures = Game.spawns[city].room.find(FIND_MY_STRUCTURES)
            let powerSpawn = _.find(structures, structure => structure.structureType === STRUCTURE_POWER_SPAWN)
            creep.spawn(powerSpawn);
            creep.memory.powerSpawn = powerSpawn.id;
            return;
        }
        if(Game.flags[creep.name]){
            creep.moveTo(Game.flags[creep.name])
            if(creep.pos.isEqualTo(Game.flags[creep.name]).pos){
                Game.flags[creep.name].remove();
            }
        }
        if (creep.room.controller && !creep.room.controller.isPowerEnabled){
            if (creep.enableRoom(creep.room.controller) === ERR_NOT_IN_RANGE){
                creep.moveTo(creep.room.controller, {reusePath: 15})
            }
            return;
        }
        if (creep.saying){
            let source = Game.getObjectById(Object.keys(Game.spawns[city].memory.sources)[creep.saying])
            if (creep.usePower(PWR_REGEN_SOURCE, source) === ERR_NOT_IN_RANGE){
                creep.moveTo(source, {reusePath: 15})
                creep.say(creep.saying)
            }
            return; 
        }
        if (creep.ticksToLive < 300){
            let powerSpawn = Game.getObjectById(creep.memory.powerSpawn)
            if (creep.renew(powerSpawn) === ERR_NOT_IN_RANGE){
                creep.moveTo(powerSpawn, {reusePath: 15})
            }
            return;
        }
        if (creep.powers[PWR_GENERATE_OPS].cooldown < 1 && _.sum(creep.carry) < creep.carryCapacity){
            creep.usePower(PWR_GENERATE_OPS);
        }
        let sources = Object.keys(Game.spawns[city].memory.sources)
        if (Game.time % 250 == 0){
            let source = Game.getObjectById(sources[0])
            if (creep.usePower(PWR_REGEN_SOURCE, source) === ERR_NOT_IN_RANGE){
                creep.moveTo(source, {reusePath: 15})
                creep.say(0)
            }
            return;
        }
        if (Game.time % 250 == 125){
            let source = Game.getObjectById(sources[1])
            if (creep.usePower(PWR_REGEN_SOURCE, source) === ERR_NOT_IN_RANGE){
                creep.moveTo(source, {reusePath: 15})
                creep.say(1)
            }
            return;
        } 


    }
};
module.exports = powerCreeps;
