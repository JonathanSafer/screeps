const quad = require("./quad")
const sq = require("./spawnQueue")
const u = require("./utils")

const m = {

    attack: function() {
        if (m.attackUnderway()) {
            return
        }
        const roomName = m.getNextRoomToAttack()
        if (roomName) {
            quad.deployQuad(roomName)
        }
    },

    attackUnderway: function() {
        return _(Object.keys(Memory.flags))
            .find(name => name.includes("quad"))
    },

    getNextRoomToAttack: function() {
        const militaryCache = u.getsetd(Cache, "military", {})
        const nextTargets = u.getsetd(militaryCache, "targets", m.findTargets())
        return nextTargets && nextTargets.shift()
    },

    findTargets: function() {
        const roomData = u.getsetd(Cache, "roomData", {})
        const cities = _(u.getMyCities()).map("name").value()
        const allNeighbors = _(cities).map(city => u.getAllRoomsInRange(1, [city])).value()

        return _(cities)
            .zipObject(allNeighbors)
            .map((neighbors, city) => {
                return _(neighbors).filter(neighbor => {
                    const data = roomData[neighbor]
                    const tooFar = () => {
                        const route = Game.map.findRoute(city, neighbor)
                        return route == ERR_NO_PATH || route.length > 1
                    }
                    return data.enemy && data.towers <= 2
                            && data.rcl <= 6 && !tooFar()
                }).value()
            })
            .flatten()
            .value()
    },

    deployQuad: function(roomName, boosted) {
        const flagPos = m.nonWallRoomPos(roomName)

        const closestRoomName = m.chooseClosestRoom(flagPos)
        const flagName = `${closestRoomName}0quadRally`
        if (flagName in Memory.flags) {
            Log.error(`Quad already deployed from ${closestRoomName}`)
            return
        }

        Memory.flags[flagName] = flagPos
        m.spawnQuad(`${closestRoomName}0`, boosted)
    },

    nonWallRoomPos: function(roomName) {
        const terrain = Game.map.getRoomTerrain(roomName)
        for(let y = 0; y < 50; y++) {
            for(let x = 0; x < 50; x++) {
                if (terrain.get(x, y) != TERRAIN_MASK_WALL) {
                    return new RoomPosition(x, y, roomName)
                }
            }
        }
    },

    chooseClosestRoom: function(flagPos){
        const cities = u.getMyCities()
        const goodCities = _.filter(cities, m.canSpawnQuad)
        const lengths = _.map(goodCities, city => {
            const testRoomPos = city.getPositionAt(25, 25)
            const testPath = u.findMultiRoomPath(testRoomPos, flagPos)
            if (testPath.incomplete || city.name == flagPos.roomName) {
                return Number.MAX_VALUE
            }
            return testPath.cost
        })
        const i = _.indexOf(lengths, _.min(lengths))
        const nearestCity = goodCities[i]

        if(lengths[i] > CREEP_LIFE_TIME) {
            Log.info(`No valid rooms in range for ${quad.name} in ${flagPos.roomName}`)
        }
        return nearestCity.name
    },

    canSpawnQuad: function(city) {
        return city.controller.level == 8 &&
            Game.spawns[city.memory.city] &&
            city.storage
    },

    spawnQuad: function(city, boosted){
        sq.initialize(Game.spawns[city])
        for(let i = 0; i < 4; i++){
            sq.schedule(Game.spawns[city], quad.name, boosted)
        }
    }
}

module.exports = m
