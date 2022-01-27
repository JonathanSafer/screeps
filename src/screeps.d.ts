
// memory types for our memory structure
declare var Cache: ScreepsCache
interface ScreepsCache { [key: string]: RoomCache }

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
interface CreepMemory { [name: string]: any }
interface FlagMemory { [name: string]: any }
interface SpawnMemory { [name: string]: any }
interface RoomMemory { [name: string]: any }

interface Game { [key: string]: any }

declare var PServ: boolean
declare var Tmp: Tmp
interface Tmp { [name: string]: any }


// Lodash declaration and typing stub
declare var _: any
