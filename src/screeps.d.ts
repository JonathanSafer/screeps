/* eslint-disable no-shadow */
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

    const Cache: ScreepsCache
    type ScreepsCache = RoomDictionary & { 
        time?: number
        dataString?: string
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
    }
    
    interface LinksCache {
        store?: Id<StructureLink>
        upgrade?: Id<StructureLink>
        source?: Array<Id<StructureLink>>
    }

    type BodyDictionary = {
        [key in BodyType]: BodyPartConstant[]
    }

    enum BodyType {
        brick,
        reserver,
        scout,
        quad,
        runner,
        miner,
        normal,
        transporter,
        builder,
        defender,
        unclaimer,
        harasser,
        repairer,
        spawnBuilder,
        trooper,
        ferry,
        breaker,
        medic,
        powerMiner,
        basic,
        lightMiner,
        erunner,
        claimer,
        robber,
        mineralMiner,
        depositMiner
    }
    
    // screeps updated memory map types
    interface Memory { [key: string]: string }
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
        destination?: RoomPosition
        sourcePos?: RoomPosition
        tug?: boolean
        juicer?: boolean
    }
    interface PowerCreepMemory { [name: string]: string }
    interface FlagMemory { 
        boosted?: boolean
        roomName?: string
    }
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
                    [name: Id<StructureLab>]: Reactor
                }
                receivers?: {
                    [name: Id<StructureLab>]: Receiver
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
    }
    interface Reactor {
        fill?: number
        mineral?: ResourceConstant
    }
    interface Receiver {
        fill?: number
        boost?: MineralCompoundConstant | MineralConstant
    }
    interface RoomMemory { 
        city?: string
    }
    interface QueuedCreep {
        role: string
        boosted?: boolean
        flag?: string
    }
    interface SourceMemory {
        roomName?: string
    }
    
    interface Game { [key: string]: string }
    
    const PServ: boolean
    const Tmp: Tmp
    const Log: Log
    type Tmp = TmpDict & { 
        roomsByCity?: _.Dictionary<Room[]>
        creepsByCity?: _.Dictionary<Creep[]>
        myCities?: Room[]
    }
    interface TmpDict {
        [name: string]: string 
    }

    interface Log { [name: string]: string }
    interface Position {
        x?: number
        y?: number
    }
    // Only defined in screeps sim
    const performance: Performance
    interface Performance {
        now: () => number
    }
}

