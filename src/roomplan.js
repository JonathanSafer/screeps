let rS = require("scout")
let template = require("template")

let p = {
    frequency: 2000,

    findRooms: function() {
        if (!p.newRoomNeeded()) {
            return
        }
        let rooms = p.getAllRoomsInRange()
        let validRooms = p.getValidRooms(rooms)
        let rankings = p.sortByScore(validRooms)
        if (rankings.length) {
            p.addRoom(rankings[0])
        }
        return
    },

    planRooms: function() {
        // TODO

        // 1. for rooms I own. If room has a spawn or a plan, ignore. otherwise plan.
        // 2. if bucket is less than 3k, return
        // 

    },

    buildConstructionSites: function() {
        Game.rooms.forEach((roomName) => {
            if (Game.rooms[roomName].memory.plan) {
                var room = Game.rooms[roomName]
                var plan = room.memory.plan
                var spawnCount = 0
                _.forEach(template.buildings, function(locations, structureType) {
                    locations.pos.forEach(location => {
                        var pos = {"x": plan.x + location.x, "y": plan.y + location.y}
                        var name = roomName + spawnCount
                        spawnCount = spawnCount + 1
                        p.buildConstructionSite(room, structureType, pos, name)
                    })
                })
            }
        })
    },

    buildConstructionSite: function(room, structureType, pos, name) {
        if (room.lookAt(pos.x, pos.y).length == 0) {
            room.createConstructionSite(pos.x, pos.y, structureType, name)
        }
    },

    planRoom: function(roomName) {
        // TODO
        // var room = Game.rooms[roomName]
        var ter = Game.map.getRoomTerrain(roomName)
        var sqd = Array(50).fill().map(e => Array(50))
        var i, j;
        for (i = 0; i < 50; i++) {
            for (j = 0; j < 50; j++) {
                sqd[i][j] = ter.get(i, j) == TERRAIN_MASK_WALL ? 0 : 
                    i < 2 || i > 47 || j < 2 || j > 47 ? 0 : 
                    Math.min(sqd[i - 1][j], sqd[i][j - 1], sqd[i - 1][j - 1]) + 1
            }
        }
        
        for (i = 47; i >= 2; i--) {
            for (j = 2; j <= 47; j++) {
                sqd[i][j] = Math.min(sqd[i][j], Math.min(sqd[i + 1][j], sqd[i + 1][j - 1]) + 1)
            }
        }
        
        for (i = 47; i >= 2; i--) {
            for (j = 47; j >= 2; j--) {
                sqd[i][j] = Math.min(sqd[i][j], Math.min(sqd[i + 1][j + 1], sqd[i][j + 1]) + 1)
            }
        }
        
        for (i = 2; i <= 47; i++) {
            for (j = 47; j >= 2; j--) {
                sqd[i][j] = Math.min(sqd[i][j], sqd[i - 1][j + 1] + 1)
            }
        }
        
        for (i = 0; i < 50; i++) {
            for (j = 0; j < 50; j++) {
                if (sqd[i][j] > 6) {
                    //console.log(i, j)--- save i & j as "planned"
                    //return
                }
                //var hex = sqd[i][j].toString(16)
                //room.visual.text(sqd[i][j], i, j, {color: "#" + "00" + hex + hex + hex + hex})
            }
        }
    },

    newRoomNeeded: function() {    
        return (Game.time % p.frequency === 0) &&
            (Game.gcl.level > p.roomsSelected.length) &&
            p.hasCpu() &&
            p.totalEnergy() > 200000 &&
            p.isRcl4() &&
            p.myRooms().length === p.roomsSelected().length
    },

    getAllRoomsInRange: function() {
        let d = 10
        let myRooms = p.roomsSelected()
        let pos = _.map(myRooms, p.roomNameToPos)
        let posXY = _.unzip(pos);
        let ranges = _.map(posXY, coords => _.range(_.min(coords) - d, _.max(coords) + 1 + d))
        let roomCoords = _.flatten(_.map(ranges[0], x => _.map(ranges[1], y => [x, y])))
        let roomNames = _.map(roomCoords, p.roomPosToName)
        return roomNames
    },

    roomNameToPos: function(roomName) {
        let quad = roomName.match(/[NSEW]/g)
        let coords = roomName.match(/[0-9]+/g)
        let x = Number(coords[0])
        let y = Number(coords[1])
        return [
            quad[0] === 'W' ? 0 - x : 1 + x,
            quad[1] === 'S' ? 0 - y : 1 + y
        ]
    },

    roomPosToName: function(roomPos) {
        let x = roomPos[0]
        let y = roomPos[1]
        return (x <= 0 ? "W" + String(-x) : "E" + String(x - 1)) +
            (y <= 0 ? "S" + String(-y) : "N" + String(y - 1))
    },

    getValidRooms: function(rooms) {
        return _.filter(rooms, p.isValidRoom)
    },

    isValidRoom: function(roomName) {
        if (!Game.map.isRoomAvailable(roomName)) return false
        return false
    },

    sortByScore: function(rooms) {
        return rooms // TODO
    },

    addRoom: function(room) {
        let selected = p.roomsSelected()
        selected.push(room.name)
    },

    roomsSelected: function() {
        let selected = Memory.rooms.selected
        if (!selected) {
            selected = p.myRoomNames()
            Memory.rooms.selected = selected
        }
        return selected
    },

    isRcl4: function() {
        let rooms = p.myRooms();
        let rcls = _.map(rooms, (room) => room.controller.level)
        return _.max(rcls) >= 4;
    },

    totalEnergy: function() {
        let rooms = p.myRooms();
        let energy = _.map(rooms, p.getStorageEnergy)
        return _.sum(energy)
    },

    getStorageEnergy: function(room) {
        return room.storage ? room.storage.store.energy : 0
    },

    myRooms: function() {
        return _.filter(Game.rooms, (room) => rS.iOwn(room.name))
    },

    myRoomNames: function() {
        return _.map(p.myRooms(), (room) => room.name)
    },

    hasCpu: function () {
        let used = Memory.stats['cpu.getUsed']
        return (used !== undefined) && (used < Game.cpu.tickLimit / 2)
    }
}

module.exports = p