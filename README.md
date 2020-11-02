# Amiya

うさぎ

お題ガチャの結果保存ストア＆ランキング集計システムです。

動作にはMongoDBとRedisが必要です。

# 環境変数

| 名前       | 説明                       |
| ---------- | -------------------------- |
| PORT       | 起動ポート番号             |
| DB_URL     | mongodb の URL             |
| DB_NAME    | 保存先 DB 名               |
| REDIS_PORT | Redis サーバーのポート番号 |
| REDIS_HOST | Redis サーバーのホスト     |
| REDIS_DB   | Redis の DB 番号           |

# コマンド

起動

```sh
$ yarn build
$ yarn start
```

開発時

```sh
$ yarn dev
```

# ランキング更新について

/ranking/update にPOSTリクエストを投げると全件更新します。

since, untilで集計対象範囲を指定する必要があります。

外部からcrontabなどで定期実行してください。

# DBのIndexについて

amiyaの中では定義していません。

`maker_id` などにはindexがないと検索速度が壊滅するので、DB内に入って手動で設定してください。
