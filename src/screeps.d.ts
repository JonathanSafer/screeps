import _ = require("lodash")

// memory types for our memory structure
declare global {
    interface CostMatrix extends _.Dictionary<number> {}

    interface Room {
        wallCosts?: number
    }

    interface CandidateData {
        sourceDistance?: number
        controllerDistance?: number
    }

    var Cache: ScreepsCache
    type ScreepsCache = RoomDictionary & { 
        boostCheckTime?: number
        boostsAvailable?: Array<string>
    }
    
    interface RoomDictionary {
        [key: string]: RoomCache 
    }
    
    interface RoomCache {
        links?: LinksCache
        factory?: Id<StructureFactory>
        container?: Id<StructureContainer>
        [name: string]: any
    }
    
    interface LinksCache {
        store?: Id<StructureLink>
        upgrade?: Id<StructureLink>
        source?: Array<Id<StructureLink>>
    }
    
    // screeps updated memory map types
    interface Memory { [key: string]: any }
    interface CreepMemory {
        repair?: Id<Structure>
        pullee?: Id<Creep>
        [name: string]: any 
    }
    interface PowerCreepMemory { [name: string]: any }
    interface FlagMemory { [name: string]: any }
    interface SpawnMemory {
        powerSpawn?: Id<StructurePowerSpawn>
        sq?: QueuedCreep[]
        sources?: {
            [name: Id<Source>]: RoomPosition
        }
        [name: string]: any 
    }
    interface RoomMemory { 
        city?: string
        [name: string]: any 
    }
    interface QueuedCreep {
        role?: string
        boosted?: boolean
        flag?: string
    }
    interface SourceMemory {
        roomName?: string
    }
    
    interface Game { [key: string]: any }
    
    var PServ: boolean
    var Tmp: Tmp
    var Log: Log
    interface Tmp { 
        roomsByCity?: _.Dictionary<Room[]>
        creepsByCity?: _.Dictionary<Creep[]>
        myCities?: Room[]
        [name: string]: any 
    }
    interface Log { [name: string]: any }
    interface Position {
        x?: number
        y?: number
    }
}

