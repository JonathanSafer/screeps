var assert = require("assert")
require("./lib")

function testRoom(rcl) {
    return {
        controller: {
            level: rcl
        }
    }
}

describe("types", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })
    var t = require("../built/config/types.js")
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

    describe("#getRecipe()", function () {
        it("can afford to produce a miner at rcl0, 1, 2", function () {
            const rM = require("../built/roles/remoteMiner.js")
            Game.cpu.bucket = 10000 // Full bucket at low rcl
            const sourceMaxEnergy = 300
            const b0 = t.getRecipe(rM.type, sourceMaxEnergy, testRoom(0))
            const b1 = t.getRecipe(rM.type, sourceMaxEnergy, testRoom(1))
            const b2 = t.getRecipe(rM.type, sourceMaxEnergy, testRoom(2))
            assert(t.cost(b0) <= sourceMaxEnergy)
            assert(t.cost(b1) <= sourceMaxEnergy)
            console.log(b2)
            assert(t.cost(b2) <= sourceMaxEnergy)
        })

        it("can afford to produce a runner at rcl0, 1, 2", function () {
            const rR = require("../built/roles/runner.js")
            Game.cpu.bucket = 10000 // Full bucket at low rcl
            const sourceMaxEnergy = 300
            const b0 = t.getRecipe(rR.type, sourceMaxEnergy, testRoom(0))
            const b1 = t.getRecipe(rR.type, sourceMaxEnergy, testRoom(1))
            const b2 = t.getRecipe(rR.type, sourceMaxEnergy, testRoom(2))
            assert(t.cost(b0) <= sourceMaxEnergy)
            assert(t.cost(b1) <= sourceMaxEnergy)
            assert(t.cost(b2) <= sourceMaxEnergy)
        })

        it("can afford to produce a upgrader at rcl0, 1, 2", function () {
            const rU = require("../built/roles/upgrader.js")
            Game.cpu.bucket = 10000 // Full bucket at low rcl
            const sourceMaxEnergy = 300
            const b0 = t.getRecipe(rU.type, sourceMaxEnergy, testRoom(0))
            const b1 = t.getRecipe(rU.type, sourceMaxEnergy, testRoom(1))
            const b2 = t.getRecipe(rU.type, sourceMaxEnergy, testRoom(2))
            assert(t.cost(b0) <= sourceMaxEnergy)
            assert(t.cost(b1) <= sourceMaxEnergy)
            assert(t.cost(b2) <= sourceMaxEnergy)
        })

        it("can afford to produce a transporter at 1, 2", function () {
            const rT = require("../built/roles/transporter.js")
            Game.cpu.bucket = 10000 // Full bucket at low rcl
            const sourceMaxEnergy = 300
            const b0 = t.getRecipe(rT.type, sourceMaxEnergy, testRoom(0))
            const b1 = t.getRecipe(rT.type, sourceMaxEnergy, testRoom(1))
            const b2 = t.getRecipe(rT.type, sourceMaxEnergy, testRoom(2))
            assert(t.cost(b0) <= sourceMaxEnergy)
            assert(t.cost(b1) <= sourceMaxEnergy)
            assert(t.cost(b2) <= sourceMaxEnergy)
        })
    })
})
