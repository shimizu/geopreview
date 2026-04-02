# リリース手順

## バージョニング

[セマンティックバージョニング (SemVer)](https://semver.org/) に従う。

| 変更内容 | コマンド | 例 |
|---|---|---|
| バグ修正、ドキュメント修正 | `npm version patch` | 1.0.0 → 1.0.1 |
| 新しいファイル形式の追加、新オプション | `npm version minor` | 1.0.0 → 1.1.0 |
| CLI フラグの変更、出力形式の変更 | `npm version major` | 1.0.0 → 2.0.0 |

`npm version` は以下を自動で行う:
1. `package.json` の `version` を更新
2. Git コミット作成
3. Git タグ（`v1.0.1` 等）を作成

## リリースフロー

```bash
# 1. 作業ツリーがクリーンか確認
git status

# 2. テスト
npm test

# 3. ビルド
npm run build

# 4. バージョンを上げる（Git コミット + タグが自動作成）
npm version patch   # or minor / major

# 5. GitHub にプッシュ（タグも含む）
git push origin main --tags

# 6. GitHub Release を作成
gh release create v1.0.1 --generate-notes

# 7. npm に公開
npm publish
```

## npm 公開の前提条件

- `npm login` で認証済みであること（`npm whoami` で確認）
- トークンに **Publish** 権限があること
- 2FA 有効時は `npm publish --otp=123456` で OTP を渡す

## 公開前の確認

```bash
# パッケージに含まれるファイルを確認
npm pack --dry-run
```

`files: ["dist"]` により、`dist/` + `package.json` + `README.md` のみが含まれる。
