var fact = {

    runFactory: function(city) {
        fact.initFactoryMem(city);
        if(Game.spawns[city].memory.ferryInfo.factoryInfo.produce === 'dormant'){
            if(Game.time % 100 === 0){
                Game.spawns[city].memory.ferryInfo.factoryInfo.produce = null;
            }
            return;
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
            Game.spawns[city].memory.ferryInfo.comRequest = null;//commodity request addition to mineral request
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
        }
    },

    restock: function(factory, city, produce){
        if(!Game.spawns[city].memory.ferryInfo.factoryInfo.transfer.length){
            if(factory.store[produce]){//factory just finished producing, must be emptied before choosing new produce, then getting filled
                Game.spawns[city].memory.ferryInfo.factoryInfo.transfer.push([produce, 0, factory.store[produce]])
                return;
            }
            fact.chooseProduce(factory, city);
            return;
        }
    },

    chooseProduce: function(factory, city){
        if(factory.level >= 1){
            //set produce to null, empire manager will assign next produce
            Game.spawns[city].memory.ferryInfo.factoryInfo.produce = null;
        } else {
            //make 5k of each base resource commodity (in increments of 200)
            let baseComs = [RESOURCE_UTRIUM_BAR, RESOURCE_LEMERGIUM_BAR, RESOURCE_ZYNTHIUM_BAR,
                    RESOURCE_KEANIUM_BAR, RESOURCE_GHODIUM_MELT, RESOURCE_OXIDANT, RESOURCE_REDUCTANT, RESOURCE_PURIFIER];
            let terminal = Game.spawns[city].room.terminal;
            for(i = 0; i < baseComs.length; i++){
                if(terminal.store[baseComs[i]] < 5000){
                    Game.spawns[city].memory.ferryInfo.factoryInfo.produce = baseComs[i];
                    let components = _.without(Object.keys(COMMODITIES[baseComs[i]].components), RESOURCE_ENERGY); //ferry shouldn't deliver energy
                    fact.requestComponents(city, components, baseComs[i])
                    return;
                }
            }
            //make base commodities i.e. wire, cell etc.

            //activate dormant mode
            Game.spawns[city].memory.ferryInfo.factoryInfo.produce = 'dormant';
        }
    },

    requestComponents: function(city, components, produce){
        let rateLimit = 0; //determine rate limit(resources cannot be transferred in quantities greater than 1k)
        for(i = 0; i < components.length; i++){
            let needed = COMMODITIES[produce].components[components[i]];
            if(rateLimit < needed){
                rateLimit = needed;
            }
        }
        //use rate limit to determine how much of each component is needed
        let productionNum = _.floor(1000/rateLimit)//number of cycles we can run per charter
        for(i = 0; i < components.length; i++){
            let requestAmount = COMMODITIES[produce].components[components[i]] * productionNum;
            Game.spawns[city].memory.ferryInfo.factoryInfo.transfer.push([components[i], 1, requestAmount)
        }

    }

};
module.exports = fact;