const settings = require("./settings")

const b = {
    drop: 0.9,

    manage: function() {
        if (b.growingTooQuickly()) {
            Log.debug(`Wasting cpu at growth rate ${Cache.bucket.fillRate}`)
            b.wasteCpu()
        }
    },

    growingTooQuickly: function() {
        if (!Cache.bucket) Cache.bucket = {}
        const oldBucket = Cache.bucket.amount
        const newBucket = Game.bucket
        Cache.bucket.amount = newBucket

        if (!oldBucket) return false
        const delta = newBucket - oldBucket
        const oldRate = Cache.bucket.fillRate || 0
        const newRate = b.drop * oldRate + (1 - b.drop) * delta // exponential moving avg
        Cache.bucket.fillRate = newRate
        return (newRate > settings.bucket.growthLimit)
    },

    wasteCpu(amount) {
        while (Game.cpu.getUsed() < Game.cpu.limit + amount) {
            _.filter(Game.creeps, () => false) // filter creeps an do nothing with it
        }
    }
}
module.exports = b