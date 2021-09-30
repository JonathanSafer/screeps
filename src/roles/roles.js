var rMe = require("./medic")
var rDM = require("./depositMiner")
var rH = require("./harasser")
var rSB = require("./spawnBuilder")
var rC = require("./claimer")
var rUC = require("./unclaimer")
var rRo = require("./robber")
var rF = require("./ferry")
var rMM = require("./mineralMiner")
var rU = require("./upgrader")
var rB = require("./builder")
var rR = require("./runner")
var rBr = require("./breaker")
var rT = require("./transporter")
var rM = require("./remoteMiner")
var rD = require("./defender")
var rPM = require("./powerMiner")
var rQ = require("./quad")
var rS = require("./scout")
const rQr = require("./qrCode")


var rr = {
    // order roles for priority. TODO powercreep?
    getRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB, rQ, rMM, rC, rUC,
            rSB, rH,rMe, rBr, rPM,
            rRo, rDM, rS, rQr]
    },

    getRolePriorities: function(){
        const priorites = {}
        priorites[rF.name] = 0
        priorites[rD.name] = 2
        priorites[rT.name] = 1
        priorites[rM.name] = 3
        priorites[rR.name] = 4
        priorites[rU.name] = 5
        priorites[rB.name] = 6
        priorites[rQ.name] = 7
        priorites[rMM.name] = 8
        priorites[rC.name] = 9
        priorites[rUC.name] = 10
        priorites[rSB.name] = 11
        priorites[rH.name] = 12
        priorites[rMe.name] = 13
        priorites[rBr.name] = 13
        priorites[rPM.name] = 13
        priorites[rRo.name] = 14
        priorites[rDM.name] = 15
        priorites[rS.name] = 16
        priorites[rQr.name] = 17
        return priorites
    },

    getCoreRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB]
    },

    getEmergencyRoles: function() {
        return [rF, rD, rT, rM, rR]
    }
}

module.exports = rr