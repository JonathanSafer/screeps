import _ = require("lodash")

// memory types for our memory structure
declare global {
    interface CreepRole {
        type?: string
        name?: string
        boosts?: string
        target?: number
    }

    interface QuadStatus {
        leader?: string
        roomEdge?: string
        sameRoom?: boolean
    }

    interface AllRoomStuff {
        creeps?: Creep[]
        hostiles?: Array<Creep | PowerCreep>
        structures?: Structure[]
    }

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
        enemies?: {
            [key: string]: number
        }
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
        target?: Id<RoomObject> // overused
        mode?: number // replaces target for some creeps
        build?: Id<ConstructionSite>
        flag?: string
        mined?: number
        city?: string
        lab?: Id<StructureLab | StructureFactory> // overused
        source?: Id<Mineral | Source> // overused
        medic?: Id<Creep>
        boosted?: number | boolean // overused
        needBoost?: boolean
        bankInfo?: {
            summonHits?: number
            runnersNeeded?: number
            runnersSummoned?: boolean
        }
        jimmys?: Id<Creep>[]
        container?: Id<StructureContainer>
        targetId?: Id<Structure | Resource | Tombstone>
        targetRoom?: string
        flagRoom?: string
        location?: Id<AnyStoreStructure>
        upgradeLink?: Id<StructureLink>
        role?: string
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
        storageLink?: Id<StructureLink>
        ferryInfo?: {
            labInfo?: {
                reactors?: {
                    [name: Id<StructureLab>]: {
                        fill?: number
                        mineral?: ResourceConstant
                    }
                }
                receivers?: {
                    [name: Id<StructureLab>]: {
                        fill?: number
                        boost?: MineralCompoundConstant | MineralConstant
                    }
                }
                boost?: string
            }
            factoryInfo?: {
                transfer?: Array<MineralConstant | MineralCompoundConstant | number>[]
                produce?: string
                factoryLevel?: number
            }
            comSend?: (string | number)[][]
            needPower?: boolean
            mineralRequest?: MineralCompoundConstant | MineralConstant
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

