"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

interface Notification {
  id: string
  type: "expense_added" | "expense_updated" | "expense_deleted" | "settlement_request"
  title: string
  message: string
  timestamp: number
  read: boolean
  data?: any
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}

interface ExpenseData {
  id: string
  description: string
  amount: number
  date: string
  category: string
  paidBy: string
  splitWith: string[]
  notes: string
  createdAt: string
  createdBy: string
  updatedAt?: string
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider")
  }
  return context
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lastExpenseTime, setLastExpenseTime] = useState<number>(Date.now())
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Listen for new expenses
    const expensesQuery = query(collection(db, "expenses"), orderBy("createdAt", "desc"), limit(20))

    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const expenseData = change.doc.data() as Partial<ExpenseData>
          const expense: ExpenseData = {
            id: change.doc.id,
            description: expenseData.description || "",
            amount: expenseData.amount || 0,
            date: expenseData.date || "",
            category: expenseData.category || "",
            paidBy: expenseData.paidBy || "",
            splitWith: expenseData.splitWith || [],
            notes: expenseData.notes || "",
            createdAt: expenseData.createdAt || new Date().toISOString(),
            createdBy: expenseData.createdBy || "",
          }

          const expenseTime = new Date(expense.createdAt).getTime()

          // Only show notification for expenses created after component mount
          // and not created by current user
          if (expenseTime > lastExpenseTime && expense.createdBy !== user.uid) {
            const notification: Notification = {
              id: `expense_${expense.id}_${Date.now()}`,
              type: "expense_added",
              title: "New Expense Added! 💰",
              message: `${expense.description} - $${expense.amount.toFixed(2)}`,
              timestamp: Date.now(),
              read: false,
              data: expense,
            }

            setNotifications((prev) => [notification, ...prev.slice(0, 49)]) // Keep last 50

            // Show toast notification
            toast({
              title: notification.title,
              description: notification.message,
              duration: 5000,
            })
          }
        }

        if (change.type === "modified") {
          const expenseData = change.doc.data() as Partial<ExpenseData>
          const expense: ExpenseData = {
            id: change.doc.id,
            description: expenseData.description || "",
            amount: expenseData.amount || 0,
            date: expenseData.date || "",
            category: expenseData.category || "",
            paidBy: expenseData.paidBy || "",
            splitWith: expenseData.splitWith || [],
            notes: expenseData.notes || "",
            createdAt: expenseData.createdAt || new Date().toISOString(),
            createdBy: expenseData.createdBy || "",
            updatedAt: expenseData.updatedAt,
          }

          // Only show notification if updated by someone else and has updatedAt field
          if (expense.updatedAt && expense.createdBy !== user.uid) {
            const notification: Notification = {
              id: `expense_updated_${expense.id}_${Date.now()}`,
              type: "expense_updated",
              title: "Expense Updated! ✏️",
              message: `${expense.description} was updated`,
              timestamp: Date.now(),
              read: false,
              data: expense,
            }

            setNotifications((prev) => [notification, ...prev.slice(0, 49)])

            toast({
              title: notification.title,
              description: notification.message,
              duration: 3000,
            })
          }
        }

        if (change.type === "removed") {
          const expenseData = change.doc.data() as Partial<ExpenseData>
          const expense: ExpenseData = {
            id: change.doc.id,
            description: expenseData.description || "",
            amount: expenseData.amount || 0,
            date: expenseData.date || "",
            category: expenseData.category || "",
            paidBy: expenseData.paidBy || "",
            splitWith: expenseData.splitWith || [],
            notes: expenseData.notes || "",
            createdAt: expenseData.createdAt || new Date().toISOString(),
            createdBy: expenseData.createdBy || "",
          }

          const notification: Notification = {
            id: `expense_deleted_${expense.id}_${Date.now()}`,
            type: "expense_deleted",
            title: "Expense Deleted! 🗑️",
            message: `${expense.description} was deleted`,
            timestamp: Date.now(),
            read: false,
            data: expense,
          }

          setNotifications((prev) => [notification, ...prev.slice(0, 49)])

          toast({
            title: notification.title,
            description: notification.message,
            duration: 3000,
          })
        }
      })
    })

    return () => unsubscribe()
  }, [toast, user, lastExpenseTime])

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
