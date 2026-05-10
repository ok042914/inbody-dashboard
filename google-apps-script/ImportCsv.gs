// ===== 設定 =====
var FOLDER_NAME = "InBody Import";
var PROCESSED_FOLDER_NAME = "処理済み";

// デプロイ後の Vercel URL に変更してください
// 例: "https://your-app.vercel.app/api/trigger-import"
var TRIGGER_URL = "https://YOUR_VERCEL_URL/api/trigger-import";

// Vercel の環境変数 TRIGGER_SECRET と同じ値を設定してください
// （セキュリティのため空文字以外を推奨）
var TRIGGER_SECRET = "";
// =================

function checkAndImportNewCsvFiles() {
  var inbox = getFolderByName(FOLDER_NAME);
  if (!inbox) {
    console.error("フォルダが見つかりません: " + FOLDER_NAME);
    return { error: "フォルダが見つかりません: " + FOLDER_NAME };
  }

  var processed = getOrCreateSubfolder(inbox, PROCESSED_FOLDER_NAME);
  var files = inbox.getFilesByType(MimeType.CSV);

  var totalInserted = 0;
  var totalErrors = 0;
  var fileCount = 0;

  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    fileCount++;

    try {
      var csvText = file.getBlob().getDataAsString("UTF-8");

      var headers = { "Content-Type": "application/json" };
      if (TRIGGER_SECRET) {
        headers["Authorization"] = "Bearer " + TRIGGER_SECRET;
      }

      var response = UrlFetchApp.fetch(TRIGGER_URL, {
        method: "post",
        headers: headers,
        payload: JSON.stringify({ csv_text: csvText, filename: fileName }),
        muteHttpExceptions: true
      });

      var status = response.getResponseCode();
      var result = JSON.parse(response.getContentText());

      if (status === 200) {
        totalInserted += result.inserted || 0;
        totalErrors += result.error_count || 0;
        console.log(fileName + ": 追加=" + result.inserted);
        // 処理済みフォルダへ移動
        processed.addFile(file);
        inbox.removeFile(file);
      } else {
        totalErrors++;
        console.error(fileName + ": HTTPエラー " + status + " - " + JSON.stringify(result));
      }
    } catch (e) {
      totalErrors++;
      console.error(fileName + ": 例外 - " + e.message);
    }
  }

  return { file_count: fileCount, inserted: totalInserted, error_count: totalErrors };
}

// 毎時トリガーを設定する（一度だけ実行すること）
function setupHourlyTrigger() {
  // 既存のトリガーをすべて削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });
  // 毎時トリガーを作成
  ScriptApp.newTrigger("checkAndImportNewCsvFiles")
    .timeBased()
    .everyHours(1)
    .create();
  console.log("毎時トリガーを設定しました");
}

// GAS ウェブアプリとしてデプロイした場合のエントリーポイント
function doPost(e) {
  var result = checkAndImportNewCsvFiles();
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFolderByName(name) {
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function getOrCreateSubfolder(parent, name) {
  var subs = parent.getFoldersByName(name);
  return subs.hasNext() ? subs.next() : parent.createFolder(name);
}
