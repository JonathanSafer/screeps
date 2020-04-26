var assert = require("assert")
require("./lib")

describe("observer", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })

    var o = require("../src/observer.js")

    describe("#findRoomsForScan()", function () {
        it("should find 81 rooms", function () {
            const rN = "E0N0"
            const room = new Room(rN)
            new StructureController(room)
            o.findRoomsForScan()
            assert.equal(81, Cache.rooms[rN].scannerTargets.length)
        })
    })
})
