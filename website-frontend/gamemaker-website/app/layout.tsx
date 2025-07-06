import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "GAMEMAKER - Arena Leaderboard",
  description:
    "Track gladiator performance in the arena with real-time statistics, rankings, and combat analytics. Experience the ultimate competitive gaming leaderboard with smart contract integration.",
  keywords: "gamemaker, leaderboard, arena, gladiators, gaming, competition, statistics, smart contract, blockchain",
  authors: [{ name: "Gamemaker Arena" }],
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#e53e3e",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body
        className="bg-gray-900 text-gray-200 antialiased overflow-x-hidden overflow-y-auto"
        style={{ maxHeight: "100vh", contain: "layout style" }}
      >
        {children}
      </body>
    </html>
  )
}
