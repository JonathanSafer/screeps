var assert = require("assert")
// const _ = require("lodash")
require("./lib")

function createBasicCity(name) {
    return createFactoryCity(name, {}, 1)
}

function createFactoryCity(name, resourceMap, factoryLevel) {
    const city = new Room(name)
    new StructureFactory(city, factoryLevel)
    new StructureController(city)
    new StructureTerminal(city, resourceMap)
    city.memory.city = name
    return city
}

describe("commodityManager", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
        global.Cache = {}
    })
    var cM = require("../src/managers/commodityManager.js")
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
})