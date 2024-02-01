import u = require("./utils")
import settings = require("../config/settings")

export const enum CreepActions {
    HARVEST = "harvest",
    DISMANTLE = "dismantle",
    UPGRADE = "upgradeController",
    REPAIR = "repair",
    BUILD = "build",
    HEAL = "heal",
    RANGED_HEAL = "rangedHeal",
    ATTACK = "attack",
    RANGED_ATTACK = "rangedAttack",
    RANGED_MASS_ATTACK = "rangedMassAttack",
    MOVE = "fatigue",
    CARRY = "capacity",
    TOUGH = "damage"
}

const boostsInternal = {
    boostRanking: {},

    // given a creep action, return the body part that can be boosted to do that action
    // TODO: maybe cache this?
    mapActionToPart: function(creepAction: CreepActions) {
        const bodyPart = _.findKey(BOOSTS, part =>
            _.findKey(part, boost =>
                _.find(Object.keys(boost), action =>
                    action == creepAction
                )
            )
        )
        if (!bodyPart) {
            Log.error(`No body part found for action ${creepAction}`)
        }
        return bodyPart
    },

    getBoostRanking: function() {
        if (Object.keys(boostsInternal.boostRanking).length == 0) {
            for (const bodyPartType in BOOSTS) {
                for (const boost in BOOSTS[bodyPartType]) {
                    for (const actionType in BOOSTS[bodyPartType][boost]) {
                        if (!boostsInternal.boostRanking[actionType]) {
                            boostsInternal.boostRanking[actionType] = []
                        }
                        boostsInternal.boostRanking[actionType].push(boost)
                    }
                }
            }
        }
        return boostsInternal.boostRanking
    },
    
    cacheBoostsAvailable: function(cities: Room[]) {
        const empireStore = u.empireStore(cities)
        const cityCount = _.filter(cities, city => city.controller.level >= 7).length || 1
        const boosts = settings.civBoosts.concat(settings.militaryBoosts)
        const boostQuantityRequired = settings.boostsNeeded * cityCount
        const boostsAvailable = _(boosts)
            .filter(boost => empireStore[boost] >= boostQuantityRequired)
            .value()
        Cache.boostsAvailable = boostsAvailable
        Cache.boostCheckTime = Game.time
    },

    boostAvailable: function(boostType: MineralBoostConstant, room: Room) {
        if (!Cache.boostsAvailable || Game.time - Cache.boostCheckTime > 1000) {
            const cities = u.getMyCities()
            boostsInternal.cacheBoostsAvailable(cities)
        }
        const boostsAvailable = Cache.boostsAvailable || []
        return boostsAvailable.includes(boostType)
            || (room && room.terminal && room.terminal.store[boostType] >= LAB_MINERAL_CAPACITY)
    },

    //get highest rank of boost available for an action
    getBoostRankForAction(creepAction: CreepActions, room: Room) {
        const boostRanking = boostsInternal.getBoostRanking()

        for(let i = boostRanking[creepAction].length - 1; i >= 0; i--){
            const boost: MineralBoostConstant = boostRanking[creepAction][i]
            if(boostsInternal.boostAvailable(boost, room)){
                return i + 1
            }
        }
        return 0
    }
}

export const boosts = {
    // given an array of creepActions, return the best boost class that is available for every body part
    // i.e. if we have enough boosts for T3 and T2 dismantle and T2 move, return 2

    getBoostRank: function(creepActions: CreepActions[], room: Room) {
        let boostRank = 3
        for (const creepAction of creepActions) {
            const creepActionBoostRank = boostsInternal.getBoostRankForAction(creepAction, room)
            if (creepActionBoostRank < boostRank) {
                boostRank = creepActionBoostRank
            }
        }
        return boostRank
    },

    getBoostsForRank: function(creepActions: CreepActions[], boostRank: number) {
        const boostRanking = boostsInternal.getBoostRanking()
        const boostsForRank = []
        for (const creepAction of creepActions) {
            const boost = boostRanking[creepAction][boostRank - 1]
            if (boost) {
                boostsForRank.push(boost)
            } else {
                Log.error(`No boost found for action ${creepAction} at rank ${boostRank}`)
            }
        }
        return boostsForRank
    }
}
