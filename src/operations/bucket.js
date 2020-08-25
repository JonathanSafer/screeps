const settings = require("../config/settings")
const observer = require("../buildings/observer")
const military = require("../managers/military")

const b = {
    SIZE: 10000, // 10K constant cpu bucket size

    manage: function() {
        if (b.growingTooQuickly()) {
            b.wasteCpu(0)
        }
    },

    growingTooQuickly: function() {
        Cache.bucket = Cache.bucket || {}
        Cache.bucket.waste = Cache.bucket.waste || 0
        const oldBucket = Cache.bucket.amount
        const newBucket = Game.cpu.bucket
        Cache.bucket.amount = newBucket

        if (!oldBucket) return false
        const delta = newBucket - oldBucket
        const oldRate = Cache.bucket.fillRate || 0
        Cache.bucket.fillRate = 0.99 * oldRate + 0.01 * delta

        const percentEmpty = 1 - Game.cpu.bucket / b.SIZE
        return (Cache.bucket.fillRate > percentEmpty * settings.bucket.growthLimit)
    },

    wasteCpu(amount) {
        Cache.bucket.waste += Math.max(Game.cpu.limit + amount - Game.cpu.getUsed(), 0)
        while (Game.cpu.getUsed() < Game.cpu.limit + amount) {
            //military.attack()
            if(!observer.scanRoom()) break
        }
    }
}
module.exports = b