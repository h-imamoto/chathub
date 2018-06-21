Chathub
====

GitHubのWebhookをChatworkに通知するCLIツール

## Description

以下のWebhookEventに対応
+ Pull reqeusts
    + action:opened(Pull request発行)
    + action:closed(Pull requestクローズ(マージを含む))
    + action:reopened(Pull request再開)
+ Pull request review comments
    + action:created(レビューコメント追加)
+ Issues
    + action:opened(Issue発行)
    + action:closed(Issueクローズ)
    + action:reopened(Issue再開)
+ Issue comments
    + action:created(コメント追加)

## Usage

### Command
GitHub Webhooksの`payload`で取得できるjsonをCLIの標準入力で受け取る。

+ jsonファイル(./payload.json)の場合
```linux
$ chathub [-w --webhook <Webhook Type>] [-r, --room <RoomId>] [-t, --token <Token>] [-m, --mapping <MappingFilePath>] < ./payload.json
```
+ CLIから直接ヒアドキュメントでjsonを入力する場合
```linux
$ chathub [-w --webhook <Webhook Type>] [-r, --room <RoomId>] [-t, --token <Token>] [-m, --mapping <MappingFilePath>] << "_EOT_"
(jsonを入力)
_EOT_
```

#### Options
+ `-w --webhook <Webhook Type>`: WebhookEventの種類を指定(必須)
    + `pr`: Pull reqeusts
    + `issue`: Issues
    + `prcomment`: Pull request review comments
    * `issuecomment`: Issue comments
+ `-r, --room <RoomId>`: Chatworkの通知先RoomIDを指定(必須)
+ `-t, --token <Token>`: Chatworkの通知用アカウントのTokenを指定(必須)
+ `-m, --mapping <MappingFilePath>`: GitHubアカウント名とChatworkアカウントIDのマッピングCSVファイルを指定(任意)
    + CSVファイルフォーマットは`GitHubアカウント名,ChatworkアカウントID`

## Install

```linux
$ npm install -g chathub
```

## License

[MIT](https://github.com/h-imamoto/chathub/blob/master/LICENSE.txt)

## Author

[Hikaru Imamoto](https://github.com/h-imamoto)
