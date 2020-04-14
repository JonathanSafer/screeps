var assert = require("assert")
const _ = require("lodash")
require("./lib")

var rT = require("../src/transporter.js")

describe("transporter", function () {
    var room, cntrl, ext, ext2, f
    beforeEach(function() {
        Game.reset()
        Memory.reset()

        room = new Room("test")
        cntrl = new StructureController(room)
        ext = new StructureExtension(room)
        ext2 = new StructureExtension(room, { "energy": 200 })
        f = new StructureFactory(room)
        f.store[RESOURCE_ENERGY] = 5000
    })

    describe("#needsEnergy()", function () {
        it("returns true for structures that need energy", function () {
            assert(!rT.needsEnergy(cntrl))
            assert(rT.needsEnergy(ext))
            assert(!rT.needsEnergy(ext2))
            assert(rT.needsEnergy(f))
        })
    })

    describe("#emptyTargets()", function () {
        it("should find 2 empty targets", function () {
            const targets = rT.emptyTargets(room)
            assert.equal(2, targets.length)
            assert(_(targets).find(id => id == ext.id))
            assert(_(targets).find(id => id == f.id))
        })
    })
})