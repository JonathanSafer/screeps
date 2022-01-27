
// memory types for our memory structure
declare var Cache: ScreepsCache
type ScreepsCache = RoomDictionary & { 
    boostCheckTime?: number
    boostsAvailable?: Array<string>
}

interface RoomDictionary {
    [key: string]: RoomCache 
}

interface RoomCache {
    links?: LinksCache
    [name: string]: any
}

interface LinksCache {
    store?: string
    upgrade?: string
    source?: string
}

// screeps updated memory map types
interface Memory { [key: string]: any }
interface CreepMemory {
    repair?: string
    pullee?: string
    [name: string]: any 
}
interface PowerCreepMemory { [name: string]: any }
interface FlagMemory { [name: string]: any }
interface SpawnMemory { [name: string]: any }
interface RoomMemory { [name: string]: any }

interface Game { [key: string]: any }

declare var PServ: boolean
declare var Tmp: Tmp
declare var Log: Log
interface Tmp { [name: string]: any }
interface Log { [name: string]: any }
interface Position {
    x?: number
    y?: number
}

// Lodash declaration and typing stub
declare var _: any
