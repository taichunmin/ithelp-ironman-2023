> [!CAUTION]
> 由於 iThome 鐵人賽已加上 reCAPTCHA 保護，所以這個工具已無法使用。

# 2023 iThome鐵人賽 自動發文機器人

- 可手動執行
- 成功或失敗會透過 LINE Notify 通知
- 每天自動發文
- 避免重複發文
- 錯誤會自動重新執行 (預設 3 次)
- 無修改功能，若想修改文章需回網站修改

## 用到的相關技術

- Google Spreadsheets: 用來儲存文章內容
- Github Actions: 用來每天定時執行程式

## 使用方法

可以先在自我挑戰的主題建立一個測試用的挑戰系列，如果不小心發錯，當天都還可以手動修改。

### 準備文章的資料來源 CSV

- 建立一個 Google Spreadsheets
- 確保上方的欄位有 `date,subject,tags,description`，多餘的欄位會被忽略
  - `date`: 格式為 `YYYY-MM-DD`，代表該文章要發佈的日期
  - `subject`: 文章標題
  - `tags`: 文章標籤，需寫成 JSON5 格式，且至少需有一個 TAG，如：`['vscode']`
  - `description`: 文章內容，支援換行符號
- 公開文件：「共用」➜「一般存取權」➜「知道連結的任何人」➜「檢視者」
- 發佈文件：「檔案」➜「共用」➜「發布到網路」➜「選擇你文章的資料表」➜「逗號分隔值 (.csv)」➜「發布」
- 複製 CSV 下載網址，以便填到 `ARTICLE_CSV` 中
- 請確保 csv 看起來應該像底下這樣

```csv
index,date,subject,tags,description
1,2019-09-16,DAY 1 前言,"['vscode']","# 這裡是內容

這裡是內文"
```

以下是均民準備的 Google Sheets 範例可供參考:

1. <https://docs.google.com/spreadsheets/d/1ijAwcXxCoRgLKj-ZaM32oYwI8Sx9tg2pwOiYY7Ml1z0/edit?usp=sharing>
2. <https://docs.google.com/spreadsheets/d/1TUEEneDcKcDtgdbLOsoz3BYThVtJovnWi6WZ7iH-yyA/edit?usp=sharing>

### 透過 開發者工具 查詢出發文所需的資料

請參考此篇文章：<https://ithelp.ithome.com.tw/articles/10191096>

- `ITHELP_COOKIE`: 只要登入後就可拿到，有效期 30 天，如果快過期記得事先更換
- `IRONMAN_ID`: 你希望機器人幫你發文的系列 ID
- `IRONMAN_TOKEN`: 從建立文章後表單中拿到的 `_token`

### 取得 LINE Notify 所需的 token

請自行前往 [LINE Notify](https://notify-bot.line.me/my/) 發行個人存取權杖。

如果欲傳送到群組內，請務必自行將 LINE Notify 加入群組內，以免收不到通知。

![](https://i.imgur.com/9VIIHez.png)

### 設定 Github Repo

- Fork 這個專案
- 前往 Environments 建立一個新的 environment，如：`series-6425`
- 建立 Environment variables
  - `IRONMAN_ID`
- 建立 Environment secrets
  - `ARTICLE_CSV`
  - `IRONMAN_TOKEN`
  - `ITHELP_COOKIE`
  - `LINE_NOTIFY_TOKEN`

![](https://i.imgur.com/FwQiRH6.png)

### 設定 Github Actions

複製並修改 `.github/workflows` 中的檔案，檔名建議跟 Environments 名稱一樣。

然後調整想要自動發文的時間 (注意時區為 `UTC+0`)、執行時顯示的 `name` 及環境變數的來源 `jobs.deploy.environment.name`。

最後請把 `.github/workflows` 中多餘的檔案刪除。
