var m = {
    localMemory: {},

    /* write to local memory only */
    writeCache: function(storageLocation, data) {
        m.localMemory[storageLocation] = data
    },

    /* write to permanent memory (also caches locally) */
    writePermanent: function(storageLocation, data) {
        Memory[storageLocation] = data
        m.writeCache(storageLocation, data)
    },

    /* write to permanent memory (also caches locally) */
    readPermanent: function(storageLocation) {
        let data = Memory[storageLocation]
        m.writeCache(storageLocation, data) // cache for future callers
        return data
    },

    /* write to local memory only */
    readCache: function(storageLocation) {
        let localData = m.localMemory[storageLocation]
        return localData != null ? localData : m.readPermanent(storageLocation)
    },

    /* read creep memory. @cache is a bool if cached is ok. */
    readCreepMemory: function(creep, cache) {
        let storageLocation = "creeps"
        if (cache) {
            let allCreeps = m.readCache(storageLocation)
            let myCreep = allCreeps != null ? allCreeps[creep.name] : null
            if (myCreep != null) return myCreep
        }
        // If we reach here, caching is false or cache returned null
        let allCreeps = m.readPermanent(storageLocation)
        return allCreeps != null ? allCreeps[creep.name] : null
    }
};

module.exports = m;