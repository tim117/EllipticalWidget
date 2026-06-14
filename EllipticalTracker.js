// EllipticalTracker.js (V3: 修正輸入框顯示問題)

const fm = FileManager.iCloud();
const dir = fm.documentsDirectory();
const filePath = fm.joinPath(dir, "elliptical_data.json");

// 確保檔案存在
if (!fm.fileExists(filePath)) {
  fm.writeString(filePath, JSON.stringify([]));
}

// 讀取歷史資料
await fm.downloadFileFromiCloud(filePath);
let history = JSON.parse(fm.readString(filePath));

// 讀取前一次的體重作為預設值，若無紀錄則預設為 70
let defaultWeight = history.length > 0 ? history[history.length - 1].weight.toString() : "70";

// 判斷執行環境：如果在 App 內執行，就彈出輸入表單
if (config.runsInApp) {
  let alert = new Alert();
  alert.title = "輸入今日橢圓機數據";
  
  // 欄位設定 (移除預設文字，讓提示文字顯示出來)
  alert.addTextField("1. 總時間 - 分鐘", "");
  alert.addTextField("2. 總時間 - 秒數", "");
  alert.addTextField("3. 動態大卡", "");
  alert.addTextField("4. 平均心率", "");
  alert.addTextField("5. 最高心率", "");
  alert.addTextField(`6. 體重 (上次 ${defaultWeight}kg，不變免填)`, ""); 
  alert.addTextField("7. Zone 1 時間 (分)", "");
  alert.addTextField("8. Zone 2 時間 (分)", "");
  alert.addTextField("9. Zone 3 時間 (分)", "");
  alert.addTextField("10. Zone 4 時間 (分)", "");
  alert.addTextField("11. Zone 5 時間 (分)", "");
  
  alert.addAction("儲存");
  alert.addCancelAction("取消");
  
  let response = await alert.present();
  
  if (response !== -1) {
    let min = parseFloat(alert.textFieldValue(0) || 0);
    let sec = parseFloat(alert.textFieldValue(1) || 0);
    let time = min + (sec / 60); 
    
    let activeCal = parseFloat(alert.textFieldValue(2) || 0);
    let avgHR = parseFloat(alert.textFieldValue(3) || 0);
    let maxHR = parseFloat(alert.textFieldValue(4) || 0);
    
    // 如果體重留白，就使用上次紀錄的體重
    let weightInput = alert.textFieldValue(5);
    let weight = parseFloat(weightInput ? weightInput : defaultWeight);
    
    let z1 = parseFloat(alert.textFieldValue(6) || 0);
    let z2 = parseFloat(alert.textFieldValue(7) || 0);
    let z3 = parseFloat(alert.textFieldValue(8) || 0);
    let z4 = parseFloat(alert.textFieldValue(9) || 0);
    let z5 = parseFloat(alert.textFieldValue(10) || 0);
    
    // 計算
    let hrLoad = (z1 * 0.5) + (z2 * 1.2) + (z3 * 2.0) + (z4 * 3.0) + (z5 * 4.0);
    let timeInHours = time / 60;
    // 避免除以 0 的錯誤
    let efficiency = (weight > 0 && timeInHours > 0) ? (activeCal / (weight * timeInHours)) : 0; 
    let totalScore = Math.round((hrLoad * 1.2) + (efficiency * 5));
    
    // 建立當次紀錄
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
    
    // 存入陣列並寫回 iCloud
    history.push(newRecord);
    fm.writeString(filePath, JSON.stringify(history));
  }
}

// =====================================
// 繪製 Widget 介面
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
  
  // 左側：最新數據
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
  
  // 右側：進步軌跡長條圖
  let rightStack = mainStack.addStack();
  rightStack.layoutVertically();
  rightStack.bottomAlignContent();
  
  let recentHistory = history.slice(-7);
  let maxScore = Math.max(...recentHistory.map(r => r.score));
  if (maxScore === 0) maxScore = 1; // 防呆機制
  
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
    // 最新一次為綠色，歷史為灰色
    bar.backgroundColor = (record === latest) ? new Color("#32d74b") : new Color("#5c5c5e");
  }
}

Script.setWidget(widget);
Script.complete();
if (!config.runsInWidget) {
  widget.presentMedium();
}
