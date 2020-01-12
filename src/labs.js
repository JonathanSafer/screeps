var labs = {
    runLabs: function(city) {
        let spawn = Game.spawns[city];
        if (!spawn.memory.ferryInfo){
            return;
        }
        if (!spawn.memory.ferryInfo.labInfo){
            return;
        }
        let lab0 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[0][0])
        let lab1 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[1][0])
        let lab2 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[2][0])
        let lab3 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[3][0])
        let lab4 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[4][0])
        let lab5 = Game.getObjectById(spawn.memory.ferryInfo.labInfo[5][0])
        if (!lab0 || !lab1 || !lab2 || !lab3 || !lab4 || !lab5){
            return;
        }
        let reaction = labs.runReaction(lab0, lab1, lab2, lab3, lab4, lab5, spawn);
        // if no reaction, update labs
        if (reaction){
            labs.updateLabs(lab0, lab1, lab2, lab3, lab4, lab5, spawn)
        }
    },

    runReaction: function(lab0, lab1, lab2, lab3, lab4, lab5, spawn) {
        if (lab0.mineralAmount > 0 && lab1.mineralAmount > 0){
            let produce = REACTIONS[spawn.memory.ferryInfo.labInfo[0][2]][spawn.memory.ferryInfo.labInfo[1][2]]
            let reactionTime = REACTION_TIME[produce]
            if (Game.time % reactionTime === 4 && Game.cpu.bucket > 2000){
                lab2.runReaction(lab0, lab1);
                lab3.runReaction(lab0, lab1);
                lab4.runReaction(lab0, lab1);
                lab5.runReaction(lab0, lab1);
            }
            return 0;
        }
        return 1;
    },

    updateLabs: function(lab0, lab1, lab2, lab3, lab4, lab5, spawn) {
        if(spawn.memory.ferryInfo.labInfo[6] == 'dormant' && Game.time % 500 != 0){
            return;
        }
        if(lab5.mineralType == spawn.memory.ferryInfo.labInfo[6] || spawn.memory.ferryInfo.labInfo[6] == 'dormant'){
            labs.chooseBoost(spawn.memory.ferryInfo.labInfo[6], spawn)
            if(spawn.memory.ferryInfo.labInfo[6] == 'dormant'){
                return;
            }
        }
        let receivers = [lab2, lab3, lab4, lab5];
        for (let i = 0; i < receivers.length; i++){
            if (receivers[i].mineralAmount >= 750){
                spawn.memory.ferryInfo.labInfo[i + 2][1] = 1
                return;
            } else {
                spawn.memory.ferryInfo.labInfo[i + 2][1] = 0
            }
        }
        // if lab0 and lab1 are not requesting more resource, run new resource decider
        if (spawn.memory.ferryInfo.labInfo[0][1] == 0 && spawn.memory.ferryInfo.labInfo[1][1] == 0){
            let boost = spawn.memory.ferryInfo.labInfo[6]
            let minerals = labs.chooseMineral(boost, spawn);
            if (!minerals){
                return;
            }
            spawn.memory.ferryInfo.labInfo[0][1] = 1
            spawn.memory.ferryInfo.labInfo[1][1] = 1
            spawn.memory.ferryInfo.labInfo[0][2] = minerals[0]
            spawn.memory.ferryInfo.labInfo[1][2] = minerals[1]
        }
    },

    chooseBoost: function(currentBoost, spawn) {
        if(spawn.room.terminal.store['G'] < 15000){
            spawn.memory.ferryInfo.labInfo[6] = 'G';
            return;
        }
        let boostsList = ['G', 'XKHO2', 'XLHO2', 'XZHO2', 'XGHO2', 'XZH2O', 'XGH2O', 'XLH2O']
        if (boostsList.includes(currentBoost) && spawn.room.terminal.store[currentBoost] > 5000){
            boostsList.splice(boostsList.indexOf(currentBoost), 1);
        }
        for(let i = 0; i < boostsList.length; i++){
            if(spawn.room.terminal.store[boostsList[i]] < 8000){
                spawn.memory.ferryInfo.labInfo[6] = boostsList[i]
                return;
            }
        }
        //go dormant
        spawn.memory.ferryInfo.labInfo[6] = 'dormant';
    },

    chooseMineral: function(mineral, spawn) {
        //if requesting mineral, early return
        if (spawn.memory.ferryInfo.mineralRequest){
            if(Game.time % 50 == 26){
                spawn.memory.ferryInfo.mineralRequest = null;
            }
            return 0;
        }
        let ingredients = labs.findIngredients(mineral)
        //if no ingredients, request mineral
        if (!ingredients){
            spawn.memory.ferryInfo.mineralRequest = mineral
            return 0;
        }
        let ferry = _.find(spawn.room.find(FIND_MY_CREEPS), creep => creep.memory.role === 'ferry')
        if(ferry && _.sum(ferry.carry)){
            return;
        }
        //if we don't have both ingredients find the one we don't have and find it's ingredients
        for(let i = 0; i < 2; i++){
            if (spawn.room.terminal.store[ingredients[i]] < 3000){
                return labs.chooseMineral(ingredients[i], spawn);
            }
        }
        //if we have both ingredients, load them up
        return ingredients;
    },

    findIngredients: function(mineral){
        let result = 0
        _.forEach(Object.keys(REACTIONS), function(key){
            _.forEach(Object.keys(REACTIONS[key]), function(key2){
                if (REACTIONS[key][key2] == mineral){
                    result = [key, key2]
                }
            });
        });
        return result;
    }
};
module.exports = labs;