"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  PlusCircle,
  Receipt,
  Filter,
  Edit,
  Trash2,
  CalendarIcon,
  ArrowLeft,
  Loader2,
  TrendingUp,
  DollarSign,
  BarChart3,
  Search,
  X,
} from "lucide-react"
import { format, isWithinInterval, startOfWeek, endOfWeek, endOfMonth, startOfDay, endOfDay } from "date-fns"
import { cn } from "@/lib/utils"
import { collection, onSnapshot, doc, deleteDoc, updateDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { AuthGuard } from "@/components/auth-guard"
import { UserMenu } from "@/components/user-menu"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NotificationBell } from "@/components/notification-bell"

interface Expense {
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
}

interface User {
  id: string
  displayName: string
  email: string
  photoURL?: string
}

export default function ExpensesPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [filterType, setFilterType] = useState("all")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: "default" | "destructive"
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => { },
  })

  // Edit form states
  const [editDescription, setEditDescription] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editDate, setEditDate] = useState<Date | undefined>()
  const [editCategory, setEditCategory] = useState("")
  const [editPaidBy, setEditPaidBy] = useState("")
  const [editNotes, setEditNotes] = useState("")

  const categories = [
    { name: "Food & Drink", icon: "🍕", color: "from-orange-400 to-red-500" },
    { name: "Groceries", icon: "🛒", color: "from-green-400 to-emerald-500" },
    { name: "Housing", icon: "🏠", color: "from-blue-400 to-cyan-500" },
    { name: "Utilities", icon: "⚡", color: "from-yellow-400 to-orange-500" },
    { name: "Transportation", icon: "🚗", color: "from-purple-400 to-violet-500" },
    { name: "Entertainment", icon: "🎬", color: "from-pink-400 to-rose-500" },
    { name: "Shopping", icon: "🛍️", color: "from-indigo-400 to-blue-500" },
    { name: "Healthcare", icon: "🏥", color: "from-red-400 to-pink-500" },
    { name: "Other", icon: "📝", color: "from-gray-400 to-gray-600" },
  ]

  // Generate month options for the last 12 months
  const getMonthOptions = () => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      })
    }
    return months
  }

  useEffect(() => {
    if (!user) return

    // Load users
    const loadUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersList = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[]
        setUsers(usersList)
      } catch (error) {
        console.error("Error loading users:", error)
      }
    }

    loadUsers()

    // Load expenses with real-time updates
    const unsubscribe = onSnapshot(collection(db, "expenses"), (snapshot) => {
      const expensesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Expense[]
      setExpenses(expensesList)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    filterExpenses()
  }, [expenses, filterType, selectedMonth, selectedDate, searchQuery])

  const filterExpenses = () => {
    let filtered = [...expenses]
    const now = new Date()

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
          getUserDisplayName(expense.paidBy).toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Time filter
    switch (filterType) {
      case "today":
        filtered = filtered.filter((expense) => {
          const expenseDate = new Date(expense.date)
          return isWithinInterval(expenseDate, {
            start: startOfDay(now),
            end: endOfDay(now),
          })
        })
        break
      case "week":
        filtered = filtered.filter((expense) => {
          const expenseDate = new Date(expense.date)
          return isWithinInterval(expenseDate, {
            start: startOfWeek(now),
            end: endOfWeek(now),
          })
        })
        break
      case "month":
        if (selectedMonth) {
          const [year, month] = selectedMonth.split("-")
          const monthStart = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
          const monthEnd = endOfMonth(monthStart)
          filtered = filtered.filter((expense) => {
            const expenseDate = new Date(expense.date)
            return isWithinInterval(expenseDate, {
              start: monthStart,
              end: monthEnd,
            })
          })
        }
        break
      case "date":
        if (selectedDate) {
          filtered = filtered.filter((expense) => {
            const expenseDate = new Date(expense.date)
            return isWithinInterval(expenseDate, {
              start: startOfDay(selectedDate),
              end: endOfDay(selectedDate),
            })
          })
        }
        break
      default:
        // Show all expenses
        break
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setFilteredExpenses(filtered)
  }

  const getUserDisplayName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    return user?.displayName || "Unknown User"
  }

  const getUserInfo = (userId: string) => {
    return (
      users.find((u) => u.id === userId) || {
        id: userId,
        displayName: "Unknown User",
        email: "",
        photoURL: undefined,
      }
    )
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setEditDescription(expense.description)
    setEditAmount(expense.amount.toString())
    setEditDate(new Date(expense.date))
    setEditCategory(expense.category)
    setEditPaidBy(expense.paidBy)
    setEditNotes(expense.notes)
    setIsEditDialogOpen(true)
  }



  const handleUpdate = async () => {
    if (!editingExpense) return

    // Show confirmation dialog before updating
    setConfirmDialog({
      open: true,
      title: "Confirm Expense Update",
      description: `Are you sure you want to save changes to "${editDescription}"?`,
      onConfirm: async () => {
        setIsUpdating(true)

        const updatedExpense = {
          description: editDescription,
          amount: Number.parseFloat(editAmount),
          date: editDate?.toISOString() || editingExpense.date,
          category: editCategory,
          paidBy: editPaidBy,
          notes: editNotes,
          updatedAt: new Date().toISOString(),
        }

        try {
          const expenseRef = doc(db, "expenses", editingExpense.id)
          await updateDoc(expenseRef, updatedExpense)

          toast({
            title: "Expense Updated! ✨",
            description: `Successfully updated ${editDescription}`,
          })

          setIsEditDialogOpen(false)
          setEditingExpense(null)
        } catch (error) {
          console.error("Error updating expense:", error)
          toast({
            title: "Error",
            description: "Failed to update expense. Please try again.",
            variant: "destructive",
          })
        } finally {
          setIsUpdating(false)
        }

        setConfirmDialog((prev) => ({ ...prev, open: false }))
      },
      variant: "default",
    })
  }
  const handleDelete = (expense: Expense) => {
    setConfirmDialog({
      open: true,
      title: "Delete Expense",
      description: `Are you sure you want to delete "${expense.description}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const expenseRef = doc(db, "expenses", expense.id)
          await deleteDoc(expenseRef)

          toast({
            title: "Expense Deleted! 🗑️",
            description: `Successfully deleted ${expense.description}`,
          })
        } catch (error) {
          console.error("Error deleting expense:", error)
          toast({
            title: "Error",
            description: "Failed to delete expense. Please try again.",
            variant: "destructive",
          })
        }
        setConfirmDialog((prev) => ({ ...prev, open: false }))
      },
      variant: "destructive",
    })
  }

  const getTotalAmount = () => {
    return filteredExpenses.reduce((total, expense) => total + expense.amount, 0)
  }

  const getCategoryInfo = (categoryKey: string) => {
    return (
      categories.find((cat) => cat.name.toLowerCase().replace(/\s+/g, "-") === categoryKey) || {
        name: categoryKey,
        icon: "📝",
        color: "from-gray-400 to-gray-600",
      }
    )
  }

  const clearSearch = () => {
    setSearchQuery("")
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading expenses...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-1.5 sm:p-2 rounded-lg shadow-lg">
                <Receipt className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <span className="text-lg sm:text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ExpenseTracker
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-1  sm:gap-4 text-xs sm:text-sm">
              <Link href="/add-expense" className="font-medium hover:text-blue-400 transition-colors px-1 py-1">
                Add
              </Link>
              <Link href="/statistics" className="font-medium hover:text-blue-400 transition-colors px-1 py-1">
                Stats
              </Link>
              <Link href="/calculator" className="font-medium hover:text-blue-400 transition-colors px-1 py-1">
                Split
              </Link>
              <NotificationBell />
              <UserMenu />
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex flex-col gap-4 sm:gap-6 animate-slide-in-up">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="outline" size="icon" className="border-gray-600 hover:bg-gray-800">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    All Expenses
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-400 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold text-green-400">${getTotalAmount().toFixed(2)}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{filteredExpenses.length} expenses</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <Link href="/statistics" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Analytics
                  </Button>
                </Link>
                <Link href="/add-expense" className="w-full sm:w-auto">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </Link>
              </div>
            </div>

            {/* Search Bar */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardContent className="p-4 sm:p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search expenses by description, notes, category, or member..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-gray-700">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Filter className="h-5 w-5 text-blue-400" />
                  Filter Expenses
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Filter expenses by time period to view specific data
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-200">Filter Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                        <SelectValue placeholder="Select filter" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all" className="text-white hover:bg-gray-700">
                          All Time
                        </SelectItem>
                        <SelectItem value="today" className="text-white hover:bg-gray-700">
                          Today
                        </SelectItem>
                        <SelectItem value="week" className="text-white hover:bg-gray-700">
                          This Week
                        </SelectItem>
                        <SelectItem value="month" className="text-white hover:bg-gray-700">
                          By Month
                        </SelectItem>
                        <SelectItem value="date" className="text-white hover:bg-gray-700">
                          Specific Date
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {filterType === "month" && (
                    <div className="space-y-2">
                      <Label className="text-gray-200">Select Month</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                          <SelectValue placeholder="Choose month" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          {getMonthOptions().map((month) => (
                            <SelectItem key={month.value} value={month.value} className="text-white hover:bg-gray-700">
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {filterType === "date" && (
                    <div className="space-y-2">
                      <Label className="text-gray-200">Select Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700",
                              !selectedDate && "text-gray-400",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                            className="bg-gray-800 text-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilterType("all")
                        setSelectedMonth("")
                        setSelectedDate(undefined)
                        setSearchQuery("")
                      }}
                      className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses List */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-b border-gray-700">
                <CardTitle className="text-white">
                  {filterType === "all" && !searchQuery && "All Expenses"}
                  {filterType === "today" && "Today's Expenses"}
                  {filterType === "week" && "This Week's Expenses"}
                  {filterType === "month" &&
                    selectedMonth &&
                    `Expenses for ${getMonthOptions().find((m) => m.value === selectedMonth)?.label}`}
                  {filterType === "date" && selectedDate && `Expenses for ${format(selectedDate, "PPP")}`}
                  {searchQuery && `Search Results for "${searchQuery}"`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-base sm:text-lg mb-2">
                      {searchQuery
                        ? "No expenses found matching your search."
                        : "No expenses found for the selected period."}
                    </p>
                    <p className="text-gray-500 text-sm sm:text-base mb-6">
                      {searchQuery
                        ? "Try adjusting your search terms."
                        : "Start tracking your expenses to see them here."}
                    </p>
                    <Link href="/add-expense">
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add First Expense
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {filteredExpenses.map((expense, index) => {
                      const categoryInfo = getCategoryInfo(expense.category)
                      const paidByUser = getUserInfo(expense.paidBy)

                      return (
                        <div
                          key={expense.id}
                          className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-3 sm:p-4 border border-gray-700 rounded-lg hover:bg-gray-700/30 transition-all duration-300 animate-slide-in-up group"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 mb-3 lg:mb-0">
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r ${categoryInfo.color} flex items-center justify-center text-white text-lg sm:text-xl shadow-lg flex-shrink-0`}
                            >
                              {categoryInfo.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <h3 className="font-semibold text-white text-sm sm:text-base truncate">
                                  {expense.description}
                                </h3>
                                <div className="flex flex-wrap gap-1">
                                  <Badge
                                    className={`bg-gradient-to-r ${categoryInfo.color} text-white border-0 text-xs`}
                                  >
                                    {categoryInfo.name}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <span>Paid by</span>
                                  <div className="flex items-center gap-1">
                                    <Avatar className="h-4 w-4">
                                      <AvatarImage src={paidByUser.photoURL || "/placeholder.svg"} />
                                      <AvatarFallback className="text-xs bg-blue-500">
                                        {paidByUser.displayName.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-white font-medium">{paidByUser.displayName}</span>
                                  </div>
                                </div>
                                <span>•</span>
                                <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
                                <span>•</span>
                                <span>{expense.splitWith.length} people</span>
                              </div>
                              {expense.notes && (
                                <p className="text-xs sm:text-sm text-gray-500 mt-1 italic truncate">{expense.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between w-full lg:w-auto lg:flex-col lg:items-end gap-3 lg:gap-2">
                            <div className="text-left lg:text-right">
                              <p className="text-xl sm:text-2xl font-bold text-green-400">
                                ${expense.amount.toFixed(2)}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-400">
                                ${(expense.amount / (expense.splitWith.length || 1)).toFixed(2)} per person
                              </p>
                            </div>
                            <div className="flex gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(expense)}
                                className="h-8 w-8 border-gray-600 hover:bg-blue-500/20 hover:border-blue-500"
                              >
                                <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(expense)}
                                className="h-8 w-8 border-gray-600 hover:bg-red-500/20 hover:border-red-500 text-red-400"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] w-[95vw] bg-gray-800 border-gray-700 text-white md:mx-3 h-[95vh] md:h-[90vh] overflow-y-scroll md:scrollbar-hide ">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Expense</DialogTitle>
              <DialogDescription className="text-gray-400">
                Make changes to the expense details below.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-gray-200">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-amount" className="text-gray-200">
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    className="pl-8 bg-gray-700/50 border-gray-600 text-white"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-200">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700",
                        !editDate && "text-gray-400",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={setEditDate}
                      initialFocus
                      className="bg-gray-800 text-white"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category" className="text-gray-200">
                  Category
                </Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {categories.map((cat) => (
                      <SelectItem
                        key={cat.name}
                        value={cat.name.toLowerCase().replace(/\s+/g, "-")}
                        className="text-white hover:bg-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-paidBy" className="text-gray-200">
                  Paid by
                </Label>
                <Select value={editPaidBy} onValueChange={setEditPaidBy}>
                  <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue placeholder="Who paid?" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {users.map((member) => (
                      <SelectItem key={member.id} value={member.id} className="text-white hover:bg-gray-700">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.photoURL || "/placeholder.svg"} />
                            <AvatarFallback className="text-xs bg-blue-500">
                              {member.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.displayName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="text-gray-200">
                  Notes
                </Label>
                <Textarea
                  id="edit-notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="w-full sm:w-auto border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <ConfirmationDialog
          open={confirmDialog.open}
          onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.onConfirm}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.variant === "destructive" ? "Delete" : "Confirm"}
        />
      </div>
    </AuthGuard>
  )
}
