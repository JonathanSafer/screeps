var rL = {

    // range needed to use these
    UPGRADE: 3,
    SOURCE: 1,
    LINK: 1,

    run: function(room) {
        // Initialize links
        const links = rL.findStructure(room, STRUCTURE_LINK)
        var storageLink, upgradeLink, sourceLinks = []
        for (const link of links) {
            if (link.pos.findInRange(FIND_SOURCES, rL.SOURCE + rL.LINK).length > 0) {
                sourceLinks.push(link)
            } else if (rL.isNearStructure(link.pos, STRUCTURE_CONTROLLER, rL.UPGRADE + rL.LINK)) {
                upgradeLink = link
            } else if (rL.isNearStructure(link.pos, STRUCTURE_TERMINAL, rL.LINK)) {
                storageLink = link
            }
        }

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
    },

    readyForLinkTransfer(sender, receiver) {
        return receiver && !receiver.store.getUsedCapacity(RESOURCE_ENERGY) && !sender.cooldown
    },

    getUpgradeLink: function(room) {
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