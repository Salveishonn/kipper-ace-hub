---
name: claude-real-video
description: 幫 Leo 看影片。當 Leo 丟影片連結（YouTube/IG/TikTok）或本機影片檔，要摘要、分析、拆解對標時使用——Claude 不能直接吃影片，先用這個工具抽關鍵幀＋逐字稿＋運鏡節奏＋聲音/語氣/手勢時間軸再讀。
---

# claude-real-video / crv Pro — 幫 Leo 看影片

Leo 本機裝的是 **Pro 版 0.5.0**（`~/Projects/crv-pro/.venv/bin/crv-pro`，PATH 有的環境直接 `crv-pro`）。

## 什麼時候用

Leo 給影片（網址或檔案路徑）問內容、要摘要、拆對標 reel、問「他怎麼講/怎麼拍/觀眾為什麼買單」時。

## 指令怎麼選（0.5.0）

| Leo 的話聽起來像 | 指令 |
|---|---|
| 「這在講什麼」「幫我摘要」「他說的是真的嗎」 | `crv-pro "<src>" -o out --mode watch` |
| 「怎麼做的」「拆解」「為什麼會紅」「能學嗎」 | `crv-pro "<src>" -o out --mode creator` |
| 「完整分析」或意圖不明 | `crv-pro "<src>" -o out --mode full` |

Leo 有具體問題就加 `--why "<他的原話>"`。

- `--senses` = 五感全開：聲音事件、語氣曲線、情緒、手勢/表情、畫面標籤（首次跑下載模型 ~2.7GB，之後 86 秒影片約 40 秒）
- 只要單一感官：`--prosody` / `--audio-events` / `--emotion` / `--gesture` / `--scene-labels`
- `--lens content|creator|both`（預設 both）決定 MANIFEST 教讀的 AI 往哪個方向分析
- 長影片加 `--max-frames 60`；無語音影片 `--no-transcribe`
- IG/TikTok 這類要登入的平台：先把 cookie JSON 轉 Netscape 格式再走 `--cookies`（2026-07-05 實測可直接抓 IG reel，這才是正路）：
  ```bash
  python3 -c "import json; ck=json.load(open('/Users/leo/Projects/auto-post/browse-cookies/kanisleo328-threads.json')); cs=ck if isinstance(ck,list) else ck['cookies']; print('# Netscape HTTP Cookie File'); [print('\t'.join([c['domain'],'TRUE' if c['domain'].startswith('.') else 'FALSE',c.get('path','/'),'TRUE',str(int(c.get('expirationDate',2e9))),c['name'],c['value']])) for c in cs if 'instagram' in c.get('domain','')]" > /tmp/ig-cookies.txt
  crv-pro "<reel url>" --cookies /tmp/ig-cookies.txt --mode full
  ```
  這條也失敗才退 [[reference_ig_post_full_read]] 的 IG 內部 API 手動下載

## 讀輸出的順序

1. `MANIFEST.txt` — 開頭有 lens 指令區塊照著做；含幀清單、motion 區塊、**perception timeline**（聲音/語氣/情緒/手勢/畫面事件，各帶秒數與信心分數）、逐字稿
2. `grids/` 九宮格連續幀；要看細節才開 `frames/*.jpg`（讀前縮 1500px 內）
3. `perception.json` — 完整感知資料（被門檻藏掉的低信心事件在這）

## ⚠️ 鐵則（2026-07-05 Leo QA 定的）

- **逐字稿必須從頭讀到尾才准出報告**（2026-07-16 Leo 抓到抽樣讀導致講錯出處＋漏掉全片最有哏的三個細節）：transcript.txt 全文讀完再寫內容拆解，抽樣只能用來對秒數，不能替代理解

- **感知標籤是線索不是定論**：引用前對照幀和逐字稿交叉驗證（MANIFEST 開頭也這樣教）；情緒模型會把「正常有力的語氣」誤讀成 angry——非中性情緒信心 <0.75 已被藏，露出的也要驗
- **拆對標/做復刻前必看 motion 節奏表**（cuts/min、中位鏡頭長、運鏡分佈），別憑感覺（詳 [[reference_reel_clone_pipeline]]）
- 回答引用具體秒數和數據，不籠統

## 備註

- 全程本機跑，工具不上傳任何東西；`--kb <目錄>` 存進知識庫
- 暫存的下載影片/抽幀讀完要清（`/tmp` 下的）
