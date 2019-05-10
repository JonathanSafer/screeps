var actions = require('actions');
var t = require('types');
var u = require('utils');

var rF = {
    name: "ferry",
    type: "ferry",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.saying == '🔄'){
            creep.memory.target = rF.getJob(creep);
            return;
        }
        switch(creep.memory.target){
            case 0:
                //no jobs available
                //console.log('hi')
                if (Game.time % 10 === 0){
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 1:
                //move energy from storage to terminal
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.terminal);
                } else if(creep.room.storage.store.energy > 150000 && creep.room.terminal.store.energy < 150000){
                    if (Game.time % 10 === 0 || Game.time % 10 === 1){
                        creep.memory.target = rF.getJob(creep);
                        break;
                    }
                    actions.withdraw(creep, creep.room.storage, RESOURCE_ENERGY);
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 2:
                //move minerals from storage to terminal
                if (_.sum(creep.carry) > 0){
                    actions.charge(creep, creep.room.terminal);
                    break;
                }
                if(Object.keys(creep.room.storage.store).length > 1){
                    let mineral =_.keys(creep.room.storage.store)[1];
                    actions.withdraw(creep, creep.room.storage, mineral);
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 3:
                //move energy from terminal to storage
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.storage);
                } else if(creep.room.terminal.store.energy > 151000){
                    actions.withdraw(creep, creep.room.terminal, RESOURCE_ENERGY);
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 4:
                //move power from terminal to power spawn
                let powerSpawn = _.find(Game.structures, (structure) => structure.structureType == STRUCTURE_POWER_SPAWN && structure.room.memory.city == creep.memory.city)
                if ((creep.carry.power) > 0){
                    actions.charge(creep, powerSpawn)
                    //creep.transfer(powerSpawn, 'power')
                } else if(powerSpawn.power < 30 && creep.room.terminal.store.power){
                    actions.withdraw(creep, creep.room.terminal, RESOURCE_POWER, Math.min(70, creep.room.terminal.store[RESOURCE_POWER]));
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 5:
                //move energy from storage link to storage
                var link = Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink)
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.storage);
                } else if (link.energy > 0){
                    actions.withdraw(creep, link, RESOURCE_ENERGY);
                } else {
                    creep.memory.target = rF.getJob(creep);
                }
                break;
            case 6:
                //move mineral from terminal to lab
                if (_.sum(creep.carry) > 0){
                    let lab = Game.getObjectById(creep.memory.lab);
                    let result = actions.charge(creep, lab)
                    if(result == 1){
                        let lab0 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[0][0])
                        let lab1 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[1][0])
                        let lab2 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[2][0])
                        let lab3 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[3][0])
                        let lab4 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[4][0])
                        let lab5 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[5][0])
                        let total = lab0.mineralAmount + lab1.mineralAmount + (2 * (lab2.mineralAmount + lab3.mineralAmount + lab4.mineralAmount + lab5.mineralAmount))
                        if (total >= 5000 || lab.mineralAmount >= 2000){
                            Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[creep.memory.labNum][1] = 0
                        }
                        creep.say('🔄')
                        creep.memory.target = rF.getJob(creep);
                    }
                    break;
                }
                if (creep.room.terminal.store[creep.memory.mineral]){
                    actions.withdraw(creep, creep.room.terminal, creep.memory.mineral)
                } else {
                    creep.memory.target = rF.getJob(creep)
                }
                break;
            case 7:
                //move mineral from lab to terminal
                if (_.sum(creep.carry) > 0){
                    let result = actions.charge(creep, creep.room.terminal)
                    if (result == 1){
                        creep.memory.target = rF.getJob(creep)
                        break;
                    }
                    break;
                }
                let lab = Game.getObjectById(creep.memory.lab)
                if(actions.withdraw(creep, lab, lab.mineralType) == 1){
                    Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[creep.memory.labNum][1] = 0
                }
                break;
        }
     
    },
    
    getJob: function(creep){
        if (creep.ticksToLive < 50){
            creep.suicide()
            return 0;
        }
        if (Game.spawns[creep.memory.city].memory.storageLink && Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink).energy > 0){
            return 5;
        }
        if (creep.room.storage.store.energy > 150000 && creep.room.terminal.store.energy < 150000){
            return 1;
        }
        if (creep.room.terminal.store.energy > 151000){
            return 3;
        }
        if(Object.keys(creep.room.storage.store).length > 1){
            return 2;
        }
        if (Game.spawns[creep.memory.city].memory.ferryInfo.needPower === true && Game.spawns[creep.memory.city].room.terminal.store[RESOURCE_POWER] > 0){
            return 4;
        }
        if(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo){
            for (i = 0; i < 2; i++){
                if(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][1] == 1 && creep.room.terminal.store[Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][2]] >= 1000){
                    creep.memory.lab = Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][0]
                    creep.memory.mineral = Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][2]
                    creep.memory.labNum = i;
                    return 6;
                }
            }
            for(i = 2; i < 6; i++){
                if(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][1] == 1){
                    creep.memory.lab = Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][0]
                    creep.memory.labNum = i;
                    return 7;
                }
            }
        }
        return 0;
    }
};
module.exports = rF;