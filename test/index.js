
// Import lodash
var _ = require("lodash")
global._ = _
require("./lib")

describe("#main", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })
    it("should run without errors", function () {
        const rName = "E10N17"
        const city = `${rName}0`

        const room = new Room(rName)
        new StructureController(room)
        new StructureTerminal(room)
        new StructureStorage(room)
        const creep = new Creep(room, "7")
        creep.memory.role = "remoteMiner"
        creep.memory.city = city
        new StructureSpawn(room, city)
        new StructureSpawn(room, "test")
        new StructureFactory(room, 1)

        console.log("Loaded constants for test")

        // Load main
        const main = require("../src/main.js")
        console.log("Initialized main")

        // Loop main
        main.loop()
        console.log("Completed main loop")
    })    
})



