const rDM = require("./depositMiner")
const rMM = require("./mineralMiner")
const u = require("./utils")
const rr = require("./roles")
const cM = require("./commodityManager")
const settings = require("./settings")
const profiler = require("./screeps-profiler")

var statsLib = {
    cityCpuMap: {},

    collectStats: function(myCities) {
        for (const creep of Object.values(Game.creeps)) {
            const ccache = u.getsetd(Cache, creep.name, {})
            const rcache = u.getsetd(Cache, creep.room.name, {})
            if (u.getsetd(ccache, "lastHits", creep.hits) > creep.hits) {
                ccache.attacks = u.getsetd(ccache, "attacks", 0) + 1
                rcache.attacks = u.getsetd(rcache, "attacks", 0) + 1
            }
            ccache.lastHits = creep.hits
        }

        //stats
        if(Game.time % settings.statTime == 0){
            //activate segment
            RawMemory.setActiveSegments([0])
        }
        if (Game.time % settings.statTime == 1){
            RawMemory.setActiveSegments([])
            const stats = {}
            stats["cpu.getUsed"] = Game.cpu.getUsed()
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
                    stats["cities." + city + ".rcl.level"] = room.controller.level
                    stats["cities." + city + ".rcl.progress"] = room.controller.progress
                    stats["cities." + city + ".rcl.progressTotal"] = room.controller.progressTotal
        
                    stats["cities." + city + ".spawn.energy"] = room.energyAvailable
                    stats["cities." + city + ".spawn.energyTotal"] = room.energyCapacityAvailable
        
                    if(room.storage){
                        stats["cities." + city + ".storage.energy"] = room.storage.store.energy
                    }
                    stats["cities." + city + ".cpu"] = statsLib.cityCpuMap[city]

                    // Record construction progress in the city
                    const sites = room.find(FIND_CONSTRUCTION_SITES)
                    stats[`cities.${city}.sites.progress`] = 
                        _.reduce(sites, (sum, site) => sum + site.progress, 0)
                    stats[`cities.${city}.sites.progressTotal`] = 
                        _.reduce(sites, (sum, site) => sum + site.progressTotal, 0)
                }

                stats[`rooms.${roomName}.attacks`] = u.getsetd(Cache, roomName, {}).attacks
                Cache[roomName].attacks = 0
            })
            var counts = _.countBy(Game.creeps, creep => creep.memory.role)
            var creepsByRole = _.groupBy(Game.creeps, creep => creep.memory.role)
            var roles = rr.getRoles()
            _.forEach(roles, function(role){
                if (counts[role.name]){
                    stats[`creeps.${role.name}.count`] = counts[role.name]
                } else {
                    stats[`creeps.${role.name}.count`] = 0
                }

                const creeps = creepsByRole[role.name] || []
                const attackList = _.map(creeps, creep => Cache[creep.name].attacks)
                stats[`creeps.${role.name}.attacks`] = _.sum(attackList)
                for (const creep of creeps) 
                    Cache[creep.name].attacks = 0
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
                
                const spawn = Game.spawns[city]
                if(spawn){
                    // Record the weakest wall in each city
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

            if (profiler.results && profiler.results.stats) {
                const pstats = profiler.results.stats
                const profileSize = Math.min(settings.profileResultsLength, pstats.length)
                for (var i = 0; i < profileSize; i++) {
                    const result = pstats[i]
                    stats[`profiler.${result.name}.calls`] = result.calls
                    stats[`profiler.${result.name}.time`] = result.totalTime.toFixed(1)
                }
            }
            if(Cache.bucket){
                stats["cpu.bucketfillRateMax"] = Cache.bucket.fillRate
                stats["cpu.waste"] = Cache.bucket.waste
                Cache.bucket.waste = 0
            }

            // Resources
            if (Game.time % settings.resourceStatTime == 1) {
                const citiesWithTerminals = _.filter(myCities, c => c.terminal)
                const empireStore = cM.empireStore(citiesWithTerminals)
                for (const resource of RESOURCES_ALL) {
                    stats[`resource.${resource}`] = empireStore[resource]
                }
            }

            // Enemies
            for (const enemy in Cache.enemies) {
                stats[`enemies.${enemy}`] = Cache.enemies[enemy]
                Cache.enemies[enemy] = 0
            }

            RawMemory.segments[0] = JSON.stringify(stats)
        }  
    }
}

module.exports = statsLib