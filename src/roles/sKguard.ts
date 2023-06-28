import motion = require("../lib/motion")
import u = require("../lib/utils")
import { cN, BodyType } from "../lib/creepNames"

const rSK = {
    name: cN.SK_GUARD_NAME,
    type: BodyType.sKguard,
   
    run: function(creep: Creep) {
        rSK.healAndShoot(creep)
        if(creep.memory.target){
            const target = Game.getObjectById(creep.memory.target)
            if(target){
                motion.newMove(creep, target.pos, 1)
                return
            } 
        }
        const targetRoom = creep.memory.flag
        if(Game.rooms[targetRoom]){
            const room = Game.rooms[targetRoom]
            const sourceKeeper = _.find(u.findHostileCreeps(room), c => c.owner.username == "Source Keeper")
            if(sourceKeeper){
                motion.newMove(creep, sourceKeeper.pos, 1)
                creep.memory.target = sourceKeeper.id
            } else {
                //find source keeper spawners
                const sKSpawners = room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_KEEPER_LAIR}) as StructureKeeperLair[]
                // sort spawners by respawn time
                const nextSpawn = _.sortBy(sKSpawners, s => s.ticksToSpawn)[0]
                // move to spawner
                motion.newMove(creep, nextSpawn.pos, 1)
            }
        } else {
            motion.newMove(creep, new RoomPosition(25, 25, targetRoom), 24)
        }
    },

    healAndShoot: function(creep: Creep) {
        const meleeTarget = _.find(u.findHostileCreeps(creep.room), c => c.pos.isNearTo(creep.pos))
        const rangedTarget = _.find(u.findHostileCreeps(creep.room), c => c.pos.getRangeTo(creep.pos) <= 3)
        if(meleeTarget){
            creep.rangedMassAttack()
        } else if(rangedTarget){
            creep.rangedAttack(rangedTarget)
        }
        if (creep.hits < creep.hitsMax || rangedTarget){
            creep.heal(creep)
        }
    }
}
export = rSK