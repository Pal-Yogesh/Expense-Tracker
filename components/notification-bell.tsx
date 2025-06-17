"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, CheckCheck } from "lucide-react"
import { useNotifications } from "./notification-provider"
import { format } from "date-fns"

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "expense_added":
        return "💰"
      case "expense_updated":
        return "✏️"
      case "expense_deleted":
        return "🗑️"
      case "settlement_request":
        return "💸"
      default:
        return "📢"
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative border-gray-600 hover:bg-gray-800">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-gray-800 border-gray-700">
        <DropdownMenuLabel className="flex items-center justify-between text-white">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />

        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.slice(0, 10).map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer hover:bg-gray-700 ${
                  !notification.read ? "bg-blue-500/10 border-l-2 border-l-blue-500" : ""
                }`}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification.id)
                  }
                }}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="text-lg">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white truncate">{notification.title}</p>
                      {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2" />}
                    </div>
                    <p className="text-xs text-gray-400 mb-1">{notification.message}</p>
                    <p className="text-xs text-gray-500">{format(new Date(notification.timestamp), "MMM dd, HH:mm")}</p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
