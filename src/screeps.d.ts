
// screeps updated memory map types
interface Memory { [key: string]: any }
interface CreepMemory { [name: string]: any }
interface FlagMemory { [name: string]: any }
interface SpawnMemory { [name: string]: any }
interface RoomMemory { [name: string]: any }

interface Game { [key: string]: any }

declare var PServ: boolean

// Lodash declaration and typing stub
declare var _: LodashLibrary
interface LodashLibrary { [key: string]: any }
