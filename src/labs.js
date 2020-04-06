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

    run: function(city){
        const spawn = Game.spawns[city]
        if (!spawn.memory.ferryInfo || !spawn.memory.ferryInfo.labInfo || !spawn.memory.ferryInfo.labInfo.reactors){
            return
        }
        //if a reactor is missing, return
        const reactor0 = Game.getObjectById(Object.keys(spawn.memory.ferryInfo.labInfo.reactors)[0])
        const reactor1 = Game.getObjectById(Object.keys(spawn.memory.ferryInfo.labInfo.reactors)[1])
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
                labs.runReactions()
            }
        }
    },

    updateLabs: function(reactor0, reactor1, spawn){
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

    chooseBoost: function(currentBoost, spawn){
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

    runReaction: function(receivers, reactor0, reactor1) {
        if (!!reactor0.mineralType && !!reactor1.mineralType){
            const produce = REACTIONS[reactor0.mineralType][reactor1.mineralType]
            const reactionTime = REACTION_TIME[produce]
            if (Game.time % reactionTime === 4 && Game.cpu.bucket > 2000){
                const receiverList = Object.keys(receivers)
                for(let i = 0; i < receiverList.length; i++){
                    const lab = Game.getObjectById(receivers[receiverList[i]])
                    if(lab){
                        lab.runReaction(reactor0, reactor1)
                    }
                }
            }
            return 0
        }
        return -1
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