var assert = require("assert")
require("./lib")

describe("observer", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })

    var o = require("../src/buildings/observer.js")

    describe("#findRoomsForScan()", function () {
        it("should find 441 rooms", function () {
            const rN = "E0N0"
            const room = new Room(rN)
            new StructureController(room)
            o.findRoomsForScan()
            assert.equal(441, Cache.rooms[rN].scannerTargets.length)
        })
    })
})
