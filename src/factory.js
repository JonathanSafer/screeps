var fact = {

    runFactory: function(city) {
        fact.initFactoryMem(city);
        let factory = fact.findFactory(city);
        if(!factory){
            return;
        }

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
        }
    },

    findFactory: function(city){
        let structures = Game.spawns[city].room.find(FIND_MY_STRUCTURES);
        let factory = _.find(structures, struct => struct.structureType === STRUCTURE_FACTORY);
        if(!factory){
            return 0;
        }
        if(factory.level !== Game.spawns[city].memory.ferryInfo.factoryInfo.factoryLevel = null){
            Game.spawns[city].memory.ferryInfo.factoryInfo.factoryLevel = factory.level;
        }
        return factory;
    }

};
module.exports = fact;