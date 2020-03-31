var settings = require("./settings")

var labs = {
    //new labs:
    //all 10 labs in one cluster. reactors built first and identified based on position relative to other lab SITES
    //receivers are identified and begin use as soon as they are built
    //reactors are in a list in labInfo.reactors
    //receivers are in a list in labInfo.receivers
    //receivers have a mineral attribute. if null or undefined, operate as normal
    //if receiver has a mineral assigned in its mineral attribute, don't react into it, and use it for boosting (with assigned mineral)
    //fill codes:
    //  0: do nothing
    //  [positive integer]: fill with integer * 1000 resource
    //  -1: empty

    /* Example: 
    labInfo:
        boost: [RESOURCE_CONSTANT]
        reactors:
            0: 
                id: reactorId
                mineral: [RESOURCE_CONSTANT]
                fill: 0
            1: 
                id: reactorId
                mineral: [RESOURCE_CONSTANT]
                fill: 0
        receivers
            0:
                id: [object Id]
                boost: [RESOURCE_CONSTANT]
                fill: 1
            1:
            .
            .
            .
    */

    _runLabs: function(city){
        const spawn = Game.spawns[city]
        if (!spawn.memory.ferryInfo || !spawn.memory.ferryInfo.labInfo || !spawn.memory.ferryInfo.labInfo.reactors){
            return
        }
        //if a reactor is missing, return
        const reactor0 = Game.getObjectById(spawn.memory.ferryInfo.labInfo.reactors[0].id)
        const reactor1 = Game.getObjectById(spawn.memory.ferryInfo.labInfo.reactors[1].id)
        if(!reactor0 || !reactor1){
            return
        }

        //if reactors are empty, choose next reaction, set all receivers to get emptied
        if(reactor0.store.getFreeCapacity() >= LAB_MINERAL_CAPACITY || reactor1.store.getFreeCapacity() >= LAB_MINERAL_CAPACITY){
            //if reactors are not requesting fill, update reaction
            labs._updateLabs(reactor0, reactor1, spawn)
            return
        }

        //if time % reacttime != 4, return
        if(spawn.memory.ferryInfo.labInfo.boost){
            const reactionTime = REACTION_TIME[spawn.memory.ferryInfo.labInfo.boost]
            if(Game.time % reactionTime == 4){
                //loop thru receivers, react in each one that is not designated as a booster
            }
        }
    },

    _updateLabs: function(reactor0, reactor1, spawn){
        if(spawn.memory.ferryInfo.labInfo.reactors[0].fill || spawn.memory.ferryInfo.labInfo.reactors[1].fill){
            return//if either of the reactors is requesting a fill up, no need to choose a new mineral
        }
        //if that is not the case, all receivers must be emptied
        let oldMineral = null
        for(let i = 0; i < spawn.memory.ferryInfo.labInfo.receivers.length; i++){
            const receiver = Game.getObjectById(spawn.memory.ferryInfo.labInfo.receivers[i].id)
            if(!spawn.memory.ferryInfo.labInfo.receivers[i].boost && receiver.store.getFreeCapacity() < LAB_MINERAL_CAPACITY){
                //empty receivers if they are not boosters and have minerals
                spawn.memory.ferryInfo.labInfo.receivers[i].fill = -1
                //record mineral that was produced
                if(receiver.mineralType){
                    oldMineral = receiver.mineralType
                }
            }
        }
        if(oldMineral == spawn.memory.ferryInfo.labInfo.boost){
            labs._chooseBoost(oldMineral, spawn)
            if(spawn.memory.ferryInfo.labInfo.boost == "dormant"){
                return
            }
        }
        //choose new mineral to be made
        spawn.room.terminal.store[oldMineral] += 3000
        const boost = spawn.memory.ferryInfo.labInfo.boost
        const minerals = labs.chooseMineral(boost, spawn)
        if (!minerals){
            return
        }
        spawn.memory.ferryInfo.labInfo.reactors[0].mineral = minerals[0]
        spawn.memory.ferryInfo.labInfo.reactors[1].mineral = minerals[1]
        spawn.memory.ferryInfo.labInfo.reactors[0].fill = 3
        spawn.memory.ferryInfo.labInfo.reactors[1].fill = 3
    },

    _chooseBoost: function(currentBoost, spawn){
        if(spawn.room.terminal.store[RESOURCE_GHODIUM] < settings.ghodiumAmount){
            spawn.memory.ferryInfo.labInfo.boost = RESOURCE_GHODIUM
            return
        }
        const boostsList = settings.boosts
        if (boostsList.includes(currentBoost) && spawn.room.terminal.store[currentBoost] > settings.boostAmount - 3000){
            boostsList.splice(boostsList.indexOf(currentBoost), 1)
        }
        for(let i = 0; i < boostsList.length; i++){
            if(spawn.room.terminal.store[boostsList[i]] < settings.boostAmount){
                spawn.memory.ferryInfo.labInfo.boost = boostsList[i]
                return
            }
        }
        //go dormant
        spawn.memory.ferryInfo.labInfo.boost = "dormant"
    },












    runLabs: function(city) {
        const spawn = Game.spawns[city]
        if (!spawn.memory.ferryInfo){
            return
        }
        if (!spawn.memory.ferryInfo.labInfo){
            return
        }
        const lab0 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[0][0])
        const lab1 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[1][0])
        const lab2 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[2][0])
        const lab3 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[3][0])
        const lab4 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[4][0])
        const lab5 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[5][0])
        if (!lab0 || !lab1 || !lab2 || !lab3 || !lab4 || !lab5){
            return
        }
        const reaction = labs.runReaction(lab0, lab1, lab2, lab3, lab4, lab5, spawn)
        // if no reaction, update labs
        if (reaction){
            labs.updateLabs(lab0, lab1, lab2, lab3, lab4, lab5, spawn)
        }
    },

    runReaction: function(lab0, lab1, lab2, lab3, lab4, lab5, spawn) {
        if (lab0.mineralAmount > 0 && lab1.mineralAmount > 0){
            const produce = REACTIONS[spawn.memory.ferryInfo.labInfo[0][2]][spawn.memory.ferryInfo.labInfo[1][2]]
            const reactionTime = REACTION_TIME[produce]
            if (Game.time % reactionTime === 4 && Game.cpu.bucket > 2000){
                lab2.runReaction(lab0, lab1)
                lab3.runReaction(lab0, lab1)
                lab4.runReaction(lab0, lab1)
                lab5.runReaction(lab0, lab1)
            }
            return 0
        }
        return 1
    },

    updateLabs: function(lab0, lab1, lab2, lab3, lab4, lab5, spawn) {
        if(spawn.memory.ferryInfo.labInfo[6] == "dormant" && Game.time % 500 != 0){
            return
        }
        if(lab5.mineralType == spawn.memory.ferryInfo.labInfo[6] || spawn.memory.ferryInfo.labInfo[6] == "dormant"){
            labs.chooseBoost(spawn.memory.ferryInfo.labInfo[6], spawn)
            if(spawn.memory.ferryInfo.labInfo[6] == "dormant"){
                return
            }
        }
        const receivers = [lab2, lab3, lab4, lab5]
        for (let i = 0; i < receivers.length; i++){
            if (receivers[i].mineralAmount >= 750){
                spawn.memory.ferryInfo.labInfo[i + 2][1] = 1
                return
            } else {
                spawn.memory.ferryInfo.labInfo[i + 2][1] = 0
            }
        }
        // if lab0 and lab1 are not requesting more resource, run new resource decider
        if (spawn.memory.ferryInfo.labInfo[0][1] == 0 && spawn.memory.ferryInfo.labInfo[1][1] == 0){
            const boost = spawn.memory.ferryInfo.labInfo[6]
            const minerals = labs.chooseMineral(boost, spawn)
            if (!minerals){
                return
            }
            spawn.memory.ferryInfo.labInfo[0][1] = 3
            spawn.memory.ferryInfo.labInfo[1][1] = 3
            spawn.memory.ferryInfo.labInfo[0][2] = minerals[0]
            spawn.memory.ferryInfo.labInfo[1][2] = minerals[1]
        }
    },

    chooseBoost: function(currentBoost, spawn) {
        if(spawn.room.terminal.store["G"] < settings.ghodiumAmount){
            spawn.memory.ferryInfo.labInfo[6] = "G"
            return
        }
        const boostsList = ["G", "XKHO2", "XLHO2", "XZHO2", "XGHO2", "XZH2O", "XGH2O", "XLH2O"]
        if (boostsList.includes(currentBoost) && spawn.room.terminal.store[currentBoost] > settings.boostAmount - 3000){
            boostsList.splice(boostsList.indexOf(currentBoost), 1)
        }
        for(let i = 0; i < boostsList.length; i++){
            if(spawn.room.terminal.store[boostsList[i]] < settings.boostAmount){
                spawn.memory.ferryInfo.labInfo[6] = boostsList[i]
                return
            }
        }
        //go dormant
        spawn.memory.ferryInfo.labInfo[6] = "dormant"
    },

    chooseMineral: function(mineral, spawn) {
        //if requesting mineral, early return
        if (spawn.memory.ferryInfo.mineralRequest){
            if(Game.time % 50 == 26){
                spawn.memory.ferryInfo.mineralRequest = null
            }
            return 0
        }
        const ingredients = labs.findIngredients(mineral)
        //if no ingredients, request mineral
        if (!ingredients){
            spawn.memory.ferryInfo.mineralRequest = mineral
            return 0
        }
        const ferry = _.find(spawn.room.find(FIND_MY_CREEPS), creep => creep.memory.role === "ferry")
        if(ferry && _.sum(ferry.store)){
            return
        }
        //if we don't have both ingredients find the one we don't have and find it's ingredients
        for(let i = 0; i < 2; i++){
            if (spawn.room.terminal.store[ingredients[i]] < 3000){
                return labs.chooseMineral(ingredients[i], spawn)
            }
        }
        //if we have both ingredients, load them up
        return ingredients
    },

    findIngredients: function(mineral){
        let result = 0
        _.forEach(Object.keys(REACTIONS), function(key){
            _.forEach(Object.keys(REACTIONS[key]), function(key2){
                if (REACTIONS[key][key2] == mineral){
                    result = [key, key2]
                }
            })
        })
        return result
    }
}
module.exports = labs