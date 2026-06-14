// EllipticalTracker.js (V4: 支援分.秒格式輸入)

const fm = FileManager.iCloud();
const dir = fm.documentsDirectory();
const filePath = fm.joinPath(dir, "elliptical_data.json");

// 時間轉換函數：將 "12.45" 或 "12:45" 轉換成小數點分鐘 (12.75)
function parseTimeToMinutes(inputStr) {
  if (!inputStr) return 0;
  let str = inputStr.replace(":", "."); 
  let parts = str.split('.');
  let m = parseFloat(parts[0]) || 0;
  let s = 0;
  if (parts.length > 1) {
    let secStr = parts[1];
    if (secStr.length === 1) secStr += "0"; // 防呆：如果輸入 12.5，視為 12分50秒
    s = parseFloat(secStr.substring(0, 2)) || 0;
  }
  return m + (s / 60);
}

// 確保檔案存在
if (!fm.fileExists(filePath)) {
  fm.writeString(filePath, JSON.stringify([]));
}

await fm.downloadFileFromiCloud(filePath);
let history = JSON.parse(fm.readString(filePath));

let defaultWeight = history.length > 0 ? history[history.length - 1].weight.toString() : "70";

if (config.runsInApp) {
  let alert = new Alert();
  alert.title = "輸入今日橢圓機數據";
  
  // 全部改用 "分.秒" 格式
  alert.addTextField("1. 總時間 (格式 分.秒，如 30.45)", "");
  alert.addTextField("2. 動態大卡", "");
  alert.addTextField("3. 平均心率", "");
  alert.addTextField("4. 最高心率", "");
  alert.addTextField(`5. 體重 (上次 ${defaultWeight}kg，不變免填)`, ""); 
  alert.addTextField("6. Zone 1 (格式 分.秒，如 5.30)", "");
  alert.addTextField("7. Zone 2 (格式 分.秒)", "");
  alert.addTextField("8. Zone 3 (格式 分.秒)", "");
  alert.addTextField("9. Zone 4 (格式 分.秒)", "");
  alert.addTextField("10. Zone 5 (格式 分.秒)", "");
  
  alert.addAction("儲存");
  alert.addCancelAction("取消");
  
  let response = await alert.present();
  
  if (response !== -1) {
    let time = parseTimeToMinutes(alert.textFieldValue(0));
    let activeCal = parseFloat(alert.textFieldValue(1) || 0);
    let avgHR = parseFloat(alert.textFieldValue(2) || 0);
    let maxHR = parseFloat(alert.textFieldValue(3) || 0);
    
    let weightInput = alert.textFieldValue(4);
    let weight = parseFloat(weightInput ? weightInput : defaultWeight);
    
    // 精確解析各區間的秒數
    let z1 = parseTimeToMinutes(alert.textFieldValue(5));
    let z2 = parseTimeToMinutes(alert.textFieldValue(6));
    let z3 = parseTimeToMinutes(alert.textFieldValue(7));
    let z4 = parseTimeToMinutes(alert.textFieldValue(8));
    let z5 = parseTimeToMinutes(alert.textFieldValue(9));
    
    // 計算得分
    let hrLoad = (z1 * 0.5) + (z2 * 1.2) + (z3 * 2.0) + (z4 * 3.0) + (z5 * 4.0);
    let timeInHours = time / 60;
    let efficiency = (weight > 0 && timeInHours > 0) ? (activeCal / (weight * timeInHours)) : 0; 
    let totalScore = Math.round((hrLoad * 1.2) + (efficiency * 5));
    
    let newRecord = {
      date: new Date().toISOString(),
      time: time,
      weight: weight,
      activeCal: activeCal,
      avgHR: avgHR,
      maxHR: maxHR,
      efficiency: efficiency.toFixed(1),
      score: totalScore
    };
    
    history.push(newRecord);
    fm.writeString(filePath, JSON.stringify(history));
  }
}

// =====================================
// 繪製 Widget 介面 (長條圖版)
// =====================================
let widget = new ListWidget();
widget.backgroundColor = new Color("#1c1c1e");

if (history.length === 0) {
  let text = widget.addText("尚無紀錄，請點擊新增");
  text.textColor = Color.white();
} else {
  let latest = history[history.length - 1];
  
  let mainStack = widget.addStack();
  mainStack.layoutHorizontally();
  
  let leftStack = mainStack.addStack();
  leftStack.layoutVertically();
  
  let titleText = leftStack.addText("最新訓練得分");
  titleText.font = Font.boldSystemFont(12);
  titleText.textColor = new Color("#8e8e93");
  
  let scoreText = leftStack.addText(latest.score.toString());
  scoreText.font = Font.heavyRoundedSystemFont(36);
  scoreText.textColor = new Color("#32d74b");
  
  leftStack.addSpacer(5);
  
  let effText = leftStack.addText(`⚡️ 效率: ${latest.efficiency}`);
  effText.font = Font.systemFont(12);
  effText.textColor = new Color("#ff9f0a");

  let calText = leftStack.addText(`🔥 ${latest.activeCal} kcal`);
  calText.font = Font.systemFont(12);
  calText.textColor = Color.white();
  
  mainStack.addSpacer();
  
  let rightStack = mainStack.addStack();
  rightStack.layoutVertically();
  rightStack.bottomAlignContent();
  
  let recentHistory = history.slice(-7);
  let maxScore = Math.max(...recentHistory.map(r => r.score));
  if (maxScore === 0) maxScore = 1; 
  
  let chartStack = rightStack.addStack();
  chartStack.layoutHorizontally();
  chartStack.bottomAlignContent();
  chartStack.spacing = 4;
  
  for (let record of recentHistory) {
    let barStack = chartStack.addStack();
    barStack.layoutVertically();
    
    let barHeight = (record.score / maxScore) * 50; 
    if (barHeight < 5) barHeight = 5; 
    
    let bar = barStack.addStack();
    bar.size = new Size(8, barHeight);
    bar.cornerRadius = 4;
    bar.backgroundColor = (record === latest) ? new Color("#32d74b") : new Color("#5c5c5e");
  }
}

Script.setWidget(widget);
Script.complete();
if (!config.runsInWidget) {
  widget.presentMedium();
}
