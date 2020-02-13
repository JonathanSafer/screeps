var rMe = require("./medic")
var rDM = require("./depositMiner")
var rBM = require("./bigMedic")
var rTr = require("./trooper")
var rBT = require("./bigTrooper")
var rBB = require("./bigBreaker")
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


var rr = {
    // order roles for priority. TODO powercreep?
    getRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB, rMM, rC, rUC,
            rSB, rH, rBM, rD, rBB, rBT, rMe, rTr, rBr, rPM,
            rRo, rDM]
    },

    getCoreRoles: function() {
        return [rF, rD, rT, rM, rR, rU, rB]
    },

    getEmergencyRoles: function() {
        return [rF, rD, rT, rM, rR]
    }
}

module.exports = rr