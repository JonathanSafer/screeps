var actions = require("../lib/actions")

var rF = {
    name: "ferry",
    type: "ferry",
    target: 0,
    TERMINAL_MAX_MINERAL_AMOUNT: 9000,
    FERRY_CARRY_AMOUNT: 1000,

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.saying == "getJob"){
            creep.memory.target = rF.getJob(creep)
        }
        const link = Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink)
        switch(creep.memory.target){
        case 0:
            //no jobs available
            //Log.info('hi')
            if (Game.time % 10 === 0){
                creep.say("getJob")
            }
            break
        case 1:
            //move energy from storage to terminal
            if (creep.store.energy > 0){
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
            if (_.sum(creep.store) > 0){
                actions.charge(creep, creep.room.terminal)
                break
            }
            if(creep.room.storage.store[creep.memory.mineral] > 0 
                && creep.room.terminal.store[creep.memory.mineral] < rF.TERMINAL_MAX_MINERAL_AMOUNT - rF.FERRY_CARRY_AMOUNT
                && _.sum(creep.room.terminal.store) < 295000){
                actions.withdraw(creep, creep.room.storage, creep.memory.mineral)
            } else {
                creep.say("getJob")
            }
            break
        case 3:
            //move energy from terminal to storage
            if (creep.store.energy > 0){
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
            if ((creep.store.power) > 0){
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
            if (creep.store.energy > 0){
                actions.charge(creep, creep.room.storage)
            } else if (link.energy > 0){
                actions.withdraw(creep, link, RESOURCE_ENERGY)
            } else {
                creep.say("getJob")
            }
            break
        case 6:
            //move mineral from terminal to storage
            if (_.sum(creep.store) > 0){
                actions.charge(creep, creep.room.storage)
                break
            }
            if(creep.room.terminal.store[creep.memory.mineral] > rF.TERMINAL_MAX_MINERAL_AMOUNT){
                actions.withdraw(creep, creep.room.terminal, creep.memory.mineral)
            } else {
                creep.memory.target = rF.getJob(creep)
            }
            break
        case 7: {
            //move mineral from lab to terminal
            
            break
        }  
        case 8:
            //load up the nuker
            if (_.sum(creep.store) > 0){
                const nuker = Game.getObjectById(creep.memory.nuker)
                const result = actions.charge(creep, nuker)
                if(result == 1){
                    creep.say("getJob")
                }
                break
            }
            if (creep.room.terminal.store["G"] >= 4000){
                actions.withdraw(creep, creep.room.terminal, RESOURCE_GHODIUM)
            } else {
                creep.memory.target = rF.getJob(creep)
            }
            break
        case 9:{
            //move mineral from terminal to booster
            const lab = Game.getObjectById(creep.memory.lab)
            if (_.sum(creep.store) > 0){
                const result = actions.charge(creep, lab)
                if(result == 1){
                    if(creep.memory.reactor){
                        Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.reactors[creep.memory.lab].fill--
                    } else {
                        Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers[creep.memory.lab].fill--
                    }
                    creep.say("getJob")
                }
                break
            }
            const amountNeeded = Math.min(lab.store.getFreeCapacity(creep.memory.mineral), creep.store.getFreeCapacity())
            if (creep.room.terminal.store[creep.memory.mineral] >= amountNeeded){
                actions.withdraw(creep, creep.room.terminal, creep.memory.mineral, amountNeeded)
            } else {
                creep.say("getJob")
            }
            break
        }
        case 10: {
            //move mineral from booster to terminal
            if (_.sum(creep.store) > 0){
                const result = actions.charge(creep, creep.room.terminal)
                if (result == 1){
                    creep.say("getJob")
                    break
                }
                break
            }
            const lab = Game.getObjectById(creep.memory.lab)
            if(!lab.mineralType || actions.withdraw(creep, lab, lab.mineralType) == 1 && lab.store[lab.mineralType] <= 1000){
                const labInfo = Game.spawns[creep.memory.city].memory.ferryInfo.labInfo
                if(creep.memory.reactor && labInfo.reactors[creep.memory.lab].fill == -1){
                    labInfo.reactors[creep.memory.lab].fill = 0
                } else if (labInfo.receivers[creep.memory.lab].fill == -1){
                    Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers[creep.memory.lab].fill = 0
                }
            }
            if(!lab.mineralType){
                creep.say("getJob")
            }
            break
        }
        case 11: {
            //move produce from factory to terminal
            if (_.sum(creep.store) > 0){
                const result = actions.charge(creep, creep.room.terminal)
                if(result == 1){//successful deposit, remove element from task list
                    _.pullAt(Game.spawns[creep.memory.city].memory.ferryInfo.factoryInfo.transfer, creep.memory.labNum) //remove element
                    creep.say("getJob")
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
                    creep.say("getJob")
                    break
                }
                creep.moveTo(factory)
                break
            }
            actions.withdraw(creep, creep.room.terminal, creep.memory.mineral, creep.memory.quantity)
            break
        case 13:
            // move energy to storage to link
            if (creep.store.energy === 0 && link.energy === 0){//both are empty
                actions.withdraw(creep, creep.room.storage, RESOURCE_ENERGY, LINK_CAPACITY)
            } else if (link.energy === 0){//link is empty and creep has energy
                actions.charge(creep, link)
            } else if(creep.store.energy > 0){//link has energy and creep has energy
                creep.memory.target = 5//switch to depositing energy in storage
            } else {//job done: link has energy and creep is empty
                creep.say("getJob")
            }
            break 
        }
    },
    
    getJob: function(creep){
        if (creep.ticksToLive < 50){
            creep.suicide()
            return 0
        }
        const link = Game.getObjectById(Game.spawns[creep.memory.city].memory.storageLink)
        let upgradeLink = null
        if(Cache[creep.room.name]){
            const links = Cache[creep.room.name].links || {}
            upgradeLink = Game.getObjectById(links.upgrade)
        }
        if (link && !link.store.energy && upgradeLink && !upgradeLink.store.energy) {
            return 13
        } else if (link && link.store.energy > 0) {
            return 5
        }
        const storage = creep.room.storage
        if (storage && storage.store.energy > 150000 && creep.room.terminal.store.energy < 50000 && _.sum(creep.room.terminal.store) < 295000){
            return 1
        }
        if (creep.room.terminal && creep.room.terminal.store.energy > 51000 && _.sum(creep.room.terminal.store) < 295000){
            return 3
        }
        if(storage && Object.keys(storage.store).length > 1){
            for(const mineral of Object.keys(storage.store)){
                if(creep.room.terminal.store[mineral] < rF.TERMINAL_MAX_MINERAL_AMOUNT - rF.FERRY_CARRY_AMOUNT){
                    creep.memory.mineral = mineral
                    return 2
                }
            }
        }
        if(storage){
            for(const mineral of Object.keys(creep.room.terminal.store)){
                if(creep.room.terminal.store[mineral] > rF.TERMINAL_MAX_MINERAL_AMOUNT && mineral != RESOURCE_ENERGY){
                    creep.memory.mineral = mineral
                    return 6 
                }
            }
        }
        if (Game.spawns[creep.memory.city].memory.ferryInfo.needPower === true && Game.spawns[creep.memory.city].room.terminal.store[RESOURCE_POWER] > 0){
            return 4
        }
        if(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo 
            && Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.reactors 
            && Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers){
            const reactors = Object.keys(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.reactors)
            const reactorInfo = Object.values(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.reactors)
            for(let i = 0; i < reactors.length; i++){
                if(!reactorInfo[i].fill){
                    continue
                }
                if(reactorInfo[i].fill == -1){
                    //empty reactor
                    creep.memory.lab = reactors[i]
                    creep.memory.reactor = true
                    return 10
                }
                if(reactorInfo[i].fill > 0 && creep.room.terminal.store[reactorInfo[i].mineral] >= 1000){
                    //fill reactor
                    creep.memory.lab = reactors[i]
                    creep.memory.reactor = true
                    creep.memory.mineral = reactorInfo[i].mineral
                    return 9
                }
            }
            const receivers = Object.keys(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers)
            const receiverInfo = Object.values(Game.spawns[creep.memory.city].memory.ferryInfo.labInfo.receivers)
            for(let i = 0; i < receivers.length; i++){
                if(!receiverInfo[i].fill){
                    continue
                }
                if(receiverInfo[i].fill == -1){
                    //empty receiver
                    creep.memory.lab = receivers[i]
                    creep.memory.reactor = false
                    return 10
                }
                if(receiverInfo[i].fill > 0 && creep.room.terminal.store[receiverInfo[i].boost] >= 1000){
                    //fill receiver
                    const lab = Game.getObjectById(receivers[i])
                    creep.memory.lab = receivers[i]
                    creep.memory.reactor = false
                    if(lab.mineralType && lab.mineralType != receiverInfo[i].boost){

                        return 10
                    }
                    creep.memory.mineral = receiverInfo[i].boost
                    return 9
                } else if(receiverInfo[i].fill > 0 && creep.room.terminal.store[receiverInfo[i].boost] < 1000
                    && !Game.spawns[creep.memory.city].memory.ferryInfo.mineralRequest){
                    Game.spawns[creep.memory.city].memory.ferryInfo.mineralRequest = receiverInfo[i].boost
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
        if (nuker && nuker.ghodium < nuker.ghodiumCapacity && creep.room.terminal.store["G"] >= 4000){
            creep.memory.nuker = nuker.id
            return 8
        }
        return 0
    }
}
module.exports = rF