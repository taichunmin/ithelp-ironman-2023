# 2023 iThome鐵人賽 自動發文機器人

可以先在自我挑戰的主題建立一個測試用的挑戰系列，如果不小心發錯，當天都還可以手動修改。

## 用到的相關技術

* Google Spreadsheets: 用來儲存文章內容
* Github Actions: 用來每天定時執行程式

## 使用方法

### 準備文章的資料來源 CSV

* 建立一個 Google Spreadsheets
* 確保上方的欄位有 `date,subject,tags,description`
* 「檔案」➜「發布到網路」➜「選擇你文章的資料表」➜「逗號分隔值 (.csv)」➜「發布」
* 複製 CSV 下載網址填到等等的 `ARTICLE_CSV`
* 請確保 csv 看起來應該像這樣

```csv
index,date,subject,tags,description
1,2019-09-16,DAY 1 前言,"[""vscode""]","# 這裡是內容

這裡是內文"
```

### 透過 開發者工具 查詢出發文所需的資料

請參考此篇文章：<https://ithelp.ithome.com.tw/articles/10191096>

* `ITHELP_COOKIE`: 只要登入後就可拿到，有效期 30 天，應該夠用
* `IRONMAN_ID`: 你希望機器人幫你發文的系列 ID
* `IRONMAN_TOKEN`: 從建立文章後表單中拿到的 `_token`

### 取得 LINE Notify 所需的 token

請自行前往 [LINE Notify](https://notify-bot.line.me/my/) 發行個人存取權杖。

![](https://i.imgur.com/9VIIHez.png)

### 設定 Github Actions

* Fork 這個專案
* 前往 Environments 建立一個新的 environment，如：`series-6425`
* 建立 Environment variables
  * `IRONMAN_ID`
* 建立 Environment secrets
  * `ARTICLE_CSV`
  * `IRONMAN_TOKEN`
  * `ITHELP_COOKIE`
  * `LINE_NOTIFY_TOKEN`

![](https://i.imgur.com/FwQiRH6.png)
