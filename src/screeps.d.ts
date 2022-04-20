/* eslint-disable no-shadow */
import _ = require("lodash")
import { BodyType } from "./lib/creepNames"
export { BodyType } from "./lib/creepNames"


// memory types for our memory structure
declare global {
    interface CreepRole {
        type?: BodyType
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
        wallCosts?: CostMatrix
    }

    interface CandidateData {
        sourceDistance?: number
        controllerDistance?: number
    }

    var Cache: ScreepsCache
    type ScreepsCache = RoomDictionary & { 
        bucket?: {
            waste?: number
            amount?: number
            fillRate?: number
        }
        time?: number
        dataString?: string
        boostCheckTime?: number
        boostsAvailable?: Array<string>
        enemies?: {
            [key: string]: number
        }
        roomsToScan?: Set<string>
    }
    
    interface RoomDictionary {
        [key: string]: RoomCache 
    }
    
    interface RoomCache {
        damageMatrix?: CostMatrix
        quadMatrix?: CostMatrix
        links?: LinksCache
        factory?: Id<StructureFactory>
        container?: Id<StructureContainer>
        enemy?: boolean
    }
    
    interface LinksCache {
        store?: Id<StructureLink>
        upgrade?: Id<StructureLink>
        source?: Array<Id<StructureLink>>
    }

    type BodyDictionary = {
        [key in BodyType]?: BodyPartConstant[]
    }
    
    // screeps updated memory map types
    interface Memory { 
        data?: {
            lastReset: number
            section: number
        }
        stats?: {
            [key: string]: number
        }
        roomsSelected?: string[]
        gameState?: number
        counter?: number
        avgCpu?: number
        sellPoint?: {
            [key: string]: number
        }
        remotes?: {
            [key: string]: number
        }
        profiler?: {
            disableTick: number
            enabledTick: number
            filter: string
            type: string
            map: {
                [key: string]: {
                    calls: number
                    time: number
                }
            }
            totalTime?: number
        }
     }
    interface CreepMemory {
        building?: boolean
        hasRally?: boolean
        paired?: boolean
        resource?: ResourceConstant
        flagDistance?: number
        repPower?: number
        miningPos?: RoomPosition
        moveStatus?: string
        spawnBuffer?: number
        link?: Id<StructureLink>
        construction?: boolean
        tolerance?: number
        safeTime?: number
        rally?: RoomPosition
        captain?: boolean
        state?: number
        row?: number
        aware?: boolean
        suicideTime?: number
        anger?: number
        dormant?: boolean
        respawnTime?: number
        reinforced?: boolean
        quantity?: number
        labNum?: number
        reactor?: boolean
        nuker?: Id<StructureNuker>
        mineral?: ResourceConstant
        nextCheckTime?: number
        path?: string
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
    interface PowerCreepMemory { 
        state?: number
        [name: string]: string
     }
    interface FlagMemory { 
        startTime?: number
        boosted?: boolean
        roomName?: string
        harvested?: number
        x?: number
        y?: number
        removeTime?: number
    }
    interface SpawnMemory {
        wallMultiplier?: number
        spawnAvailability?: number
        towersActive?: boolean
        powerRooms?: string[]
        powerSpawn?: Id<StructurePowerSpawn>
        sq?: QueuedCreep[]
        upgradeLinkPos?: number
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
        termUsed?: number | boolean
        plan?: {
            x?: number
            y?: number
            roomName?: string
        }
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
    
    interface Game { 
        profiler: {
            stream: (d: number, f?: string) => void
            email: (d: number, f?: string) => void
            profile: (d: number, f?: string) => void
            background: (f: string) => void
            restart: () => void
            reset: () => void
            output: (d: number) => string
        }
     }
    
    var PServ: boolean
    var Log: Log
    var Tmp: Tmp
    type Tmp = TmpDict & { 
        roomsByCity?: _.Dictionary<Room[]>
        creepsByCity?: _.Dictionary<Creep[]>
        myCities?: Room[]
    }
    interface TmpDict {
        [name: string]: {
            attacks?: Array<AttackData>
        }
    }
    interface AttackData {
        x: number
        y: number
        damage: number
    }

    interface Log { [name: string]: (name: string) => void }
    interface Position {
        x?: number
        y?: number
    }
    // Only defined in screeps sim
    var performance: Performance
    interface Performance {
        now: () => number
    }
}



