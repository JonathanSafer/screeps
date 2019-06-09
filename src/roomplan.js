let rS = require("scout")

let p = {
    frequency: 2000,

    findRooms: function() {
        if (!p.newRoomNeeded()) {
            return
        }
        let rooms = p.getAllRoomsInRange()
        let distantRooms = p.getDistantRooms(rooms)
        let roomsWithAController = p.getRoomsWithAController(distantRooms)
        let rankings = p.sortByScore(roomsWithAController)
        if (rankings.length) {
            p.addRoom(rankings[0])
        }
        return
    },

    planRooms: function() {
        // TODO
    },

    buildConstructionSites: function() {
        // TODO
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
        let myRooms = p.roomsSelected()
        let pos = _.map(myRooms, (room) => (room.name.match("/[A-Z]|\d+/g")))
        let nsPos = pos.sort(p.cardCompNS)
        let ewPos = pos.sort(p.cardCompEW)
        let northernPt = nsPos[-1]

        return []
    },

    cardCompNS: function(pos1, pos2) {
        return pos1[0] < pos2[0] ||  // North > South
            (pos1[0] === 'N' && pos1[1] > pos2[1]) || // N20 > N1
            (pos1[0] === 'S' && pos1[1] < pos2[1]) // S1 > S20
    },

    cardCompEW: function(pos1, pos2) {
        return pos1[0] < pos2[0] ||  // East > West
            (pos1[0] === 'E' && pos1[1] > pos2[1]) || // E20 > E1
            (pos1[0] === 'W' && pos1[1] < pos2[1]) // W1 > W20
    },

    getDistantRooms: function(rooms) {
        // TODO
        return rooms
    },

    getRoomsWithAController: function(rooms) {
        return _.filter(rooms, (room) => room.controller !== undefined)
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