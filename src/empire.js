var em = {
    
    expand: function() { // run every 500
        if (em.canExpand() && !Memory.flags.claim && !Memory.flags.plan) {
            em.claimNextRoom()
        }
    },

    claimNextRoom: function() {
        let claimFlags = em.getFlagsOfType("claim")
        let claimFlag = claimFlags[0]
        let roomSuffix = claimFlag.name.substr(5)
        let planFlag = Game.flags["plan" + roomSuffix]

        // apparently you need vision to create flags. Better to use memory instead
        try {
            Memory.flags.claim = claimFlag
            Memory.flags.plan = planFlag
        } catch (err) {
            console.log("No vision into room selected")
        }

        claimFlag.remove()
        planFlag.remove()
    },

    getFlagsOfType: function(type) {
        let flags = _.filter(Game.flags, flag => flag.name.startsWith(type))
        return _.sortBy(flags, flag => flag.name)
    },

    canExpand: function() {
        return true // TODO check CPU before accepting
    }
}

module.exports = em;