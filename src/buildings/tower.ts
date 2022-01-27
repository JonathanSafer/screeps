var T = {

    chooseTarget: function(towers, hostiles, roomName) {
        if(!towers.length){
            return null
        }
        const healMap = T.generateHealMap(hostiles)
        for(var i = 0; i < hostiles.length; i++){
            if(hostiles[i].pos.x == 49 || hostiles[i].pos.y == 49 || hostiles[i].pos.x == 0 || hostiles[i].pos.y == 49){
                continue
            }
            let damage = T.calcTowerDamage(towers, hostiles[i])
            if(Tmp[roomName] && Tmp[roomName].attacks){
                for(const attack of Tmp[roomName].attacks){
                    if(hostiles[i].pos.isEqualTo(attack.x, attack.y)){
                        damage +=  attack.damage
                    }
                }
            }
            const heal = T.calcHeal(hostiles[i], healMap)
            if(heal > damage){
                continue
            }
            //check creep for boosted tough
            const toughs = T.findToughs(hostiles[i])
            const buffer = toughs * 333.33
            if(damage < buffer){
                damage = damage * 0.3
            } else if(buffer){
                damage = (damage - buffer) + (toughs * 50)
            }
            if(damage > heal + 100){
                return hostiles[i]
            }
        }
        //if we make it here, none of the targets could be out gunned
        //shoot randomly every few ticks, maybe mess something up
        if(Game.time % 12 === 0){
            return hostiles[Math.floor(Math.random() * hostiles.length)]
        }
        return null
    },

    calcTowerDamage: function(towers, target) {
        let damage = 0
        for(let i = 0; i < towers.length; i++){
            if(towers[i].energy >= TOWER_ENERGY_COST){
                const distance = towers[i].pos.getRangeTo(target.pos)
                const damage_distance = Math.max(TOWER_OPTIMAL_RANGE, Math.min(distance, TOWER_FALLOFF_RANGE))
                const steps = TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE
                const step_size = TOWER_FALLOFF * TOWER_POWER_ATTACK / steps
                damage += TOWER_POWER_ATTACK - (damage_distance - TOWER_OPTIMAL_RANGE) * step_size
            }
        }
        return damage
    }, 

    findToughs: function(creep){
        if(creep.className){//creep is PC
            return 0
        }
        const toughs = creep.getActiveBodyparts(TOUGH)
        if(toughs == 0){
            return 0
        }
        let boosted = false
        for(var i = 0; i < creep.body.length; i++){
            if(creep.body[i].type === TOUGH){
                if(creep.body[i].boost){
                    boosted = true
                }
                break
            }
        }
        if(boosted == true){
            return toughs
        } else {
            return 0
        }
    },

    calcHeal: function(creep, healMap){
        return healMap[creep.pos.x][creep.pos.y]
    },  

    generateHealMap: function(hostiles) {
        const map = []
        for(let i = 0; i < 50; i++){
            map[i] = []
            for(let j = 0; j < 50; j++){
                map[i][j] = 0
            }
        }
        for(let i = 0; i < hostiles.length; i++){
            if(hostiles[i].className){//creep is PC
                continue
            }
            //check each hostile for heals, and put them at creep's pos
            const heals = hostiles[i].getActiveBodyparts(HEAL)
            if(heals == 0){
                continue
            }
            let boostMultiplier = 1
            //if creep has one heal boosted, assume all are T3 boosted
            for(let j = 0; j < hostiles[i].body.length; j++){
                if(hostiles[i].body[j].type === HEAL){
                    if(hostiles[i].body[j].boost){
                        boostMultiplier = BOOSTS[HEAL][hostiles[i].body[j].boost][HEAL]
                    }
                    break
                }
            }
            const heal = heals * HEAL_POWER * boostMultiplier
            for(var j = hostiles[i].pos.x - 3; j <= hostiles[i].pos.x + 3; j++){
                for(var k = hostiles[i].pos.y - 3; k <= hostiles[i].pos.y + 3; k++){
                    const range = Math.abs(j - hostiles[i].pos.x) <= 1 && Math.abs(k - hostiles[i].pos.y) <= 1 ? 1 : 3
                    if(j >= 0 && j <= 49 && k >= 0 && k <= 49){
                        map[j][k] += (heal/range)
                    }
                }
            }
        }
        return map
    }
}
export = T
