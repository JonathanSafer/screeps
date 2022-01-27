var assert = require("assert")
// const _ = require("lodash")
require("./lib")

function createBasicCity(name) {
    return createFactoryCity(name, {}, 1)
}

function createFactoryCity(name, resourceMap, factoryLevel) {
    const room = new Room(name)
    const city = `${room.name}0`
    room.memory.city = city
    new StructureFactory(room, factoryLevel)
    new StructureController(room)
    new StructureTerminal(room, resourceMap)
    new StructureSpawn(room, city)
    return room
}

describe("commodityManager", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
        global.Cache = {}
    })
    const u = require("../built/lib/utils")
    const cM = require("../built/managers/commodityManager")
    describe("#groupByFactoryLevel()", function () {
        it("should filter those without terminals", function () {  
            const cs = [{}, {}]
            const fMap = cM.groupByFactoryLevel(cs)
            assert.equal(0, Object.keys(fMap).length) 
        })

        it("should group cities with the same level", function () {
            const cs = [createBasicCity("hi1"), createBasicCity("hi")]
            const fMap = cM.groupByFactoryLevel(cs)
            assert.equal(1, Object.keys(fMap).length) 
            assert.equal(2, fMap[1].length)
        })
    })

    describe("#storeCacheByCity()", function () {
        const cs = [createFactoryCity("E3N3", { "energy": 120 }, 1),
            createFactoryCity("E5N5", { "energy": 150 }, 1)]
        it("should cache a city store", function () {
            const cache = cM.storeCacheByCity(cs)
            for (const city of cs) {
                const cachedStore = cache[city.name]
                assert(cachedStore)
                assert.equal(city.terminal.store["energy"], cachedStore["energy"])
            }
        })

        it("cache updates don't affect actual store", function () {
            const cache = cM.storeCacheByCity(cs)
            for (const city of cs) {
                const cachedStore = cache[city.name]
                assert.equal(cachedStore["energy"], city.terminal.store["energy"])
                cachedStore["energy"] += 50
                assert.notEqual(cachedStore["energy"], city.terminal.store["energy"])
            }
        })
    })

    describe("#getOrderStatus()", function () {
        const component = "tissue" // level 2 resource
        const cs = [createFactoryCity("E3N3", { "tissue": 120 }, 2),
            createFactoryCity("E5N5", { "tissue": 550 }, 2)]
        const levelCache = { 2: u.empireStore(cs) }
        it("not enough => not cleared to ship", function () {
            const quantities = {[component]: 1000}
            const status =
                cM.getOrderStatus(quantities, levelCache)
            assert(!status)
        })

        it("enough => cleared to ship", function () {
            const quantities = {[component]: 500}
            const status = 
                cM.getOrderStatus(quantities, levelCache)
            assert(status)
        })
    })

    describe("#runManager()", function () {
        it("should schedule deliveries when we have resources", function () {
            const cs = [createFactoryCity("E3N3", { "phlegm": 90 }, 1),
                createFactoryCity("E5N5", { "cell": 90, "reductant": 990 }),
                createFactoryCity("E9N9", {}, 2)]
            cM.runManager(cs)
            const plans = Game.spawns["E3N30"].memory.ferryInfo.comSend
            assert.equal(1, plans.length)
            assert.deepEqual(["phlegm", 90, "E9N9"], plans[0])
        })

        // it("send deliveries to 2 receivers if we have enough resources", function () {
        //     const cs = [createFactoryCity("E3N3", { "phlegm": 180 }, 1),
        //         createFactoryCity("E5N5", { "cell": 180, "reductant": 2000 }),
        //         createFactoryCity("E9N9", {}, 2), createFactoryCity("E7N7", {}, 2)]
        //     cM.runManager(cs)
        //     const plans = Game.spawns["E3N30"].memory.ferryInfo.comSend
        //     assert.equal(2, plans.length)
        //     assert.deepEqual(["phlegm", 90, "E7N7"], plans.find(plan => plan[2] == "E7N7"))
        //     assert.deepEqual(["phlegm", 90, "E9N9"], plans.find(plan => plan[2] == "E9N9"))
        // })

        it("don't schedule deliveries if we are saving for higher tier products", function () {
            const cs = [createFactoryCity("E3N3", { "phlegm": 90 }, 1),
                createFactoryCity("E5N5", { "cell": 90, "reductant": 990 }),
                createFactoryCity("E7N7", { "tissue": 60 }, 2),
                createFactoryCity("E9N9", {}, 3)]
            cM.runManager(cs)
            const memory = Game.spawns["E3N30"].memory
            if (memory.ferryInfo && memory.ferryInfo.comSend) {
                const plans = memory.ferryInfo.comSend
                assert.equal(0, plans.length) 
            }

        })

        it("high tier products are higher priority", function () {
            const cs = [createFactoryCity("E3N3", { "phlegm": 90 }, 1),
                createFactoryCity("E5N5", { "cell": 90, "reductant": 1000 }),
                createFactoryCity("E6N6", { "zynthium_bar": 1000 }),
                createFactoryCity("E7N7", { "tissue": 60 }, 2),
                createFactoryCity("E9N9", {}, 3)]
            cM.runManager(cs)
            const plans = Game.spawns["E3N30"].memory.ferryInfo.comSend
            assert.equal(1, plans.length)
            assert.deepEqual(["phlegm", 60, "E9N9"], plans[0])
        })
    })
})