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
        Object.keys(Game.rooms).forEach((roomName) => {
            var room = Game.rooms[roomName]
            if(Game.flags.plan && Game.flags.plan.pos.roomName == roomName && room.controller.owner && room.controller.owner.username == "Yoner"){
                room.memory.plan = {}
                room.memory.plan.x = Game.flags.plan.pos.x
                room.memory.plan.y = Game.flags.plan.pos.y
                Game.flags.plan.remove();
                p.clearAllStructures(room);
            }
            if (room.memory.plan) {
                var plan = room.memory.plan
                p.buildRoads(room, plan);
                var spawnCount = 0
                _.forEach(template.buildings, function(locations, structureType) {
                    locations.pos.forEach(location => {
                        var pos = {"x": plan.x + location.x - template.offset.x, 
                                   "y": plan.y + location.y - template.offset.y}
                        var name = roomName + spawnCount
                        spawnCount = structureType == STRUCTURE_SPAWN ? spawnCount + 1 : spawnCount
                        if (Game.cpu.getUsed() + 20 > Game.cpu.tickLimit) {
                            return
                        }
                        p.buildConstructionSite(room, structureType, pos, name)
                    })
                })
            }
        })
    },

    buildConstructionSite: function(room, structureType, pos, name) {
        //console.log(room.lookAt(pos.x, pos.y)[0].type)
        let look = room.lookAt(pos.x, pos.y)
        if(room.controller.level < 5 && structureType == STRUCTURE_TERMINAL){
            structureType = STRUCTURE_CONTAINER
        } else if(structureType == STRUCTURE_TERMINAL){
            let struct = _.find(look, object => object.type == 'structure')
            if(struct && struct.structure.structureType == STRUCTURE_CONTAINER){
                struct.structure.destroy()
            }
        }
        if (look.length == 1) {
            //console.log("hi")
            room.createConstructionSite(pos.x, pos.y, structureType, name)
        }
    },

    buildRoads: function(room, plan){
        //need roads to sources, mineral, controller (3 spaces away), exits (nearest exit point for each)
        let roads = [];
        if(!(room.memory.city && Game.spawns[room.memory.city] && Game.spawns[room.memory.city].memory.sources)){
            return;
        }
        let exits = [];
        for(var i = 0; i < template.exits.length; i++){
            let posX = plan.x + template.exits[i].x - template.offset.x;
            let posY = plan.y + template.exits[i].y - template.offset.y;
            let roomPos = new RoomPosition(posX, posY, room.name)
            exits.push(roomPos);
        }//exits now filled with roomPos of all exits from template

        //can this be its own function?
        let costs = new PathFinder.CostMatrix;
        _.forEach(template.buildings, function(locations, structureType) {
            locations.pos.forEach(location => {
                var pos = {"x": plan.x + location.x - template.offset.x, 
                           "y": plan.y + location.y - template.offset.y}
                if(structureType !== STRUCTURE_ROAD){
                    costs.set(pos.x, pos.y, 0xff)
                }
            })
        })
        room.find(FIND_STRUCTURES).forEach(function(struct) {
            if (struct.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(struct.pos.x, struct.pos.y, 1);
            } else if (struct.structureType !== STRUCTURE_CONTAINER &&
                         (struct.structureType !== STRUCTURE_RAMPART ||
                          !struct.my)) {
                // Can't walk through non-walkable buildings
                costs.set(struct.pos.x, struct.pos.y, 0xff);
            }
        });
        room.costs = costs;

        //roads from sources
        const sources = Game.spawns[room.memory.city].memory.sources
        for (var i = 0; i < sources.length; i++) {
            let sourcePos = Game.getObjectById(sources[i]).pos;
            let sourcePath = PathFinder.search(sourcePos, exits, {
                plainCost: 2, swampCost: 2, maxRooms: 1, 
                roomCallback: function(roomName) {
                    return room.costs;
                },
            })
            for(var i = 1; i < sourcePath.path.length; i++){// don't include first path (not needed)
                roads.push(sourcePath.path[i]);
            }
        }

        //road from mineral
        const mineralPos = room.find(FIND_MINERALS)[0].pos;
        let mineralPath = PathFinder.search(mineralPos, exits, {
            plainCost: 2, swampCost: 2, maxRooms: 1, 
            roomCallback: function(roomName) {
                return room.costs;
            },
        })
        for(var i = 1; i < mineralPath.path.length; i++){// don't include first path (not needed)
            roads.push(mineralPath.path[i]);
        } 

        //road from controller
        const structures = room.find(FIND_MY_STRUCTURES);
        const controller = _.find(structures, structure => structure.structureType === STRUCTURE_CONTROLLER);
        const controllerPos = controller.pos;
        let controllerPath = PathFinder.search(controllerPos, exits, {
            plainCost: 2, swampCost: 2, maxRooms: 1, 
            roomCallback: function(roomName) {
                return room.costs;
            },
        })
        for(var i = 2; i < controllerPath.path.length; i++){// don't include first two paths (not needed)
            roads.push(controllerPath.path[i]);
        } 

        //roads from exits
        const terrain = Game.map.getRoomTerrain(room.name)
        let nExits = []
        let sExits = []
        let eExits = []
        let wExits = []
        for(var i = 0; i < 50; i++){
            if(terrain.get(0,i) !== TERRAIN_MASK_WALL){
                let pos = new RoomPosition(0, i, room.name)
                wExits.push(pos)
            }
        }
        for(var i = 0; i < 50; i++){
            if(terrain.get(i,0) !== TERRAIN_MASK_WALL){
                let pos = new RoomPosition(i, 0, room.name)
                nExits.push(pos)
            }
        }
        for(var i = 0; i < 50; i++){
            if(terrain.get(49,i) !== TERRAIN_MASK_WALL){
                let pos = new RoomPosition(49, i, room.name)
                eExits.push(pos)
            }
        }
        for(var i = 0; i < 50; i++){
            if(terrain.get(i,49) !== TERRAIN_MASK_WALL){
                let pos = new RoomPosition(i, 49, room.name)
                sExits.push(pos)
            }
        }
        let roomExits = [nExits, sExits, eExits, wExits];

        let startPoint = template.buildings.storage.pos[0];
        let startPos = new RoomPosition(plan.x + startPoint.x - template.offset.x, plan.y + startPoint.y - template.offset.y, room.name)
        for(var i = 0; i < 4; i++){//find closest Exit point for each side and then path to it
            if(roomExits[i].length){
                let exitPath0 = PathFinder.search(startPos, roomExits[i], {
                    plainCost: 2, swampCost: 2, maxRooms: 1, 
                    roomCallback: function(roomName) {
                        return room.costs;
                    },
                })
                let exitPoint = exitPath0.path[exitPath0.path.length - 1];
                //now path from this point to template exits
                let exitPath = PathFinder.search(exitPoint, exits, {
                    plainCost: 2, swampCost: 2, maxRooms: 1, 
                    roomCallback: function(roomName) {
                        return room.costs;
                    },
                })
                roads.push(exitPath.path[i]);
            }
        }
        console.log(room.memory.city + " roads: " + roads)
        //TODO: build roads, cut this function up, plan and build walls + ramparts
    },

    clearAllStructures: function(room) {
        let structures = room.find(FIND_STRUCTURES);
        _.forEach(structures, structure => {
            structure.destroy();
        })
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
