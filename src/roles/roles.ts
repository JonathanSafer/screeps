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
import rSk = require("./sKguard")


const rr = {
    // order roles for priority. TODO powercreep?
    getRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB, rQ, rMM, rC, rUC,
            rSB, rH,rMe, rBr, rPM,
            rRo, rDM, rS, rQr, rRe, rRr, rBk, rSk]
    },

    getCoreRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB]
    },

    getEmergencyRoles: function() {
        return [rF, rD, rT, rM, rR]
    }
}

export = rr