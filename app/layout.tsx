import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { FavoritesProvider } from "@/contexts/favorites-context"
import { OnboardingProvider } from "@/contexts/onboarding-context"
import { AuthProvider } from "@/contexts/auth-context"
import Header from "@/components/header"
import dynamic from "next/dynamic"

// Toasterコンポーネントの最適化されたインポート
const Toaster = dynamic(() => import("@/components/ui/toaster").then((mod) => mod.Toaster), {
  ssr: true,
  loading: () => null,
})

// フォント最適化
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
  variable: "--font-inter",
})

// メタデータの最適化
export const metadata: Metadata = {
  title: "My Project - あなた専用のコンテンツ体験",
  description: "アーティスト、映画、アニメ、ファッションなど、あなたの興味に合わせたおすすめを発見しましょう",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: "#0EA5E9",
    generator: 'v0.dev'
}

// レイアウトコンポーネント
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning={true} className={inter.variable}>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <AuthProvider>
            <FavoritesProvider>
              <OnboardingProvider>
                <div className="min-h-screen bg-background flex flex-col">
                  <Header />
                  <main className="flex-1">{children}</main>
                </div>
                <Toaster />
              </OnboardingProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}


import './globals.css'