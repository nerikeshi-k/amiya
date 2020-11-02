# Amiya

お題ガチャの結果保存ストア＆ランキング集計システム

mongodb が必要です

# Envs

| 名前       | 説明                       |
| ---------- | -------------------------- |
| PORT       | 起動ポート番号             |
| DB_URL     | mongodb の URL             |
| DB_NAME    | 保存先 DB 名               |
| REDIS_PORT | Redis サーバーのポート番号 |
| REDIS_HOST | Redis サーバーのホスト     |
| REDIS_DB   | Redis の DB 番号           |

# Commands

起動

```sh
$ yarn build
$ yarn start
```

開発時

```sh
$ yarn dev
```

# ランキング更新
/ranking/update にPOSTリクエストを投げると全件更新します
