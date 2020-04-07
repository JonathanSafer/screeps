const settings = require("./settings")

const b = {
    SIZE: 10000, // 10K constant cpu bucket size

    manage: function() {
        if (b.growingTooQuickly()) {
            b.wasteCpu(10 * settings.bucket.growthLimit)
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
        const oldRateLong = Cache.bucket.fillRateLong || 0
        const oldRateMax = Cache.bucket.fillRateMax || 0

        // track rates with 3 different dropoffs for stats
        Cache.bucket.fillRate = 0.9 * oldRate + 0.1 * delta // exponential moving avg
        Cache.bucket.fillRateLong = 0.95 * oldRateLong + 0.05 * delta
        Cache.bucket.fillRateMax = 0.99 * oldRateMax + 0.01 * delta

        const percentEmpty = 1 - Game.cpu.bucket / b.SIZE
        return (Cache.bucket.fillRateMax > percentEmpty * settings.bucket.growthLimit)
    },

    wasteCpu(amount) {
        Cache.bucket.waste += Math.max(Game.cpu.limit + amount - Game.cpu.getUsed(), 0)
        while (Game.cpu.getUsed() < Game.cpu.limit + amount) {
            _.filter(Game.creeps, () => false) // filter creeps an do nothing with it
        }
    }
}
module.exports = b