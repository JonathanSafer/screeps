var assert = require("assert")
// const _ = require("lodash")

function createCity(resourceMap) {
    const city = {}
    city.controller = {}
    city.controller.level = 8
    city.terminal = {}
    city.terminal.store = resourceMap
    city.memory = {}
    city.memory.city = "test"
    return city
}

global.RESOURCES_ALL = [0, 1, 2, 3]

// resource enum
const cities = [
    createCity({energy: 20, power: 7}),
    createCity({energy: 11, power: 8}),
    createCity({power: 6})]


describe("utils", function () {
    var cM = require("../src/utils.js")
    describe("#getFactory()", function () {
        it("should get the factory", function () {
            const factory = cM.getFactory(createCity({}))
            assert(factory.level == 1)
        })
    })
})

describe("commodityManager", function () {
    var cM = require("../src/commodityManager.js")
    describe("#empireStore()", function () {
        it("should sum everything", function () {
            const store = cM.empireStore(cities)
            assert(store.energy == 31)
            assert(store.power == 21)
            assert(store.H == 0)
        })
    })

    describe("#groupByFactoryLevel", function () {
        it("should filter those without terminals", function () {  
            const cs = [{}, {}]
            const fMap = cM.groupByFactoryLevel(cs)
            assert(Object.keys(fMap).length == 0) 
        })

        it("should group cities with the same level", function () {
            const cs = [createCity({}), createCity({})] // TODO add factories
            const fMap = cM.groupByFactoryLevel(cs)
            assert(Object.keys(fMap).length == 1) 
            assert(fMap[1].length == 2)
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