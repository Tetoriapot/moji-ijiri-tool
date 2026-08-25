# 文字いじりツール

文字数カウント、文字化け加工と復元、鏡文字、カナスペル候補、ローマ字とかなの相互変換を、ブラウザ内で扱える静的な文字ユーティリティです。

## プライバシー

- 入力文章、読み込んだファイル、変換結果はアプリから外部へ送信しません。
- アクセス解析、広告、外部フォントは組み込んでいません。
- GitHub Pagesによる通常の配信では、IPアドレスなどの通信情報をGitHubがセキュリティ目的で取り扱う場合があります。
- サイトにログイン認証はありません。URLは転送・再共有できます。
- 各HTMLに`noindex`を設定していますが、検索結果からの除外を保証するものではありません。

## GitHub Pagesへの公開

`.github/workflows/deploy-pages.yml`が、`main`へのpush時に次の処理を行います。

1. 静的成果物を`github-pages-dist/`へ生成
2. 公開ファイルの許可リスト、相対パス、プライバシー表示、外部通信API、ワークフロー権限を検査
3. 合格した成果物だけをGitHub Pagesへ公開

GitHubの **Settings → Pages → Build and deployment → Source** では、**GitHub Actions** を選択します。

## ローカル検証

Node.js 22.13以上で実行します。外部パッケージのインストールは不要です。

```powershell
node scripts/build-github-pages.mjs
node scripts/verify-github-pages.mjs
```

プロジェクトPagesのサブパスを模擬する場合：

```powershell
$env:PAGES_BASE_PATH = "/moji-ijiri-tool/"
node scripts/build-github-pages.mjs
node scripts/verify-github-pages.mjs
Remove-Item Env:PAGES_BASE_PATH
```

## 公開構成

公開成果物には、HTML、CSS、JavaScript、OG画像、404ページ、`.nojekyll`だけを含めます。環境ファイル、認証情報、開発キャッシュ、ホスティング管理情報は含めません。
