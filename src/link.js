var rL = {

    // range needed to use these
    UPGRADE: 3,
    SOURCE: 1,
    LINK: 1,

    fixCacheIfInvalid: function(room, rcl) {
        const rN = room.name
        if (!Cache[rN]) Cache[rN] = {}
        const links = Cache[rN].links || {}
        let storageLink = Game.getObjectById(links.store)
        let upgradeLink = Game.getObjectById(links.upgrade) || rcl < 7 || Game.time % 100 != 0
        let sourceLinks = _.map(links.source, src => Game.getObjectById(src))
        if (storageLink && upgradeLink && _.reduce(sourceLinks, (l, r) => l || r)) {
            return
        } else {
            const realLinks = rL.findStructure(room, STRUCTURE_LINK)
            sourceLinks = []
            for (const link of realLinks) {
                if (link.pos.findInRange(FIND_SOURCES, rL.SOURCE + rL.LINK).length > 0) {
                    sourceLinks.push(link)
                } else if (rL.isNearStructure(link.pos, STRUCTURE_CONTROLLER, rL.UPGRADE + rL.LINK)) {
                    upgradeLink = link
                } else if (rL.isNearStructure(link.pos, STRUCTURE_TERMINAL, rL.LINK)) {
                    storageLink = link
                }
            }

            links.store = storageLink ? storageLink.id : null
            links.upgrade = upgradeLink ? upgradeLink.id : null
            links.source = _.map(sourceLinks, link => link ? link.id : null)
            Cache[rN].links = links
        }
    },

    run: function(room) {
        const rcl = room.controller && room.controller.level
        if (rcl < 7) return

        rL.fixCacheIfInvalid(room, rcl)

        const links = Cache[room.name].links
        const storageLink = Game.getObjectById(links.store)
        const upgradeLink = Game.getObjectById(links.upgrade)
        const sourceLinks = _.map(links.source, src => Game.getObjectById(src))

        // Make transfers
        for (const sourceLink of sourceLinks) {
            if (sourceLink.store.getUsedCapacity(RESOURCE_ENERGY) <= 
                sourceLink.store.getCapacity(RESOURCE_ENERGY) * 0.5) {
                continue // sourceLink isn't full yet
            }

            if (rL.readyForLinkTransfer(sourceLink, upgradeLink)) {
                sourceLink.transferEnergy(upgradeLink)
            } else if (rL.readyForLinkTransfer(sourceLink, storageLink)) {
                sourceLink.transferEnergy(storageLink)
            }
        }
        //send from storage link to upgrade link
        if(storageLink && rL.readyForLinkTransfer(storageLink, upgradeLink)){
            storageLink.transferEnergy(upgradeLink)
        }
    },

    readyForLinkTransfer(sender, receiver) {
        return receiver && !receiver.store.getUsedCapacity(RESOURCE_ENERGY) && !sender.cooldown
    },

    getUpgradeLink: function(room) {
        if (room.controller.level < 7) return false
        const links = rL.findNearStructures(room.controller.pos, 
            STRUCTURE_LINK, 
            rL.UPGRADE + rL.LINK)
        return links.length > 0 ? links[0] : undefined
    },

    findNearStructures: function(pos, type, range) {
        return pos.findInRange(FIND_STRUCTURES, range, {
            filter: { structureType: type }
        })
    },

    isNearStructure: function(pos, type, range) {
        return rL.findNearStructures(pos, type, range).length > 0
    },

    findStructure: function(room, type) {
        return room.find(FIND_STRUCTURES, {
            filter: { structureType: type }
        })
    }
}

module.exports = rL