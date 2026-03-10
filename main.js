const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
   let [time1, period1] = startTime.split(" ");
let [h1, m1, s1] = time1.split(":").map(Number);

if (period1 === "pm" && h1 !== 12) h1 += 12;
if (period1 === "am" && h1 === 12) h1 = 0;

let startSeconds = h1 * 3600 + m1 * 60 + s1;

let [time2, period2] = endTime.split(" ");
let [h2, m2, s2] = time2.split(":").map(Number);

if (period2 === "pm" && h2 !== 12) h2 += 12;
if (period2 === "am" && h2 === 12) h2 = 0;

let endSeconds = h2 * 3600 + m2 * 60 + s2;

let durationSeconds = endSeconds - startSeconds;

if (durationSeconds < 0) durationSeconds += 24 * 3600;

let hours = Math.floor(durationSeconds / 3600);
let minutes = Math.floor((durationSeconds % 3600) / 60);
let seconds = durationSeconds % 60;

let mm = minutes.toString().padStart(2, "0");
let ss = seconds.toString().padStart(2, "0");

return `${hours}:${mm}:${ss}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

   function toSeconds(time) {
    let [t, p] = time.split(" ");
    let [h, m, s] = t.split(":").map(Number);

    if (p === "pm" && h !== 12) h += 12;
    if (p === "am" && h === 12) h = 0;

    return h * 3600 + m * 60 + s;
}

let start = toSeconds(startTime);
let end = toSeconds(endTime);

if (end < start) end += 24 * 3600;

let deliveryStart = 8 * 3600;
let deliveryEnd = 22 * 3600;

let idle = 0;

if (start < deliveryStart) {
    idle += Math.min(end, deliveryStart) - start;
}

if (end > deliveryEnd) {
    idle += end - Math.max(start, deliveryEnd);
}

if (idle < 0) idle = 0;

let hours = Math.floor(idle / 3600);
let minutes = Math.floor((idle % 3600) / 60);
let seconds = idle % 60;

let mm = minutes.toString().padStart(2, "0");
let ss = seconds.toString().padStart(2, "0");

return `${hours}:${mm}:${ss}`;

}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
   function toSeconds(timeStr) {
        let [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    let shiftSeconds = toSeconds(shiftDuration);
    let idleSeconds = toSeconds(idleTime);

    let activeSeconds = shiftSeconds - idleSeconds;

    let hours = Math.floor(activeSeconds / 3600);
    let minutes = Math.floor((activeSeconds % 3600) / 60);
    let seconds = activeSeconds % 60;

    minutes = minutes.toString().padStart(2, "0");
    seconds = seconds.toString().padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function toSeconds(timeStr) {
        let [hours, minutes, seconds] = timeStr.split(":").map(Number);
        return hours * 3600 + minutes * 60 + seconds;
    }

    let activeSeconds = toSeconds(activeTime);

    let [year, month, day] = date.split("-").map(Number);

    let requiredSeconds;

    // Check Eid period: April 10–30, 2025
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        requiredSeconds = 6 * 3600; // 6 hours
    } else {
        requiredSeconds = (8 * 3600) + (24 * 60); // 8h 24m
    }

    return activeSeconds >= requiredSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
       let data = fs.readFileSync(textFile, "utf-8");
    let lines = data.split("\n").filter(l => l.trim() !== "");

    let { driverID, driverName, date, startTime, endTime } = shiftObj;

    // Check duplicate
    for (let line of lines) {
        let parts = line.split(",");
        if (parts[0].trim() === driverID.trim() && parts[2].trim() === date.trim()) {
            return {};
        }
    }

    // Calculate values
    let shiftDuration = getShiftDuration(startTime, endTime);
    let idleTime = getIdleTime(startTime, endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let metQuotaValue = metQuota(date, activeTime);
    let hasBonus = false;

    let newLine = `${driverID},${driverName},${date},${startTime},${endTime},${shiftDuration},${idleTime},${activeTime},${metQuotaValue},${hasBonus}`;

    let lastIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        let parts = lines[i].split(",");
        if (parts[0].trim() === driverID.trim()) {
            lastIndex = i;
        }
    }

    if (lastIndex === -1) {
        lines.push(newLine);
    } else {
        lines.splice(lastIndex + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, lines.join("\n"));

    return {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: metQuotaValue,
        hasBonus
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
         let content = fs.readFileSync(textFile, "utf-8");
    let lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === "") continue;
        let columns = lines[i].split(",");
        if (columns.length < 10) continue;
        if (columns[0].trim() === driverID.trim() && columns[2].trim() === date.trim()) {
            columns[9] = String(newValue);
            lines[i] = columns.join(",");
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"), "utf-8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
   let lines = fs.readFileSync(textFile, "utf-8").split("\n");
    let count = 0;
    let found = false;
    let targetMonth = parseInt(month, 10);

    for (let line of lines) {
        if (line.trim() === "") continue;
        let col = line.split(",");
        if (col.length < 10) continue;
        if (col[0].trim() === driverID.trim()) {
            found = true;
            let fileMonth = parseInt(col[2].trim().split("-")[1], 10);
            if (fileMonth === targetMonth && col[9].trim().toLowerCase() === "true") {
                count++;
            }
        }
    }

    return found ? count : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
let data = fs.readFileSync(textFile, "utf8").trim();

if (data.length === 0) return "0:00:00";

let lines = data.split("\n");
let totalSeconds = 0;

for (let line of lines) {

    if (line.trim() === "") continue;

    let parts = line.split(",");

    let id = parts[0].trim();
    let date = parts[2].trim();
    let activeTime = parts[7].trim();

    if (id !== driverID) continue;

    let fileMonth = parseInt(date.split("-")[1]);

    if (fileMonth !== month) continue;

    let [h, m, s] = activeTime.split(":").map(Number);

    totalSeconds += h * 3600 + m * 60 + s;
}

let hours = Math.floor(totalSeconds / 3600);
let minutes = Math.floor((totalSeconds % 3600) / 60);
let seconds = totalSeconds % 60;

let mm = minutes.toString().padStart(2, "0");
let ss = seconds.toString().padStart(2, "0");

return `${hours}:${mm}:${ss}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
 let rateLines = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let dayOff = null;
    for (let line of rateLines) {
        if (line.trim() === "") continue;
        let parts = line.split(",");
        if (parts[0].trim() === driverID.trim()) {
            dayOff = parts[1].trim();
            break;
        }
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    let lines = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let totalSeconds = 0;

    for (let line of lines) {
        if (line.trim() === "") continue;
        let parts = line.split(",");
        let id = parts[0].trim();
        let date = parts[2].trim();
        if (id !== driverID) continue;
        let fileMonth = parseInt(date.split("-")[1]);
        if (fileMonth !== month) continue;

        // Skip day off
        let dateObj = new Date(date);
        let dayName = dayNames[dateObj.getDay()];
        if (dayName === dayOff) continue;

        // Check Eid period
        let [year, m, day] = date.split("-").map(Number);
        if (year === 2025 && m === 4 && day >= 10 && day <= 30) {
            totalSeconds += 6 * 3600;
        } else {
            totalSeconds += (8 * 3600) + (24 * 60);
        }
    }

    // Each bonus reduces required by 2 hours
    totalSeconds -= bonusCount * 2 * 3600;
    if (totalSeconds < 0) totalSeconds = 0;

    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    let mm = minutes.toString().padStart(2, "0");
    let ss = seconds.toString().padStart(2, "0");
    return `${hours}:${mm}:${ss}`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
 let rateLines = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let basePay = 0;
    let tier = 0;
    for (let line of rateLines) {
        if (line.trim() === "") continue;
        let parts = line.split(",");
        if (parts[0].trim() === driverID.trim()) {
            basePay = parseInt(parts[2].trim());
            tier = parseInt(parts[3].trim());
            break;
        }
    }

    // Convert hhh:mm:ss to seconds
    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.trim().split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    let actualSeconds = toSeconds(actualHours);
    let requiredSeconds = toSeconds(requiredHours);

    // No deduction if actual >= required
    if (actualSeconds >= requiredSeconds) return basePay;

    let missingSeconds = requiredSeconds - actualSeconds;

    // Allowed missing hours per tier
    const allowedHours = { 1: 50, 2: 20, 3: 10, 4: 3 };
    let allowed = allowedHours[tier] * 3600;

    // Subtract allowance
    let billableSeconds = missingSeconds - allowed;
    if (billableSeconds <= 0) return basePay;

    // Only full hours count
    let billableHours = Math.floor(billableSeconds / 3600);
    if (billableHours === 0) return basePay;

    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = billableHours * deductionRatePerHour;

    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
