var FOLDER_NAME = "InBody Import";
var PROCESSED_FOLDER_NAME = "処理済み";

var EDGE_FUNCTION_URL =
  "https://tleexykarkkkklsgpihy.supabase.co/functions/v1/process-csv-upload";
var SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZWV4eWthcmtra2tsc2dwaWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NTE3OTUsImV4cCI6MjA5MzQyNzc5NX0.SjFgki89K-r5B8IZUJBNFs1HBZIQDE1MB8yscIIarsA";

// アプリのボタンから呼び出されるエントリーポイント
function doPost(e) {
  var result = checkAndImportNewCsvFiles();
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkAndImportNewCsvFiles() {
  var inbox = getFolderByName(FOLDER_NAME);
  if (!inbox) {
    return { error: "フォルダが見つかりません: " + FOLDER_NAME };
  }

  var processed = getOrCreateSubfolder(inbox, PROCESSED_FOLDER_NAME);
  var files = inbox.getFilesByType(MimeType.CSV);

  var totalInserted = 0;
  var totalSkipped = 0;
  var totalErrors = 0;
  var fileCount = 0;

  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    fileCount++;

    try {
      var csvText = file.getBlob().getDataAsString("UTF-8");

      var response = UrlFetchApp.fetch(EDGE_FUNCTION_URL, {
        method: "post",
        contentType: "application/json",
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY
        },
        payload: JSON.stringify({ csv_text: csvText }),
        muteHttpExceptions: true
      });

      var status = response.getResponseCode();
      var result = JSON.parse(response.getContentText());

      if (status === 200) {
        totalInserted += result.inserted || 0;
        totalSkipped += result.skipped || 0;
        totalErrors += result.error_count || 0;
        console.log(fileName + ": 追加=" + result.inserted + ", スキップ=" + result.skipped);
        processed.addFile(file);
        inbox.removeFile(file);
      } else {
        totalErrors++;
        console.error(fileName + ": HTTPエラー " + status + " - " + result.error);
      }
    } catch (e) {
      totalErrors++;
      console.error(fileName + ": 例外 - " + e.message);
    }
  }

  return {
    file_count: fileCount,
    inserted: totalInserted,
    skipped: totalSkipped,
    error_count: totalErrors
  };
}

function getFolderByName(name) {
  var folders = DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : null;
}

function getOrCreateSubfolder(parent, name) {
  var subs = parent.getFoldersByName(name);
  return subs.hasNext() ? subs.next() : parent.createFolder(name);
}
