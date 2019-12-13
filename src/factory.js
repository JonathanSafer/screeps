var fact = {

    runFactory: function(city) {
        fact.initFactoryMem(city);
        if(Game.spawns[city].memory.ferryInfo.factoryInfo.produce === 'dormant' || !Game.spawns[city].memory.ferryInfo.factoryInfo.produce){
            if(Game.time % 100 != 0){
                return;
            }
            Game.spawns[city].memory.ferryInfo.factoryInfo.produce = RESOURCE_ORGANISM;//will result in reset
        }
        let factory = fact.findFactory(city);
        if(!factory){
            return;
        }
        fact.react(factory, city)
        //TODO: decision making, requesting minerals etc.

    },

    initFactoryMem: function(city){
        if(!Game.spawns[city].memory.ferryInfo){
            Game.spawns[city].memory.ferryInfo = {};
        }
        if(!Game.spawns[city].memory.ferryInfo.factoryInfo){
            Game.spawns[city].memory.ferryInfo.factoryInfo = {};
            Game.spawns[city].memory.ferryInfo.comSend = [];//list of commodities to be delivered as soon as the terminal is ready
            Game.spawns[city].memory.ferryInfo.factoryInfo.produce = null;
            Game.spawns[city].memory.ferryInfo.factoryInfo.factoryLevel = null;
            Game.spawns[city].memory.ferryInfo.factoryInfo.transfer = [];
        }
    },

    findFactory: function(city){
        let structures = Game.spawns[city].room.find(FIND_MY_STRUCTURES);
        let factory = _.find(structures, struct => struct.structureType === STRUCTURE_FACTORY);
        if(!factory){
            return 0;
        }
        if(factory.level !== Game.spawns[city].memory.ferryInfo.factoryInfo.factoryLevel){
            if(!Game.spawns[city].memory.ferryInfo.factoryInfo.factoryLevel){
                //schedule removal of all commodities
                fact.removeJunk(city, Game.spawns[city].room.terminal, factory.level)
            }
            Game.spawns[city].memory.ferryInfo.factoryInfo.factoryLevel = factory.level;
        }
        return factory;
    },

    react: function(factory, city){
        if(!factory.cooldown && Game.spawns[city].memory.ferryInfo.factoryInfo.produce){
            let produce = Game.spawns[city].memory.ferryInfo.factoryInfo.produce;
            let components = Object.keys(COMMODITIES[produce].components);
            let go = true;
            for (var i = 0; i < components.length; i++) {
                if(COMMODITIES[produce].components[components[i]] > factory.store[components[i]]){
                    go = false;
                }
            }
            if(go){
                factory.produce(produce);
            } else {
                if(Game.time % 10 === 0){
                    fact.restock(factory, city, produce);// maybe run this every 10 to save cpu?
                }
            }
            return;
        }
        if(Game.time % 10 === 0 && Game.spawns[city].memory.ferryInfo.factoryInfo.produce){
            let produce = Game.spawns[city].memory.ferryInfo.factoryInfo.produce;
            let components = Object.keys(COMMODITIES[produce].components);
            let go = true;
            for (var i = 0; i < components.length; i++) {
                if(COMMODITIES[produce].components[components[i]] > factory.store[components[i]]){
                    go = false;
                }
            }
            if(!go){
                fact.restock(factory, city, produce);
            }
        }
    },

    restock: function(factory, city, produce){
        if(!Game.spawns[city].memory.ferryInfo.factoryInfo.transfer.length){
            if(factory.store[produce]){//factory just finished producing, must be emptied before choosing new produce, then getting filled
                Game.spawns[city].memory.ferryInfo.factoryInfo.transfer.push([produce, 0, factory.store[produce]])
                return;
            }
            //don't choose new produce if ferry just deposited (ferry will be isNearTo and carrying stuff)
            let ferry = _.find(factory.room.find(FIND_MY_CREEPS), creep => creep.memory.role === 'ferry')
            if(ferry &&  _.sum(ferry.store) > 0 && ferry.pos.isNearTo(factory.pos)) {
                return;
            }
            fact.chooseProduce(factory, city);
            return;
        }
    },

    checkTerminal: function(factory, city){
        const products = _.filter(Object.keys(COMMODITIES), key => COMMODITIES[key].level === factory.level)
        for (var i = 0; i < products.length; i++) {
            let components = _.without(Object.keys(COMMODITIES[products[i]].components), RESOURCE_ENERGY)
            let rate = fact.findRateLimit(components, products[i])
            let go = true;
            for (var j = 0; j < components.length; j++) {
                let room = Game.spawns[city].room
                if((COMMODITIES[products[i]].components[components[j]] * rate) > room.terminal.store[components[j]]){
                    go = false;
                }
            }
            if(go){
                fact.requestComponents(city, components, products[i])
                Game.spawns[city].memory.ferryInfo.factoryInfo.produce = products[i];
                return true;
            }
        }
    },

    chooseProduce: function(factory, city){
        if(factory.level >= 1){
            //check terminal for resources needed to produce same level comms
            if(fact.checkTerminal(factory, city)){
                return;
            }
            //otherwise go dormant
            Game.spawns[city].memory.ferryInfo.factoryInfo.produce = 'dormant';
        } else {
            //make 5k of each base resource commodity (in increments of 200)
            let bars = [RESOURCE_UTRIUM_BAR, RESOURCE_LEMERGIUM_BAR, RESOURCE_ZYNTHIUM_BAR,
                    RESOURCE_KEANIUM_BAR, RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_PURIFIER, RESOURCE_GHODIUM_MELT];
            let terminal = Game.spawns[city].room.terminal;
            for(i = 0; i < bars.length; i++){
                if(terminal.store[bars[i]] < 3000){
                    Game.spawns[city].memory.ferryInfo.factoryInfo.produce = bars[i];
                    let components = _.without(Object.keys(COMMODITIES[bars[i]].components), RESOURCE_ENERGY); //ferry shouldn't deliver energy
                    fact.requestComponents(city, components, bars[i])
                    return;
                }
            }
            //if excess base mineral, process it
            for(i = 0; i < bars.length; i++){
                let components = _.without(Object.keys(COMMODITIES[bars[i]].components), RESOURCE_ENERGY);
                if(terminal.store[components[0]] >= 9000){
                    if(components[0] == RESOURCE_GHODIUM && terminal.store[components[0]] < 20000){
                        continue;
                    }
                    Game.spawns[city].memory.ferryInfo.factoryInfo.produce = bars[i];
                    let coms = _.without(Object.keys(COMMODITIES[bars[i]].components), RESOURCE_ENERGY); //ferry shouldn't deliver energy
                    fact.requestComponents(city, coms, bars[i])
                    return;
                }
            }
            //make base commodities i.e. wire, cell etc.
            let baseComs = [RESOURCE_CONDENSATE, RESOURCE_ALLOY, RESOURCE_CELL, RESOURCE_WIRE]
            let rawComs = [RESOURCE_SILICON, RESOURCE_METAL, RESOURCE_BIOMASS, RESOURCE_MIST]
            for(i = 0; i < baseComs.length; i++){
                let components = _.without(Object.keys(COMMODITIES[baseComs[i]].components), RESOURCE_ENERGY);
                let commodity = _.intersection(components, rawComs);
                if(terminal.store[commodity] >= 1000){
                    //produce it
                    Game.spawns[city].memory.ferryInfo.factoryInfo.produce = baseComs[i];
                    fact.requestComponents(city, components, baseComs[i])
                    return;
                }

            }
            //activate dormant mode
            Game.spawns[city].memory.ferryInfo.factoryInfo.produce = 'dormant';
        }
    },

    findRateLimit: function(components, produce){//return number of cycles we can do
        let rateLimit = 0; //determine rate limit(resources cannot be transferred in quantities greater than 1k)
        for(i = 0; i < components.length; i++){
            let needed = COMMODITIES[produce].components[components[i]];
            if(rateLimit < needed){
                rateLimit = needed;
            }
        }
        //use rate limit to determine how much of each component is needed
        let productionNum = _.floor(1000/rateLimit)//number of cycles we can run per charter
        return productionNum;
    },

    requestComponents: function(city, components, produce){
        let productionNum = fact.findRateLimit(components, produce);
        for(i = 0; i < components.length; i++){
            let requestAmount = COMMODITIES[produce].components[components[i]] * productionNum;
            Game.spawns[city].memory.ferryInfo.factoryInfo.transfer.push([components[i], 1, requestAmount])
        }

    },

    moveJunk: function(city, terminal, factLevel){
        const coms = _.without(_.difference(Object.keys(COMMODITIES), Object.keys(REACTIONS)), RESOURCE_ENERGY)
        const destination = _.find(Game.structures, struct => struct.structureType == STRUCTURE_FACTORY
                 && struct.my && !struct.level && struct.room.terminal && struct.room.controller.level >= 7).room.name
        for(var i = 0; i < Object.keys(terminal.store).length; i++){
            if(_.includes(coms, Object.keys(terminal.store)[i])){
                //send com to a level 0 room
                Game.spawns[city].memory.ferryInfo.comSend.push([Object.keys(terminal.store)[i], terminal.store[Object.keys(terminal.store)[i]], destination]);
            }
        }
    }

};
module.exports = fact;