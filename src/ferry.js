var actions = require('./actions')

var rF = {
    name: "ferry",
    type: "ferry",
    target: () => 0,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.saying == 'getJob'){
            creep.memory.target = rF.getJob(creep)
        }
        switch(creep.memory.target){
            case 0:
                //no jobs available
                //console.log('hi')
                if (Game.time % 10 === 0){
                    creep.say('getJob')
                }
                break
            case 1:
                //move energy from storage to terminal
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.terminal)
                } else if(creep.room.storage.store.energy > 150000 && creep.room.terminal.store.energy < 50000){
                    if (Game.time % 10 === 0 || Game.time % 10 === 1){
                        creep.memory.target = rF.getJob(creep)
                        break
                    }
                    actions.withdraw(creep, creep.room.storage, RESOURCE_ENERGY)
                } else {
                    creep.memory.target = rF.getJob(creep)
                }
                break
            case 2:
                //move minerals from storage to terminal
                if (_.sum(creep.carry) > 0){
                    actions.charge(creep, creep.room.terminal)
                    break
                }
                if(Object.keys(creep.room.storage.store).length > 1 && _.sum(creep.room.terminal.store) < 295000){
                    const mineral =_.keys(creep.room.storage.store)[1]
                    actions.withdraw(creep, creep.room.storage, mineral)
                } else {
                    creep.memory.target = rF.getJob(creep)
                }
                break
            case 3:
                //move energy from terminal to storage
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.storage)
                } else if(creep.room.terminal.store.energy > 51000){
                    actions.withdraw(creep, creep.room.terminal, RESOURCE_ENERGY)
                } else {
                    creep.memory.target = rF.getJob(creep)
                }
                break
            case 4: {
                //move power from terminal to power spawn
                const powerSpawn = _.find(Game.structures, (structure) => structure.structureType == STRUCTURE_POWER_SPAWN && structure.room.memory.city == creep.memory.city)
                if ((creep.carry.power) > 0){
                    actions.charge(creep, powerSpawn)
                    //creep.transfer(powerSpawn, 'power')
                } else if(powerSpawn.power < 30 && creep.room.terminal.store.power){
                    actions.withdraw(creep, creep.room.terminal, RESOURCE_POWER, Math.min(70, creep.room.terminal.store[RESOURCE_POWER]))
                } else {
                    creep.memory.target = rF.getJob(creep)
                }
                break
            } 
            case 5:
                //move energy from storage link to storage
                var link = Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink)
                if (creep.carry.energy > 0){
                    actions.charge(creep, creep.room.storage)
                } else if (link.energy > 0){
                    actions.withdraw(creep, link, RESOURCE_ENERGY)
                } else {
                    creep.say('getJob')
                }
                break
            case 6:
                //move mineral from terminal to lab
                if (_.sum(creep.carry) > 0){
                    const lab = Game.getObjectById(creep.memory.lab)
                    const result = actions.charge(creep, lab)
                    if(result == 1){
                        const lab0 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[0][0])
                        const lab1 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[1][0])
                        const lab2 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[2][0])
                        const lab3 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[3][0])
                        const lab4 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[4][0])
                        const lab5 = Game.getObjectById(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[5][0])
                        const total = lab0.mineralAmount + lab1.mineralAmount + (2 * (lab2.mineralAmount + lab3.mineralAmount + lab4.mineralAmount + lab5.mineralAmount))
                        if (total >= 5000 || lab.mineralAmount >= 2000){
                            Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[creep.memory.labNum][1] = 0
                        }
                        creep.say('getJob')
                    }
                    break
                }
                if (creep.room.terminal.store[creep.memory.mineral] > 0){
                    actions.withdraw(creep, creep.room.terminal, creep.memory.mineral)
                } else {
                    creep.say('getJob')
                }
                break
            case 7: {
                //move mineral from lab to terminal
                if (_.sum(creep.carry) > 0){
                    const result = actions.charge(creep, creep.room.terminal)
                    if (result == 1){
                        creep.say('getJob')
                        break
                    }
                    break
                }
                const lab = Game.getObjectById(creep.memory.lab)
                if(actions.withdraw(creep, lab, lab.mineralType) == 1){
                    Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[creep.memory.labNum][1] = 0
                }
                break
            }  
            case 8:
                //load up the nuker
                if (_.sum(creep.carry) > 0){
                    const nuker = Game.getObjectById(creep.memory.nuker)
                    const result = actions.charge(creep, nuker)
                    if(result == 1){
                        creep.say('getJob')
                    }
                    break
                }
                if (creep.room.terminal.store['G'] >= 4000){
                    actions.withdraw(creep, creep.room.terminal, RESOURCE_GHODIUM)
                } else {
                    creep.memory.target = rF.getJob(creep)
                }
                break
            case 9:
                //move mineral from terminal to booster
                if (_.sum(creep.carry) > 0){
                    const lab = Game.getObjectById(creep.memory.lab)
                    const result = actions.charge(creep, lab)
                    if(result == 1){
                        Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[creep.memory.labNum][1] = 0
                        creep.say('getJob')
                    }
                    break
                }
                if (creep.room.terminal.store[creep.memory.mineral] > 0){
                    actions.withdraw(creep, creep.room.terminal, creep.memory.mineral)
                } else {
                    creep.say('getJob')
                }
                break
            case 10: {
                //move mineral from booster to terminal
                if (_.sum(creep.carry) > 0){
                    const result = actions.charge(creep, creep.room.terminal)
                    if (result == 1){
                        creep.say('getJob')
                        break
                    }
                    break
                }
                const booster = Game.getObjectById(creep.memory.lab)
                if(actions.withdraw(creep, booster, booster.mineralType) == 1 && booster.mineralAmount <= 1000){
                    Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[creep.memory.labNum][1] = 0
                }
                break
            }
            case 11: {
                 //move produce from factory to terminal
                if (_.sum(creep.store) > 0){
                    const result = actions.charge(creep, creep.room.terminal)
                    if(result == 1){//successful deposit, remove element from task list
                        _.pullAt(Game.spawns[creep.memory.city].memory.ferryInfo.factoryInfo.transfer, creep.memory.labNum) //remove element
                        creep.say('getJob')
                    }
                    break
                }
                const factory = Game.getObjectById(creep.memory.lab)
                actions.withdraw(creep, factory, creep.memory.mineral, Math.min(creep.memory.quantity, creep.store.getCapacity())) 

                break
            }
            case 12:
                //move component from terminal to factory
                if (_.sum(creep.store) > 0){
                    const factory = Game.getObjectById(creep.memory.lab)
                    const result = creep.transfer(factory, creep.memory.mineral, creep.memory.quantity)
                    if (result == 0){
                        _.pullAt(Game.spawns[creep.memory.city].memory.ferryInfo.factoryInfo.transfer, creep.memory.labNum) //remove element
                        creep.say('getJob')
                        break
                    }
                    creep.moveTo(factory)
                    break
                }
                actions.withdraw(creep, creep.room.terminal, creep.memory.mineral, creep.memory.quantity)
                break
        }
     
    },
    
    getJob: function(creep){
        if (creep.ticksToLive < 50){
            creep.suicide()
            return 0
        }
        if (Game.spawns[creep.memory.city].memory.storageLink &&
            Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink).energy > 0)
        {
            return 5
        }
        if (creep.room.storage && creep.room.storage.store.energy > 150000 && creep.room.terminal.store.energy < 50000 && _.sum(creep.room.terminal.store) < 295000){
            return 1
        }
        if (creep.room.terminal && creep.room.terminal.store.energy > 51000){
            return 3
        }
        if(creep.room.storage && Object.keys(creep.room.storage.store).length > 1 && _.sum(creep.room.terminal.store) < 295000){
            return 2
        }
        if (Game.spawns[creep.memory.city].memory.ferryInfo.needPower === true && Game.spawns[creep.memory.city].room.terminal.store[RESOURCE_POWER] > 0){
            return 4
        }
        if(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo){
            for (let i = 0; i < 4; i++){
                if(Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[i][1] === 1 && creep.room.terminal.store[Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[i][2]] >= 1000){
                    creep.memory.lab = Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[i][0]
                    creep.memory.mineral = Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[i][2]
                    creep.memory.labNum = i
                    return 9
                } else if(Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[i][1] === 2) {
                    creep.memory.lab = Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[i][0]
                    creep.memory.mineral = Game.spawns[creep.memory.city].memory.ferryInfo.boosterInfo[i][2]
                    creep.memory.labNum = i
                    return 10
                }
            }
            for(let i = 2; i < 6; i++){
                if(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][1] == 1){
                    creep.memory.lab = Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][0]
                    creep.memory.labNum = i
                    return 7
                }
            }
            for (let i = 0; i < 2; i++){
                if(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][1] == 1 && creep.room.terminal.store[Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][2]] >= 1000){
                    creep.memory.lab = Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][0]
                    creep.memory.mineral = Game.spawns[creep.memory.city].memory.ferryInfo.labInfo[i][2]
                    creep.memory.labNum = i
                    return 6
                }
            }
        }
        if(Game.spawns[creep.memory.city].memory.ferryInfo.factoryInfo){
            const transfer = Game.spawns[creep.memory.city].memory.ferryInfo.factoryInfo.transfer
            if(transfer.length){
                for(let i = 0; i < transfer.length; i++){
                    if(transfer[i][1] === 0){//move produce from factory to terminal
                        creep.memory.mineral = transfer[i][0]
                        creep.memory.quantity = transfer[i][2]
                        creep.memory.labNum = i //use labNum as index
                        creep.memory.lab = _.find(creep.room.find(FIND_MY_STRUCTURES), structure => structure.structureType == STRUCTURE_FACTORY).id
                        return 11
                    }
                    if(transfer[i][1] === 1){//move component from terminal to factory OR request mineral if no mineral request
                        //if compenent that is needed is not in terminal, do not request, component will be delivered by empire manager
                        if(creep.room.terminal.store[transfer[i][0]] >= transfer[i][2]){ 
                            creep.memory.mineral = transfer[i][0]
                            creep.memory.quantity = transfer[i][2]
                            creep.memory.labNum = i
                            creep.memory.lab = _.find(creep.room.find(FIND_MY_STRUCTURES), structure => structure.structureType == STRUCTURE_FACTORY).id
                            return 12
                        }
                        if(_.includes(Object.keys(REACTIONS), transfer[i][0])){// must be a mineral of some sort
                            if(!Game.spawns[creep.memory.city].memory.ferryInfo.mineralRequest){
                                Game.spawns[creep.memory.city].memory.ferryInfo.mineralRequest = transfer[i][0]
                            }
                        }
                    }

                }
            }
        }
        const nuker = _.find(creep.room.find(FIND_MY_STRUCTURES), structure => structure.structureType == STRUCTURE_NUKER)
        if (nuker && nuker.ghodium < nuker.ghodiumCapacity && creep.room.terminal.store['G'] >= 4000){
            creep.memory.nuker = nuker.id
            return 8
        }
        return 0
    }
}
module.exports = rF