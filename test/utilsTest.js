var assert = require("assert")
const _ = require("lodash")
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


describe("utils", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
        global.Cache = {}
    })
    var u = require("../src/utils.js")
    describe("#getFactory()", function () {
        it("should get the factory", function () {
            const factory = u.getFactory(createBasicCity("test"))
            assert.equal(1, factory.level)
        })
    })

    describe("#empireStore()", function () {
        it("should sum everything", function () {
            const cities = [
                createFactoryCity("1", {energy: 20, power: 7}, 1),
                createFactoryCity("2", {energy: 11, power: 8}, 2),
                createFactoryCity("3", {power: 6}, 3)]

            const store = u.empireStore(cities)
            assert.equal(31, store.energy)
            assert.equal(21, store.power)
            assert.equal(0, store.H)
        })
    })

    describe("#cacheBoostsAvailable", function () {
        it("should cache boosts", function () {
            const cities = [
                createFactoryCity("1", {"XGH2O": 100000, "XLHO2": 10000}, 1),
                createFactoryCity("2", {"XLHO2": 10000}, 2),
                createFactoryCity("3", {"XKH20": 10000}, 3)]

            u.cacheBoostsAvailable(cities)
            const boostsAvailable = Cache.boostsAvailable
            assert.equal(2, boostsAvailable.length)
            assert(boostsAvailable.includes("XGH2O"))
            assert(boostsAvailable.includes("XLHO2"))
            assert(!boostsAvailable.includes("XKH20"))
        })
    })

    describe("#boostsAvailable", function () {
        it("should return true if boosts are available", function () {
            createFactoryCity("1", {"XGH2O": 100000, "XLHO2": 10000}, 1)
            createFactoryCity("2", {"XLHO2": 10000, "XUHO2": 30000}, 2)
            createFactoryCity("3", {"XKH2O": 40000}, 3)
            const noTermCity = new Room("4")
            new StructureController(noTermCity)

            assert(u.boostsAvailable(require("../src/upgrader")))
            assert(!u.boostsAvailable(require("../src/builder")))
            assert(u.boostsAvailable(require("../src/depositMiner")))
            assert(!u.boostsAvailable(require("../src/powerMiner")))
        })
    })

    describe("#roomNameToPos()", function () {
        it("should be reverseable", function () {
            const rooms = ["E10N15", "E10S21", "W3S5", "W0N0", "E0S0"]
            for(const room of rooms) {
                const converted = u.roomPosToName(u.roomNameToPos(room))
                assert.equal(room, converted)
            }
        })
    })

    describe("#generateRoomList()", function () {
        const rooms = u.generateRoomList(-5, -5, 10, 10)
        it("should have corner cases", function () {
            const corners = ["W5S5", "W5N4", "E4S5", "E4N4"]
            const outers = ["W6S5", "W5N5", "E4S6", "E5N4"]

            _(corners).forEach(corner => assert(rooms.includes(corner)))
            _(outers).forEach(outer => assert(!rooms.includes(outer)))
        })

        it("should be the right size", function () {
            assert.equal(100, rooms.length)
        })
    })

    describe("#getAllRoomsInRange()", function () {
        const startRooms = ["E30S30", "W10N5", "E5S23"]
        const rooms = u.getAllRoomsInRange(1, startRooms)
        it("should have 9 rooms per", function () {
            assert.equal(rooms.length, startRooms.length * 9)
        })

        it("should include corner cases", function () {
            const corners = ["E29S29", "W10N6", "E4S23", "E5S23"]
            const outers = ["E28S29", "W10N5", "E3S23"]

            _(corners).forEach(corner => assert(rooms.includes(corner)))
            _(outers).forEach(outer => assert(!rooms.includes(outer)))
        })
    })
})
