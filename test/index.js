
// Define globals and classes
require("./lib")

const names = {
    FERRY_NAME: "ferry",
    DEFENDER_NAME: "defender",
    TRANSPORTER_NAME: "transporter",
    REMOTE_MINER_NAME: "remoteMiner",
    RUNNER_NAME: "runner",
    UPGRADER_NAME: "upgrader",
    BUILDER_NAME: "builder",
    QUAD_NAME: "quad",
    MINERAL_MINER_NAME: "mineralMiner",
    CLAIMER_NAME: "claimer",
    UNCLAIMER_NAME: "unclaimer",
    SPAWN_BUILDER_NAME: "spawnBuilder",
    HARASSER_NAME: "harasser",
    MEDIC_NAME: "medic",
    BREAKER_NAME: "breaker",
    POWER_MINER_NAME: "powerMiner",
    ROBBER_NAME: "robber",
    DEPOSIT_MINER_NAME: "depositMiner",
    SCOUT_NAME: "scout",
    QR_CODE_NAME: "qrCode",
    REPAIRER_NAME: "repairer",
    RESERVER_NAME: "reserver",
    BRICK_NAME: "brick"
}

global.RESOURCE_THORIUM = "T"

describe("#main", function () {
    beforeEach(function() {
        Game.reset()
        Memory.reset()
    })
    it("should run without errors", function () {
        let counter = 0
        function getNextName() {
            counter++
            return String(counter)
        }

        this.timeout(10000)
        const rName = "E10N17"
        const city = `${rName}0`

        const room = new Room(rName)
        room.memory.plan = {"x": 25, "y": 25}
        new StructureController(room)
        new StructureTerminal(room)
        new StructureStorage(room)
        new Mineral(room, "X")
        new Source(room, "Y")
        new Source(room, "Z")
        const roles = Object.values(names)
        for (const role of roles) {
            const creep = new Creep(room, getNextName())
            creep.memory.role = role
            creep.memory.city = city
        }
        new StructureSpawn(room, city)
        new StructureSpawn(room, "test")
        new StructureFactory(room, 1)

        console.log("Loaded constants for test")

        // Load main
        const main = require("../built/main.js")
        console.log("Initialized main")

        // Loop main
        main.loop()
        console.log("Completed main loop")
    })    
})



