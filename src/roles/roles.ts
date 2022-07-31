import rMe = require("./medic")
import rDM = require("./depositMiner")
import rH = require("./harasser")
import rSB = require("./spawnBuilder")
import rC = require("./claimer")
import rUC = require("./unclaimer")
import rRo = require("./robber")
import rF = require("./ferry")
import rMM = require("./mineralMiner")
import rU = require("./upgrader")
import rB = require("./builder")
import rR = require("./runner")
import rBr = require("./breaker")
import rT = require("./transporter")
import rM = require("./remoteMiner")
import rD = require("./defender")
import rPM = require("./powerMiner")
import rQ = require("./quad")
import rS = require("./scout")
import rRe = require("./repairer")
import rQr = require("./qrCode")
import rRr = require("./reserver")
import rBk = require("./brick")


const rr = {
    // order roles for priority. TODO powercreep?
    getRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB, rQ, rMM, rC, rUC,
            rSB, rH,rMe, rBr, rPM,
            rRo, rDM, rS, rQr, rRe, rRr, rBk]
    },

    getRolePriorities: function(){
        const priorities = {}
        priorities[rF.name] = 0
        priorities[rD.name] = 2
        priorities[rT.name] = 1
        priorities[rM.name] = 3
        priorities[rR.name] = 4
        priorities[rU.name] = 5
        priorities[rB.name] = 6
        priorities[rQ.name] = 3
        priorities[rMM.name] = 8
        priorities[rC.name] = 9
        priorities[rUC.name] = 10
        priorities[rSB.name] = 11
        priorities[rH.name] = 3
        priorities[rMe.name] = 13
        priorities[rBr.name] = 13
        priorities[rPM.name] = 13
        priorities[rRo.name] = 14
        priorities[rDM.name] = 15
        priorities[rS.name] = 16
        priorities[rQr.name] = 17
        priorities[rRe.name] = 14
        priorities[rRr.name] = 15
        priorities[rBk.name] = 15
        return priorities
    },

    getCoreRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB]
    },

    getEmergencyRoles: function() {
        return [rF, rD, rT, rM, rR]
    }
}

export = rr