import settings = require("../config/settings")

const pSpawn = {
    run: function(city) {
        if(Game.spawns[city]){
            if (!Game.spawns[city].memory.powerSpawn){
                return
            }
            const powerSpawn = Game.getObjectById(Game.spawns[city].memory.powerSpawn)
            if (Game.time % 20 === 0){
                if (!Game.spawns[city].memory.ferryInfo){
                    Game.spawns[city].memory.ferryInfo = {}
                }
                if(powerSpawn && powerSpawn.power < 30){
                    Game.spawns[city].memory.ferryInfo.needPower = true
                } else {
                    Game.spawns[city].memory.ferryInfo.needPower = false
                }
            }
            if(settings.processPower && powerSpawn && powerSpawn.energy >= 50 && powerSpawn.power > 0 && powerSpawn.room.storage.store.energy > settings.energy.processPower && Game.cpu.bucket > settings.bucket.processPower){
                powerSpawn.processPower()
            }
        }
    },

    update: function(city, memory) {
        if (!memory.ferryInfo){
            memory.ferryInfo = {}
        }
        const powerSpawn = _.find(Game.structures, (structure) => structure.structureType == STRUCTURE_POWER_SPAWN && structure.room.memory.city == city)
        if (powerSpawn){
            memory.powerSpawn = powerSpawn.id
        }
    }
}

export = pSpawn
