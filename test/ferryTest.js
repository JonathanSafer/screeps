const assert = require("assert")
require("./lib")

const rF = require("../built/roles/ferry.js")

describe("ferry", function (){
    let room, spawn, storage, storageLink, upgradeLink, taskQueue
    beforeEach(function (){
        Game.reset()
        Memory.reset()

        room = new Room("test")
        spawn = new StructureSpawn(room)
        storage = new StructureStorage(room)
        storageLink = new StructureLink(room)
        upgradeLink = new StructureLink(room)
        taskQueue = []
        spawn.memory.storageLink = storageLink.id
        Cache[room.name] = {
            links: {
                upgrade: upgradeLink.id
            }
        }
    })

    describe("#queueUpgradeLinkTransfer", function () {
        it("schedules an upgrade link transfer when needed", function () {
            rF.queueUpgradeLink(taskQueue, spawn)

            assert(taskQueue.length == 1)
            assert(taskQueue[0].sourceId == storage.id)
            assert(taskQueue[0].targetId == storageLink.id)
            assert(taskQueue[0].resourceType == RESOURCE_ENERGY)
            assert(taskQueue[0].quantity == LINK_CAPACITY)  
        })

        it("doesn't schedule if transfer has begun", function () {
            storageLink.store.energy = LINK_CAPACITY
            
            rF.queueUpgradeLink(taskQueue, spawn)

            assert(!taskQueue.length)
        })

        it("doesn't schedule if upgrade link has energy", function () {
            upgradeLink.store.energy = 45
            
            rF.queueUpgradeLink(taskQueue, spawn)

            assert(!taskQueue.length)
        })

        it("doesn't schedule if upgrade link is destroyed", function () {
            Cache[room.name].links.upgrade = "foo"
            
            rF.queueUpgradeLink(taskQueue, spawn)

            assert(!taskQueue.length)
        })

        it("doesn't schedule if storage link is destroyed", function () {
            spawn.memory.storageLink = storageLink.id = "foo"
            
            rF.queueUpgradeLink(taskQueue, spawn)

            assert(!taskQueue.length)
        })

        it("doesn't schedule if storage link is on cooldown", function () {
            storageLink.cooldown = 4
            
            rF.queueUpgradeLink(taskQueue, spawn)

            assert(!taskQueue.length)
        })
    })
})