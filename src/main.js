import {checkAttendance} from "./attendanceSystem.js"

function startGame(){

let att = document.getElementById("attendance").value

let level = checkAttendance(att)

if(level === 1)
window.location = "./levels/level1_department/level1.html"

if(level === 2)
window.location = "./levels/level2_college/level2.html"

if(level === 3)
window.location = "./levels/level3_warzone/level3.html"

if(level === 4)
window.location = "./levels/level4_island/level4.html"

}