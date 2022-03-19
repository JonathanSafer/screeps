import actions = require("../lib/actions")
import motion = require("../lib/motion")
import sq = require("../lib/spawnQueue")
import { cN, BodyType } from "../lib/creepNames"

const rRo = {
    name: cN.ROBBER_NAME,
    type: BodyType.robber,

    /** @param {Creep} creep **/
    run: function(creep: Creep) {
        const flagName = "steal"
        const flag = Memory.flags[flagName]

        if (creep.store.getUsedCapacity() == 0) {
            if(!flag){
                creep.suicide()
                return
            }
            if(creep.memory.flagDistance && creep.ticksToLive <= creep.memory.flagDistance){
                creep.suicide()
                sq.respawn(creep)
                return
            }
            //if creep can't complete round trip suicide and respawn
        }
        if(!creep.store.getUsedCapacity() || ((creep.pos.roomName != Game.spawns[creep.memory.city].pos.roomName && creep.store.getFreeCapacity()) && flag)){
            //pick up more stuff
            const flagPos = new RoomPosition(flag.x, flag.y, flag.roomName)
            if(!creep.memory.flagDistance){
                const route = motion.getRoute(Game.spawns[creep.memory.city].pos.roomName, flag.roomName, true)
                if (route == -2) {
                    creep.memory.flagDistance = 1000
                    return
                }
                creep.memory.flagDistance = route.length * 50
            }
            if(Game.rooms[flag.roomName]){
                if(creep.memory.target){
                    const target = Game.getObjectById(creep.memory.target) as StructureStorage
                    if(!target.store[creep.memory.resource]){
                        creep.memory.target = null
                        creep.memory.resource = null
                    }
                }
                if(!creep.memory.target){
                    const structs = _.filter((flagPos.lookFor(LOOK_STRUCTURES) as Array<AnyStoreStructure | Ruin>).concat(flagPos.lookFor(LOOK_RUINS)), s => s.store)
                    for(const struct of structs){
                        const valuables = _.filter(Object.keys(struct.store), k => k != RESOURCE_ENERGY)
                        if (valuables.length){
                            creep.memory.target = struct.id
                            creep.memory.resource = valuables[0] as ResourceConstant
                            break
                        }
                    }
                }
                if(!creep.memory.target){
                    delete Memory.flags[flagName]
                } else {
                    actions.withdraw(creep, Game.getObjectById(creep.memory.target), creep.memory.resource)
                }
            } else {
                motion.newMove(creep, flagPos, 1)
            }
        } else {
            actions.charge(creep, Game.spawns[creep.memory.city].room.storage)
        }
    }  
}
export = rRo