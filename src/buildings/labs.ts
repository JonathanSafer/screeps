import settings = require("../config/settings")
import template = require("../config/template")
import u = require("../lib/utils")

const labs = {
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
        if(spawn.memory.ferryInfo.labInfo.boost == "dormant" && Game.time % 1000 != 0){
            return
        }
        //if a reactor is missing, return
        const reactor0: Mineral = Game.getObjectById(Object.keys(spawn.memory.ferryInfo.labInfo.reactors)[0])
        const reactor1: Mineral = Game.getObjectById(Object.keys(spawn.memory.ferryInfo.labInfo.reactors)[1])
        if(!reactor0 || !reactor1 || !spawn.room.terminal){
            return
        }

        //if reactors are empty, choose next reaction, set all receivers to get emptied
        if(!reactor0.mineralType || !reactor1.mineralType){
            //if reactors are not requesting fill, update reaction
            labs.updateLabs(reactor0, reactor1, spawn)
            return
        }

        if(spawn.memory.ferryInfo.labInfo.boost){
            //loop thru receivers, react in each one that is not designated as a booster
            labs.runReaction(spawn.memory.ferryInfo.labInfo.receivers, reactor0, reactor1)
        }
    },

    updateLabs: function(reactor0, reactor1, spawn: StructureSpawn){
        if(spawn.memory.ferryInfo.labInfo.reactors[reactor0.id].fill || spawn.memory.ferryInfo.labInfo.reactors[reactor1.id].fill){
            if(Game.time % 200000 == 0){
                spawn.memory.ferryInfo.labInfo.reactors[reactor0.id].fill = -1
                spawn.memory.ferryInfo.labInfo.reactors[reactor1.id].fill = -1
            }
            return//if either of the reactors is requesting a fill up, no need to choose a new mineral
        }
        if(reactor0.mineralType || reactor1.mineralType){
            spawn.memory.ferryInfo.labInfo.reactors[reactor0.id].fill = -1
            spawn.memory.ferryInfo.labInfo.reactors[reactor1.id].fill = -1
            return
        }
        //if that is not the case, all receivers must be emptied
        let oldMineral = null
        for(let i = 0; i < Object.keys(spawn.memory.ferryInfo.labInfo.receivers).length; i++){
            const receiver: Mineral = Game.getObjectById(Object.keys(spawn.memory.ferryInfo.labInfo.receivers)[i])
            if(!spawn.memory.ferryInfo.labInfo.receivers[receiver.id].boost && receiver.mineralType){
                //empty receivers if they are not boosters and have minerals
                spawn.memory.ferryInfo.labInfo.receivers[receiver.id].fill = -1
                //record mineral that was produced
                if(receiver.mineralType){
                    oldMineral = receiver.mineralType
                }
            }
        }
        if(oldMineral == spawn.memory.ferryInfo.labInfo.boost || !spawn.memory.ferryInfo.labInfo.boost
            || spawn.memory.ferryInfo.labInfo.boost == "dormant"){
            labs.chooseBoost(oldMineral, spawn)
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
        Object.values<Reactor>(spawn.memory.ferryInfo.labInfo.reactors)[0].mineral = minerals[0]
        Object.values<Reactor>(spawn.memory.ferryInfo.labInfo.reactors)[1].mineral = minerals[1]
        Object.values<Reactor>(spawn.memory.ferryInfo.labInfo.reactors)[0].fill = 3
        Object.values<Reactor>(spawn.memory.ferryInfo.labInfo.reactors)[1].fill = 3
    },

    chooseBoost: function(currentBoost, spawn){
        const minBoost = _.min(settings.militaryBoosts, function(boost) {
            return spawn.room.storage.store[boost] || 0 + spawn.room.terminal.store[boost] || 0
        })

        if(spawn.room.storage.store[minBoost] < settings.boostAmount){
            spawn.memory.ferryInfo.labInfo.boost = minBoost
            return
        }
        for(const boost of settings.civBoosts){
            if (boost == currentBoost && spawn.room.storage.store[currentBoost] > settings.boostAmount - 3000){
                continue
            }
            if(spawn.room.storage.store[boost] < settings.boostAmount){
                spawn.memory.ferryInfo.labInfo.boost = boost
                return
            }
        }
        //go dormant
        spawn.memory.ferryInfo.labInfo.boost = "dormant"
    },

    runReaction: function(receivers, reactor0, reactor1) {
        if (reactor0.mineralType && reactor1.mineralType){
            const produce = REACTIONS[reactor0.mineralType][reactor1.mineralType]
            const reactionTime = REACTION_TIME[produce]
            if (Game.time % reactionTime === 4 && Game.cpu.bucket > 2000){
                const receiverList = Object.keys(receivers)
                for(let i = 0; i < receiverList.length; i++){
                    const lab: StructureLab = Game.getObjectById(receiverList[i])
                    if(lab){
                        if(!receivers[receiverList[i]].boost){
                            lab.runReaction(reactor0, reactor1)
                            continue
                        }
                        if(!lab.mineralType && !receivers[receiverList[i]].fill){
                            receivers[receiverList[i]].boost = null
                            continue
                        }

                        const labCache = u.getLabCache(receiverList[i])
                        if(labCache.amount != lab.store[lab.mineralType]){
                            labCache.amount = lab.store[lab.mineralType]
                            labCache.lastUpdate = Game.time
                            continue
                        }
                        if(labCache.lastUpdate < Game.time - CREEP_LIFE_TIME && !receivers[receiverList[i]].fill){
                            receivers[receiverList[i]].boost = null
                            receivers[receiverList[i]].fill = -1
                        }
                    }
                }
            }
            return 0
        }
        return -1
    },

    chooseMineral: function(mineral, spawn: StructureSpawn) {
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
        if(ferry && _.sum(Object.values(ferry.store))){
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
        let result = null
        _.forEach(Object.keys(REACTIONS), function(key){
            _.forEach(Object.keys(REACTIONS[key]), function(key2){
                if (REACTIONS[key][key2] == mineral){
                    result = [key, key2]
                }
            })
        })
        return result
    },

    initLabInfo: function(memory){
        if(!memory.ferryInfo){
            memory.ferryInfo = {}
        }
        if(!memory.ferryInfo.labInfo){
            memory.ferryInfo.labInfo = {}
            memory.ferryInfo.labInfo.receivers = {}
            memory.ferryInfo.labInfo.reactors = {}
        }
    },

    checkLabs: function(city){
        const spawn = Game.spawns[city]
        const labStructures = _.filter(spawn.room.find(FIND_MY_STRUCTURES), structure => structure.structureType === STRUCTURE_LAB)
        if (labStructures.length < 3){
            return
        }
        labs.initLabInfo(spawn.memory)
        //check if we need to do a rescan
        let rescan = false
        const receivers = Object.keys(spawn.memory.ferryInfo.labInfo.receivers)
        const reactors = Object.keys(spawn.memory.ferryInfo.labInfo.reactors)
        for(let i = 0; i < receivers.length; i++){
            if(!Game.getObjectById(receivers[i])){
                rescan = true
                delete(spawn.memory.ferryInfo.labInfo.receivers[receivers[i]])
            }
        }
        for(let i = 0; i < reactors.length; i++){
            if(!Game.getObjectById(reactors[i])){
                rescan = true
                delete(spawn.memory.ferryInfo.labInfo.reactors[reactors[i]])
            }
        }
        if(labStructures.length > receivers.length + reactors.length){
            rescan = true
        }
        if(!rescan){
            return
        }
    
        //now we need a rescan, but we must make sure not to overwrite any labInfo that already exists
        const unassignedLabs = _.filter(labStructures, lab => !receivers.includes(lab.id) && !reactors.includes(lab.id))
        const plan = spawn.room.memory.plan
        for(let i = 0; i < unassignedLabs.length; i++){
            const templatePos = {"x": unassignedLabs[i].pos.x + template.offset.x - plan.x, "y": unassignedLabs[i].pos.y + template.offset.y - plan.y}
            if((templatePos.x == template.buildings.lab.pos[0].x && templatePos.y == template.buildings.lab.pos[0].y) 
                ||(templatePos.x == template.buildings.lab.pos[1].x && templatePos.y == template.buildings.lab.pos[1].y)){
                //lab is a reactor
                spawn.memory.ferryInfo.labInfo.reactors[unassignedLabs[i].id] = {}
            } else {
                //lab is a receiver
                spawn.memory.ferryInfo.labInfo.receivers[unassignedLabs[i].id] = {}
            }
        }
    }
}
export = labs
