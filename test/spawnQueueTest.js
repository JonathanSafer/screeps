var assert = require("assert")
const _ = require("lodash")
require("./lib")

describe("spawnQueue", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
        global.Cache = {}
    })
    const sq = require("../built/lib/spawnQueue")
    const rMe = require("../built/roles/medic")
    const rT = require("../built/roles/transporter")
    const rR = require("../built/roles/runner")
    const rH = require("../built/roles/harasser")
    describe("#sort()", function () {
        it("sort urgent spawns first", function () {
            const city = new Room("test")
            const spawn = new StructureSpawn(city, "spawn0", {})
            new StructureController(city)
            sq.schedule(spawn, rMe.name)
            sq.schedule(spawn, rT.name)
            sq.schedule(spawn, rR.name)
            sq.schedule(spawn, rH.name, false, "hi", 100, -3)
            sq.sort(spawn)
            assert.equal(sq.removeNextRole(spawn).role, rH.name)
            assert.equal(sq.removeNextRole(spawn).role, rT.name)
            assert.equal(sq.removeNextRole(spawn).role, rR.name)
            assert.equal(sq.removeNextRole(spawn).role, rMe.name)
        })
    })
})
