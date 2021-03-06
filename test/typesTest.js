var assert = require("assert")
require("./lib")

describe("types", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })
    var t = require("../src/config/types.js")
    describe("#depositMinerBody()", function () {
        it("source is barely harvested for boosted & unboosted", function () {
            const boostedBody = t.depositMinerBody(1000, 500, true, [1, 1, 1])
            const normalBody = t.depositMinerBody(1000, 500, false, [1, 1, 1])
            assert.deepEqual(boostedBody, [10, 22, 16])
            assert.deepEqual(normalBody, [5, 18, 12])
        })

        it("source is heavily harvested for boosted & unboosted", function () {
            const boostedBody = t.depositMinerBody(1000, 7000, true, [1, 1, 1])
            const normalBody = t.depositMinerBody(1000, 7000, false, [1, 1, 1])
            assert.deepEqual(boostedBody, [10, 7, 10])
            assert.deepEqual(normalBody, [20, 9, 20])
        })
    })
})
