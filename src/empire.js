var em = {
    
    expand: function() { // run every 500
        if (em.canExpand() && !Game.flags.claim && !Game.flags.plan) {
            em.claimNextRoom()
        }
    },

    claimNextRoom: function() {
        let claimFlags = em.getFlagsOfType("claim")
        let claimFlag = claimFlags[0]
        let roomSuffix = claimFlag.name.substr(5)
        let planFlag = Game.flags["plan" + roomSuffix]

        let claimPos = claimFlag.pos
        let planPos = planFlag.pos

        // apparently you need vision to create flags
        claimPos.createFlag("claim")
        planPos.createFlag("plan")

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