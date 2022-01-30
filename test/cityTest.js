var assert = require("assert")
require("./lib")

function roleCreep(room, name, role) {
    const creep = new Creep(room, name)
    creep.memory.role = role
    return creep
}


describe("city", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })
    // var c = require("../built/managers/city")
    const cU = require("../built/lib/creepUtils")
    describe("#scheduleIfNeeded()", function () {
        const sq = require("../built/lib/spawnQueue")
        const rT = require("../built/roles/transporter")
        it("schedules as many as needed", function () {
            const room = new Room("test")
            const city = `${room.name}0`
            const spawn = new StructureSpawn(room, city)
            const creeps = [roleCreep(room, "1", rT.name), roleCreep(room, "2", rT.name)]
            sq.schedule(spawn, rT.name, false)
            cU.scheduleIfNeeded(rT.name, 5, true, spawn, creeps)
            assert.equal(3, sq.getCounts(spawn)[rT.name])
            assert(!sq.removeNextRole(spawn).boosted)
            assert(sq.removeNextRole(spawn).boosted)
            assert(sq.removeNextRole(spawn).boosted)
        })
    })
})
