"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, User, DollarSign, TrendingUp, Search, Receipt, PieChart, BarChart3 } from "lucide-react"
import { collection, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, isWithinInterval, startOfMonth, endOfMonth } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { AuthGuard } from "@/components/auth-guard"
import { UserMenu } from "@/components/user-menu"
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
}

interface UserType {
  id: string
  displayName: string
  email: string
  photoURL?: string
}

export default function UserProfilePage() {
  const params = useParams()
  const userId = params.userId as string
  const { user } = useAuth()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [users, setUsers] = useState<UserType[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [timeFilter, setTimeFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

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

  const currentUser = users.find((member) => member.id === userId)

  useEffect(() => {
    if (!user) return

    // Load users
    const loadUsers = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersList = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as UserType[]
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
  }, [expenses, searchQuery, categoryFilter, timeFilter, userId])

  const filterExpenses = () => {
    let filtered = expenses.filter((expense) => expense.paidBy === userId || expense.splitWith.includes(userId))

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.notes.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.category === categoryFilter)
    }

    // Time filter
    if (timeFilter !== "all") {
      const now = new Date()
      switch (timeFilter) {
        case "thisMonth":
          const monthStart = startOfMonth(now)
          const monthEnd = endOfMonth(now)
          filtered = filtered.filter((expense) =>
            isWithinInterval(new Date(expense.date), { start: monthStart, end: monthEnd }),
          )
          break
        case "lastMonth":
          const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
          const lastMonthEnd = endOfMonth(lastMonthStart)
          filtered = filtered.filter((expense) =>
            isWithinInterval(new Date(expense.date), { start: lastMonthStart, end: lastMonthEnd }),
          )
          break
        case "last3Months":
          const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
          filtered = filtered.filter((expense) => new Date(expense.date) >= threeMonthsAgo)
          break
      }
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setFilteredExpenses(filtered)
  }

  const getUserStats = () => {
    const userExpenses = expenses.filter((expense) => expense.paidBy === userId || expense.splitWith.includes(userId))

    const totalPaid = expenses
      .filter((expense) => expense.paidBy === userId)
      .reduce((sum, expense) => sum + expense.amount, 0)

    const totalShare = userExpenses.reduce((sum, expense) => {
      if (expense.splitWith.includes(userId)) {
        return sum + expense.amount / expense.splitWith.length
      }
      return sum
    }, 0)

    const categoryBreakdown = categories.reduce((acc, category) => {
      const categoryKey = category.name.toLowerCase().replace(/\s+/g, "-")
      const categoryExpenses = userExpenses.filter((expense) => expense.category === categoryKey)
      const categoryTotal = categoryExpenses.reduce((sum, expense) => {
        if (expense.paidBy === userId) {
          return sum + expense.amount
        } else if (expense.splitWith.includes(userId)) {
          return sum + expense.amount / expense.splitWith.length
        }
        return sum
      }, 0)

      if (categoryTotal > 0) {
        acc.push({
          ...category,
          total: categoryTotal,
          count: categoryExpenses.length,
        })
      }
      return acc
    }, [] as any[])

    return {
      totalPaid,
      totalShare,
      netBalance: totalPaid - totalShare,
      totalExpenses: userExpenses.length,
      categoryBreakdown: categoryBreakdown.sort((a, b) => b.total - a.total),
    }
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

  if (!currentUser) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">User Not Found</h1>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading user profile...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const stats = getUserStats()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-1.5 sm:p-2 rounded-lg shadow-lg">
                <User className="h-4 w-4 sm:h-6 sm:w-6" />
              </div>
              <span className="text-lg sm:text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ExpenseTracker
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <Link href="/add-expense" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                Add
              </Link>
              <Link href="/expenses" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                Expenses
              </Link>
              <Link href="/calculator" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                Split
              </Link>
              <NotificationBell />
              <UserMenu />
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex flex-col gap-4 sm:gap-6 animate-slide-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <Link href="/calculator">
                  <Button variant="outline" size="icon" className="border-gray-600 hover:bg-gray-800">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                    <AvatarImage src={currentUser.photoURL || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg sm:text-2xl">
                      {currentUser.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      {currentUser.displayName}
                    </h1>
                    <p className="text-gray-400 text-sm sm:text-base">{currentUser.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-200">Total Paid</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-blue-500/20 rounded-lg">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-blue-400">${stats.totalPaid.toFixed(2)}</div>
                  <p className="text-xs text-gray-400">expenses paid</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-200">Your Share</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-lg">
                    <PieChart className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-green-400">${stats.totalShare.toFixed(2)}</div>
                  <p className="text-xs text-gray-400">total share</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-200">Net Balance</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-lg sm:text-2xl font-bold ${stats.netBalance >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    ${Math.abs(stats.netBalance).toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-400">{stats.netBalance >= 0 ? "owed to you" : "you owe"}</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-gray-200">Expenses</CardTitle>
                  <div className="p-1.5 sm:p-2 bg-yellow-500/20 rounded-lg">
                    <Receipt className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-2xl font-bold text-yellow-400">{stats.totalExpenses}</div>
                  <p className="text-xs text-gray-400">total expenses</p>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            {stats.categoryBreakdown.length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Spending by Category
                  </CardTitle>
                  <CardDescription className="text-gray-400">Your expense breakdown across categories</CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.categoryBreakdown.slice(0, 6).map((category, index) => (
                      <div
                        key={category.name}
                        className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 animate-slide-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-lg sm:text-xl"
                            style={{ backgroundColor: category.color.split(" ")[1] + "20" }}
                          >
                            {category.icon}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm sm:text-base">{category.name}</p>
                            <p className="text-xs text-gray-400">{category.count} expenses</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white text-sm sm:text-base">${category.total.toFixed(2)}</p>
                          <p className="text-xs text-gray-400">
                            {((category.total / stats.totalShare) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search and Filters */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-gray-700">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Search className="h-5 w-5 text-blue-400" />
                  Search & Filter Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-200">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search expenses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-200">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all" className="text-white hover:bg-gray-700">
                          All Categories
                        </SelectItem>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.name}
                            value={category.name.toLowerCase().replace(/\s+/g, "-")}
                            className="text-white hover:bg-gray-700"
                          >
                            <div className="flex items-center gap-2">
                              <span>{category.icon}</span>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-200">Time Period</label>
                    <Select value={timeFilter} onValueChange={setTimeFilter}>
                      <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                        <SelectValue placeholder="All time" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="all" className="text-white hover:bg-gray-700">
                          All Time
                        </SelectItem>
                        <SelectItem value="thisMonth" className="text-white hover:bg-gray-700">
                          This Month
                        </SelectItem>
                        <SelectItem value="lastMonth" className="text-white hover:bg-gray-700">
                          Last Month
                        </SelectItem>
                        <SelectItem value="last3Months" className="text-white hover:bg-gray-700">
                          Last 3 Months
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense History */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-b border-gray-700">
                <CardTitle className="text-white">Expense History ({filteredExpenses.length} expenses)</CardTitle>
                <CardDescription className="text-gray-400">
                  All expenses where {currentUser.displayName} was involved
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {filteredExpenses.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Receipt className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                    </div>
                    <p className="text-gray-400 text-base sm:text-lg mb-2">No expenses found.</p>
                    <p className="text-gray-500 text-sm sm:text-base">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {filteredExpenses.map((expense, index) => {
                      const categoryInfo = getCategoryInfo(expense.category)
                      const isPayer = expense.paidBy === userId
                      const userShare = expense.amount / expense.splitWith.length

                      return (
                        <div
                          key={expense.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border border-gray-700 rounded-lg hover:bg-gray-700/30 transition-all duration-300 animate-slide-in-up"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 mb-3 sm:mb-0">
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r ${categoryInfo.color} flex items-center justify-center text-white text-lg sm:text-xl shadow-lg`}
                            >
                              {categoryInfo.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                <h3 className="font-semibold text-white text-sm sm:text-base">{expense.description}</h3>
                                <Badge
                                  className={`bg-gradient-to-r ${categoryInfo.color} text-white border-0 text-xs w-fit`}
                                >
                                  {categoryInfo.name}
                                </Badge>
                                {isPayer && (
                                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 text-xs w-fit">
                                    You Paid
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-400">
                                <span>{format(new Date(expense.date), "MMM dd, yyyy")}</span>
                                <span>•</span>
                                <span>Split with {expense.splitWith.length} people</span>
                                {expense.notes && (
                                  <>
                                    <span>•</span>
                                    <span className="italic">"{expense.notes}"</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end gap-2">
                            <div className="text-left sm:text-right">
                              <p className="text-lg sm:text-xl font-bold text-green-400">
                                ${expense.amount.toFixed(2)}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-400">Total expense</p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm sm:text-base font-semibold ${isPayer ? "text-blue-400" : "text-yellow-400"}`}
                              >
                                ${userShare.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-400">{isPayer ? "you paid" : "your share"}</p>
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
      </div>
    </AuthGuard>
  )
}
