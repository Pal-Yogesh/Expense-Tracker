import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { NotificationProvider } from "@/components/notification-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ExpenseTracker - Split Expenses with Friends",
  description: "Track and split expenses with your friends and roommates easily",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} dark bg-gray-950 text-white`}>
        <NotificationProvider>
          {children}
          <Toaster />
        </NotificationProvider>
      </body>
    </html>
  )
}
