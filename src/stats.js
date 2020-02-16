const rDM = require("./depositMiner")
const rMM = require("./mineralMiner")
const u = require("./utils")
const rr = require("./roles")
const settings = require("./settings")
const profiler = require("./screeps-profiler")

var statsLib = {
    cityCpuMap: {},

    collectStats: function() {
        //stats
        if(Game.time % 19 == 0){
            //activate segment
            RawMemory.setActiveSegments([0])
        }
        if (Game.time % 19 == 1){
            RawMemory.setActiveSegments([])
            const stats = {}
            stats["cpu.bucket"] = Game.cpu.bucket
            stats["gcl.progress"] = Game.gcl.progress
            stats["gcl.progressTotal"] = Game.gcl.progressTotal
            stats["gcl.level"] = Game.gcl.level
            stats["gpl.progress"] = Game.gpl.progress
            stats["gpl.progressTotal"] = Game.gpl.progressTotal
            stats["gpl.level"] = Game.gpl.level
            stats["energy"] = u.getDropTotals()
            var cities = []
            _.forEach(Object.keys(Game.rooms), function(roomName){
                const room = Game.rooms[roomName]
                const city = Game.rooms[roomName].memory.city
                cities.push(city)
        
                if(room.controller && room.controller.my){
                    stats["rooms." + city + ".rcl.level"] = room.controller.level
                    stats["rooms." + city + ".rcl.progress"] = room.controller.progress
                    stats["rooms." + city + ".rcl.progressTotal"] = room.controller.progressTotal
        
                    stats["rooms." + city + ".spawn.energy"] = room.energyAvailable
                    stats["rooms." + city + ".spawn.energyTotal"] = room.energyCapacityAvailable
        
                    if(room.storage){
                        stats["rooms." + city + ".storage.energy"] = room.storage.store.energy
                    }
                    stats["rooms." + city + ".cpu"] = statsLib.cityCpuMap[city]
                }
            })
            var counts = _.countBy(Game.creeps, creep => creep.memory.role)
            var roles = rr.getRoles()
            _.forEach(roles, function(role){
                if (counts[role.name]){
                    stats["creeps." + role.name + ".count"] = counts[role.name]
                } else {
                    stats["creeps." + role.name + ".count"] = 0
                }
            })

            // City level stats
            var cityCounts = _.countBy(Game.creeps, creep => creep.memory.city)
            _.forEach(cities, function(city){
                if (!city) {
                    return
                }
                if (cityCounts[city]){
                    stats["cities." + city + ".count"] = cityCounts[city]
                } else {
                    stats["cities." + city + ".count"] = 0
                }
                stats["cities." + city + ".deposits"] = 0
                stats["cities." + city + ".minerals"] = 0
                
                // Record the weakest wall in each city
                const spawn = Game.spawns[city]
                if(spawn){
                    const buildings = spawn.room.find(FIND_STRUCTURES)
                    const walls = _.filter(buildings, building => building.structureType == STRUCTURE_WALL)
                    const minWall = _.min(_.toArray(_.map(walls, wall => wall.hits)))
                    stats["cities." + city + ".wall"] = walls.length  > 0 ? minWall : 0
                }
            })
            // Mining stats
            _.forEach(Game.creeps, creep => {
                const city = creep.memory.city
                if (creep.memory.role == rDM.name) {
                    stats["cities." + city + ".deposits"] += creep.memory.mined
                    creep.memory.mined = 0
                } else if (creep.memory.role == rMM.name) {
                    stats[`cities.${city}.minerals`] += creep.memory.mined
                    creep.memory.mined = 0
                }
            })

            stats["market.credits"] = Game.market.credits
            stats["cpu.getUsed"] = Game.cpu.getUsed()

            if (profiler.results && profiler.results.stats) {
                const pstats = profiler.results.stats
                const profileSize = Math.min(settings.profileResultsLength, pstats.length)
                for (var i = 0; i < profileSize; i++) {
                    const result = pstats[i]
                    stats[`profiler.${result.name}.calls`] = result.calls
                    stats[`profiler.${result.name}.time`] = result.totalTime.toFixed(1)
                }
            }
            stats["cpu.bucket.fillRate"] = Cache.bucket.fillRate
            stats["cpu.bucket.fillRateLong"] = Cache.bucket.fillRateLong
            stats["cpu.bucket.fillRateMax"] = Cache.bucket.fillRateMax

            RawMemory.segments[0] = JSON.stringify(stats)
        }  
    }
}

module.exports = statsLib