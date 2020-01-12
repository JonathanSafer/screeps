var rL = {
    run: function(room) {
        // Initialize links
        let links = rL.findStructure(room, STRUCTURE_LINK)
        var storageLink, upgradeLink, sourceLinks = []
        for (let link of links) {
            if (link.pos.findInRange(FIND_SOURCES, 2).length > 0) {
                    sourceLinks.push(link)
            } else if (rL.isNearStructure(link.pos, STRUCTURE_CONTROLLER, 4)) {
                upgradeLink = link
            } else if (rL.isNearStructure(link.pos, STRUCTURE_TERMINAL, 1)) {
                storageLink = link
            }
        }

        // Make transfers
        for (let sourceLink of sourceLinks) {
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
        return receiver && receiver.store.getUsedCapacity(RESOURCE_ENERGY) == 0 && !sender.cooldown
    },

    isNearStructure: function(pos, type, range) {
        return pos.findInRange(FIND_STRUCTURES, range, {
            filter: { structureType: type }
        }).length > 0;
    },

    findStructure: function(room, type) {
        return room.find(FIND_STRUCTURES, {
            filter: { structureType: type }
        })
    }
};

module.exports = rL;