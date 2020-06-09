//Borrowed from Sergey


const settings = require("../config/settings")
const u = require("../lib/utils")
const segmentID = 98
const allyList = settings.allies

// Priority convention:
// 1: I really need this or I'm going to die
// 0: That'd be nice I guess maybe if you really don't mind.
// Everything in between: everything in betweeen
// It's kinda important everybody has the same enums here.
const requestTypes = {
    RESOURCE: 0,
    DEFENSE: 1,
    ATTACK: 2,
    EXECUTE: 3,
    HATE: 4
}
var requestArray


var simpleAllies = {
    // This sets foreign segments. Maybe you set them yourself for some other reason
    // Up to you to fix that.
    checkAllies() {
        if (!allyList.length) return
        // Only work 10% of the time
        if (Game.time % (10 * allyList.length) >= allyList.length) return
        const currentAllyName = allyList[Game.time % allyList.length]
        if (RawMemory.foreignSegment && RawMemory.foreignSegment.username == currentAllyName) {
            const allyRequests = JSON.parse(RawMemory.foreignSegment.data)
            console.log(currentAllyName, RawMemory.foreignSegment.data)
            const requests = u.getsetd(Cache, "requests", {})
            requests[currentAllyName] = []
            for (var request of allyRequests) {
                //const priority = Math.max(0, Math.min(1, request.priority))
                switch (request.requestType) {
                case requestTypes.ATTACK:
                    //console.log("Attack help requested!", request.roomName, priority)
                    break
                case requestTypes.DEFENSE:
                    //console.log("Defense help requested!", request.roomName, priority)
                    break
                case requestTypes.RESOURCE:
                    requests[currentAllyName].push(request)
                    // const resourceType = request.resourceType
                    // const maxAmount = request.maxAmount
                    //console.log("Resource requested!", request.roomName, request.resourceType, request.maxAmount, priority)
                    // const lowerELimit = 350000 - priority * 200000
                    // const lowerRLimit = 24000 - priority * 12000
                    break
                }
            }
        } else {
            //console.log("Simple allies either has no segment or has the wrong name?", currentAllyName)
        }

        const nextAllyName = allyList[(Game.time + 1) % allyList.length]
        RawMemory.setActiveForeignSegment(nextAllyName, segmentID)
    },
    // Call before making any requests
    startOfTick() {
        requestArray = []
    },
    // Call after making all your requests
    endOfTick() {
        if (Object.keys(RawMemory.segments).length < 10) {
            RawMemory.segments[segmentID] = JSON.stringify(requestArray)
            // If you're already setting public segements somewhere this will overwrite that. You should
            // fix that yourself because I can't fix it for you.
            RawMemory.setPublicSegments([segmentID])
        }
    },
    requestAttack(roomName, playerName, priority) {
        const request = {
            requestType: requestTypes.ATTACK,
            roomName: roomName,
            priority: priority === undefined ? 0 : priority,
            playerName: playerName
        }
        requestArray.push(request)

        if (Game.time % 10 == 0) {
            console.log(roomName, "requesting attack", "priority", priority)
        }
    },
    requestHelp(roomName, priority) {
        const request = {
            requestType: requestTypes.DEFENSE,
            roomName: roomName,
            priority: priority === undefined ? 0 : priority
        }
        requestArray.push(request)

        if (Game.time % 10 == 0) {
            console.log(roomName, "requesting help", "priority", priority)
        }
    },
    requestHate(playerName, priority) {
        const request = {
            requestType: requestTypes.HATE,
            playerName: playerName,
            priority: priority === undefined ? 0 : priority
        }
        requestArray.push(request)

        if (Game.time % 10 == 0) {
            console.log(playerName, "requesting Hait", "priority", priority)
        }
    },
    requestResource(roomName, resourceType, maxAmount, priority) {
        const request = {
            requestType: requestTypes.RESOURCE,
            resourceType: resourceType,
            maxAmount: maxAmount,
            roomName: roomName,
            priority: priority === undefined ? 0 : priority
        }
        if (Game.time % 10 == 0) {
            console.log(roomName, "requesting", resourceType, "max amount", maxAmount, "priority", priority)
        }
        requestArray.push(request)
    }
}
module.exports = simpleAllies