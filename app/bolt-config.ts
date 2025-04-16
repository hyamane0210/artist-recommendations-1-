/**
 * bolt.new プラットフォーム用の設定ファイル
 * このファイルはアプリケーションの bolt.new 環境での動作を最適化します
 */

export const boltConfig = {
  // bolt.new 環境を検出
  isBoltEnvironment: typeof window !== "undefined" && window.location.hostname.includes("bolt.new"),

  // 環境に応じた設定を提供
  getEnvironmentSettings() {
    return {
      // 開発環境の場合はより詳細なログを表示
      enableDetailedLogs: this.isBoltEnvironment && process.env.NODE_ENV === "development",

      // bolt.new 環境でのキャッシュ戦略
      cacheStrategy: this.isBoltEnvironment ? "network-first" : "cache-first",

      // bolt.new 環境での最適化設定
      optimization: {
        prefetch: true,
        preconnect: true,
        lazyLoad: true,
      },
    }
  },
}
