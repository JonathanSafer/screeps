var assert = require("assert")
// const _ = require("lodash")
require("./lib.js")

function createBasicCity(name) {
    return createFactoryCity(name, {}, 1)
}

function createFactoryCity(name, resourceMap, factoryLevel) {
    const city = new Room(name)
    new StructureFactory(city, factoryLevel)
    new StructureController(city, 8)
    new StructureTerminal(city, resourceMap)
    city.memory.city = name
    return city
}

// resource enum
const cities = [
    createFactoryCity("1", {energy: 20, power: 7}, 1),
    createFactoryCity("2", {energy: 11, power: 8}, 2),
    createFactoryCity("3", {power: 6}, 3)]


describe("utils", function () {
    var cM = require("../src/utils.js")
    describe("#getFactory()", function () {
        it("should get the factory", function () {
            const factory = cM.getFactory(createBasicCity("test"))
            assert.equal(1, factory.level)
        })
    })
})

describe("commodityManager", function () {
    var cM = require("../src/commodityManager.js")
    describe("#empireStore()", function () {
        it("should sum everything", function () {
            const store = cM.empireStore(cities)
            assert.equal(31, store.energy)
            assert.equal(21, store.power)
            assert.equal(0, store.H)
        })
    })

    describe("#groupByFactoryLevel", function () {
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

    // scheduleDeliveries: function(factCities, destination, components, terminalCache, quantities)
    // describe("#scheduleDeliveries", function () {
    //     it("should schedule components", function () {  
    //         const fMap = cM.groupByFactoryLevel(cities)
    //         cM.scheduleDeliveries(fMap, "test", ["phlegm"], {}, [7])
    //     })
    // })
})