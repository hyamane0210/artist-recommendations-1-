"use client"

import type React from "react"
import Image, { type ImageProps } from "next/image"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"

// 画像ソースの優先順位
export enum ImageSource {
  SPOTIFY = "spotify",
  TMDB = "tmdb",
  KNOWLEDGE_GRAPH = "knowledge_graph",
  ORIGINAL = "original",
  FALLBACK = "fallback",
}

interface EnhancedImageProps extends ImageProps {
  apiSource?: ImageSource
  fallbackText?: string
  identifier?: string
}

export const EnhancedImage: React.FC<EnhancedImageProps> = ({
  src,
  alt,
  className,
  fallbackText,
  identifier,
  apiSource = ImageSource.ORIGINAL,
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  // srcが変更されたときに状態をリセット
  useEffect(() => {
    if (typeof src === "string") {
      // Instagramのプロフィール画像URLをチェック
      if (src.includes("instagram.com") && src.includes("/profile.jpg")) {
        // Instagramのプロフィール画像は直接アクセスできないため、プレースホルダーを使用
        setImageSrc("/placeholder.svg?height=400&width=400")
        setIsLoading(false)
        return
      }

      setImageSrc(src)
      setIsLoading(true)
      setError(false)
    } else {
      setImageSrc("/placeholder.svg?height=400&width=400")
      setIsLoading(false)
    }
  }, [src])

  // 画像読み込み完了時のハンドラ
  const handleLoad = () => {
    setIsLoading(false)
    setError(false)
  }

  // 画像読み込みエラー時のハンドラ
  const handleError = () => {
    console.error(`Image load error for: ${imageSrc}`)
    setIsLoading(false)
    setError(true)

    // URLがプロキシを使用している場合は、元のURLを試す
    if (imageSrc && imageSrc.startsWith("/api/image-proxy")) {
      try {
        const originalUrl = new URL(imageSrc, window.location.origin).searchParams.get("url")
        if (originalUrl) {
          console.log(`Trying original URL: ${originalUrl}`)
          setImageSrc(originalUrl)
          return
        }
      } catch (e) {
        console.error("Error parsing URL:", e)
      }
    }

    // プレースホルダー画像に切り替え
    setImageSrc("/placeholder.svg?height=400&width=400")
  }

  const placeholderText = fallbackText || alt?.substring(0, 2).toUpperCase() || "??"

  // 画像がない場合はプレースホルダーを表示
  if (!imageSrc) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center bg-gray-200 rounded-full text-gray-500 font-bold">
              {placeholderText}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* 画像読み込み中のスケルトン表示 */}
      {isLoading && <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-md"></div>}

      {/* エラー時のフォールバック表示 */}
      {error && imageSrc === "/placeholder.svg?height=400&width=400" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
          <div className="text-center p-4">
            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center bg-gray-200 rounded-full text-gray-500 font-bold">
              {placeholderText}
            </div>
            <p className="text-sm text-gray-500">画像を読み込めませんでした</p>
          </div>
        </div>
      )}

      {/* 画像表示 */}
      <Image
        src={imageSrc || "/placeholder.svg"}
        alt={alt}
        className={cn("object-cover", className, error ? "opacity-0" : "opacity-100")}
        fill
        placeholder="blur"
        blurDataURL="/placeholder.svg?height=400&width=400"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  )
}
