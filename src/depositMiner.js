var actions = require('actions');
var t = require('types');
var u = require('utils');

var rDM = {
    name: "depositMiner",
    type: "depositMiner",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (_.sum(creep.store) === 0 && creep.ticksToLive < 500){//if old and no store, suicide
            Game.notify("Deposit Miner completed job with " + creep.ticksToLive + " TTL, carrying: " + creep.store.getCapacity(), 1440)
            creep.suicide()
            return;
        }
        if(creep.memory.target === 0){
            if(_.sum(creep.store) === creep.store.getCapacity()){
                creep.memory.target = 1
            }
        }
        switch(creep.memory.target){
            case 0:
                //newly spawned or empty store
                let flagName = creep.memory.city + 'deposit';
                if(!Game.flags[flagName]){//if there is no flag, change city.memory.depositMiner to 0, and suicide
                    Game.spawns[creep.memory.city].memory.depositMiner = 0;
                    creep.suicide();
                    return;
                }
                if (Game.flags[flagName].pos.roomName !== creep.pos.roomName){//move to flag until it is visible
                    creep.moveTo(Game.flags[flagName], {reusePath: 50}, {range: 1, maxOps: 5000, swampCost: 8})
                    return;
                }
                let deposit = Game.flags[flagName].room.lookForAt(LOOK_DEPOSITS, Game.flags[flagName].pos);//if flag is visible, check for deposit, if no deposit, remove flag
                if(!deposit.length){
                    Game.flags[flagName].remove();
                    return;
                }
                if(_.sum(creep.store) === 0 && (deposit[0].lastCooldown > 25 && Game.cpu.bucket < 3000)){
                    Game.flags[flagName].remove();
                    return;
                }
                //move towards and mine deposit (actions.harvest)
                if(actions.harvest(creep, deposit[0]) === 1){
                    //record amount harvested
                    let works = 0;
                    for(var i = 0; i < creep.body.length; ++i){
                        if(creep.body[i].type == WORK){
                            works++;
                        }
                    }
                    if(!Game.spawns[creep.memory.city].memory.deposit){
                        Game.spawns[creep.memory.city].memory.deposit = 0;
                    }
                    Game.spawns[creep.memory.city].memory.deposit = Game.spawns[creep.memory.city].memory.deposit + works;
                }
                break;
            case 1:
                //store is full
                if(_.sum(creep.store) === 0){
                    creep.memory.target = 0;
                    return;
                }
                actions.charge(creep, Game.spawns[creep.memory.city].room.storage)

        }
    },

};
module.exports = rDM;