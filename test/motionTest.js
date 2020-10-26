var assert = require("assert")
require("./lib")

describe("motion", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })
    var m = require("../src/lib/motion")
    describe("#getBoundingBox()", function () {
        it("makes the expected box", function () {
            const room = new Room("test")
            room.memory.plan = { x: 23, y: 21 }
            const box = m.getBoundingBox(room)
            assert.equal(21, box.top)
            assert.equal(23, box.left)
            assert.equal(31, box.bottom)
            assert.equal(35, box.right)
        })
    })

    describe("#enforceBoundingBox()", function () {
        it("blocks movement outside bounding box", function () {
            const costMatrix = new PathFinder.CostMatrix()
            const box = new m.BoundingBox(21, 23, 31, 35)
            m.enforceBoundingBox(costMatrix, box)
            assert.equal(0, costMatrix.get(25, 25))
            assert.equal(20, costMatrix.get(22, 20))
        })
    })
})