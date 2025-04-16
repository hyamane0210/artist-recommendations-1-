/**
 * Google Knowledge Graph APIとの連携を行うサービスクラス
 */
import { getWikipediaContent, getWikipediaInfoByWikidataId } from "./wikipedia-service"

// Knowledge Graph APIのエンティティ型定義
export interface KnowledgeGraphEntity {
  "@id": string
  name: string
  "@type": string[]
  description?: string
  detailedDescription?: {
    articleBody: string
    url: string
    license: string
  }
  image?: {
    contentUrl: string
    url: string
    license: string
  }
  url?: string
}

// Knowledge Graph APIのレスポンス型定義
export interface KnowledgeGraphResponse {
  "@context": {
    "@vocab": string
    goog: string
    resultScore: string
  }
  "@type": string
  itemListElement: Array<{
    "@type": string
    result: KnowledgeGraphEntity
    resultScore: number
  }>
}

// キャッシュ用のマップ
const searchCache = new Map<string, KnowledgeGraphEntity[]>()
const imageUrlCache = new Map<string, string>() // 画像URLのキャッシュ

/**
 * Google Knowledge Graph APIのAPIキーを取得する
 */
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_KNOWLEDGE_GRAPH_API_KEY
  if (!apiKey) {
    throw new Error("Google Knowledge Graph API key is not set in environment variables")
  }
  return apiKey
}

/**
 * Google Knowledge Graph APIを使用してエンティティを検索する
 */
export async function searchEntities(query: string, types: string[] = [], limit = 10): Promise<KnowledgeGraphEntity[]> {
  // キャッシュキーを生成
  const typesStr = types.join(",")
  const cacheKey = `${query}_${typesStr}_${limit}`

  // キャッシュをチェック
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey) || []
  }

  try {
    const apiKey = getApiKey()
    const encodedQuery = encodeURIComponent(query)

    // APIリクエストURLを構築
    let url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodedQuery}&key=${apiKey}&limit=${limit}&indent=true`

    // 型フィルターを追加（指定されている場合）
    if (types.length > 0) {
      url += `&types=${types.map((t) => encodeURIComponent(t)).join(",")}`
    }

    // 言語を日本語に設定
    url += "&languages=ja,en"

    const response = await fetch(url, {
      next: { revalidate: 86400 }, // 24時間キャッシュ
    })

    if (!response.ok) {
      throw new Error(`Failed to search entities: ${response.statusText}`)
    }

    const data: KnowledgeGraphResponse = await response.json()

    // エンティティを抽出
    const entities = data.itemListElement.map((item) => item.result).filter((entity) => entity) // nullやundefinedをフィルタリング

    // キャッシュに保存
    searchCache.set(cacheKey, entities)

    return entities
  } catch (error) {
    console.error("Error searching entities:", error)
    return []
  }
}

/**
 * エンティティの種類に基づいて適切なカテゴリを判断する
 */
export function determineCategory(entity: KnowledgeGraphEntity): string {
  const types = entity["@type"] || []

  // 型の文字列表現
  const typeStr = types.join(" ").toLowerCase()

  // アーティスト/ミュージシャン判定
  if (
    typeStr.includes("musician") ||
    typeStr.includes("artist") ||
    typeStr.includes("musicgroup") ||
    typeStr.includes("band") ||
    typeStr.includes("music")
  ) {
    return "artists"
  }

  // 芸能人/有名人判定
  if (
    typeStr.includes("actor") ||
    typeStr.includes("actress") ||
    typeStr.includes("celebrity") ||
    typeStr.includes("person") ||
    typeStr.includes("director") ||
    typeStr.includes("athlete")
  ) {
    return "celebrities"
  }

  // メディア判定
  if (
    typeStr.includes("movie") ||
    typeStr.includes("tvshow") ||
    typeStr.includes("tvseries") ||
    typeStr.includes("book") ||
    typeStr.includes("game") ||
    typeStr.includes("videogame") ||
    typeStr.includes("anime")
  ) {
    return "media"
  }

  // ファッション判定
  if (
    typeStr.includes("brand") ||
    typeStr.includes("clothing") ||
    typeStr.includes("fashion") ||
    typeStr.includes("organization") ||
    typeStr.includes("company") ||
    typeStr.includes("corporation")
  ) {
    return "fashion"
  }

  // デフォルトはcelebrities
  return "celebrities"
}

/**
 * Knowledge Graph エンティティをRecommendationItemに変換する
 * 芸能人/インフルエンサー向けに最適化
 */
export async function convertToRecommendationItem(entity: KnowledgeGraphEntity): Promise<any> {
  // 画像URLを取得（拡張された関数を使用）
  const imageUrl = await getKnowledgeGraphImageUrl(entity)

  return {
    name: entity.name,
    reason: entity.detailedDescription?.articleBody || entity.description || `${entity.name}に関する情報です。`,
    features: [
      ...entity["@type"].slice(0, 3).map((type) => type.replace(/^[a-z]+:/, "")),
      entity.url ? "公式サイトあり" : "",
    ].filter(Boolean),
    imageUrl: imageUrl,
    officialUrl: entity.url || entity.detailedDescription?.url || "#",
    apiData: {
      type: "knowledge_graph",
      id: entity["@id"],
      entityTypes: entity["@type"],
      imageSource: "knowledge_graph",
    },
  }
}

/**
 * Knowledge Graph APIのエンティティから最適な画像URLを取得する
 * 改善版：直接画像URLを取得し、プロキシを使用
 */
async function getKnowledgeGraphImageUrl(entity: KnowledgeGraphEntity): Promise<string> {
  // エンティティIDをキャッシュキーとして使用
  const cacheKey = `image_${entity["@id"]}`

  // キャッシュをチェック
  if (imageUrlCache.has(cacheKey)) {
    return imageUrlCache.get(cacheKey) || "/placeholder.svg?height=400&width=400"
  }

  try {
    // 1. エンティティに画像がある場合はそれを使用（最優先）
    if (entity.image?.contentUrl) {
      console.log("Using Knowledge Graph Image contentUrl:", entity.image.contentUrl)
      // 画像URLを直接プロキシを通して返す
      const url = `/api/image-proxy?url=${encodeURIComponent(entity.image.contentUrl)}`
      imageUrlCache.set(cacheKey, url)
      return url
    }

    if (entity.image?.url) {
      console.log("Using Knowledge Graph Image url:", entity.image.url)
      // 画像URLを直接プロキシを通して返す
      const url = `/api/image-proxy?url=${encodeURIComponent(entity.image.url)}`
      imageUrlCache.set(cacheKey, url)
      return url
    }

    // 2. エンティティのIDからWikidataのIDを抽出
    const wikidataId = extractWikidataId(entity["@id"])
    console.log("Extracted Wikidata ID:", wikidataId)

    if (wikidataId) {
      // 3. WikidataのIDを使用してWikipediaの情報を取得
      const wikipediaInfo = await getWikipediaInfoByWikidataId(wikidataId)
      if (wikipediaInfo?.thumbnail?.source) {
        console.log("Using Wikipedia Image URL (by Wikidata ID):", wikipediaInfo.thumbnail.source)
        const url = `/api/image-proxy?url=${encodeURIComponent(wikipediaInfo.thumbnail.source)}`
        imageUrlCache.set(cacheKey, url)
        return url
      }

      // 4. エンティティ名で検索
      const searchResults = await searchWikipedia(entity.name, 1)
      if (searchResults && searchResults.length > 0) {
        const wikipediaContent = await getWikipediaContent(searchResults[0].pageid)
        if (wikipediaContent?.thumbnail?.source) {
          console.log("Using Wikipedia Image URL (by search):", wikipediaContent.thumbnail.source)
          const url = `/api/image-proxy?url=${encodeURIComponent(wikipediaContent.thumbnail.source)}`
          imageUrlCache.set(cacheKey, url)
          return url
        }
      }
    }

    // デフォルトのプレースホルダー画像
    console.log("No image found for entity:", entity.name)
    return "/placeholder.svg?height=400&width=400"
  } catch (error) {
    console.error("Error getting image URL for entity:", entity.name, error)
    return "/placeholder.svg?height=400&width=400"
  }
}

/**
 * エンティティIDからWikidata IDを抽出する
 * 改善版：より多くのパターンに対応
 */
function extractWikidataId(entityId: string): string | null {
  if (!entityId) return null

  // Wikidata IDを抽出（例：http://www.wikidata.org/entity/Q76）
  const wikidataMatch = entityId.match(/wikidata\.org\/entity\/(Q\d+)/)
  if (wikidataMatch && wikidataMatch[1]) {
    return wikidataMatch[1]
  }

  // kg.google.com形式のIDからWikidata IDを抽出（例：kg:/m/0d6lp）
  const kgMatch = entityId.match(/kg:\/([^/]+)/)
  if (kgMatch && kgMatch[1]) {
    // Freebase IDをWikidata IDに変換するロジックが必要
    // ここでは簡易的に処理
    return null
  }

  // Freebase IDを抽出（例：/m/0d6lp）
  const freebaseMatch = entityId.match(/\/m\/([a-zA-Z0-9_]+)/)
  if (freebaseMatch && freebaseMatch[1]) {
    // Freebase IDをWikidata IDに変換するロジックが必要
    // ここでは簡易的に処理
    return null
  }

  return null
}

/**
 * Wikipedia APIを使用して検索を行う
 * @param query 検索クエリ
 * @param limit 結果の最大数
 */
async function searchWikipedia(query: string, limit = 1): Promise<any[]> {
  try {
    // 検索クエリをURLエンコード
    const encodedQuery = encodeURIComponent(query)

    const response = await fetch(
      `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodedQuery}&format=json&srlimit=${limit}&origin=*`,
      {
        headers: {
          "User-Agent": "MyApp/1.0 (https://myapp.example; myapp@example.com)",
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Failed to search Wikipedia: ${response.statusText}`)
    }

    const data = await response.json()
    return data.query.search || []
  } catch (error) {
    console.error("Error searching Wikipedia:", error)
    return []
  }
}
