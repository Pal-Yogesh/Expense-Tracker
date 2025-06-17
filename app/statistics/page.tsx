"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, TrendingUp, DollarSign, PieChart, BarChart3, Calendar, Users } from "lucide-react"
import { collection, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, startOfMonth, subMonths, isWithinInterval } from "date-fns"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js"
import { Bar, Pie, Line } from "react-chartjs-2"
import { useAuth } from "@/hooks/use-auth"
import { AuthGuard } from "@/components/auth-guard"
import { UserMenu } from "@/components/user-menu"

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement)

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

interface User {
  id: string
  displayName: string
  email: string
  photoURL?: string
}

export default function StatisticsPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [timeRange, setTimeRange] = useState("6months")
  const [isLoading, setIsLoading] = useState(true)

  const categories = [
    { name: "Food & Drink", icon: "🍕", color: "#F97316" },
    { name: "Groceries", icon: "🛒", color: "#10B981" },
    { name: "Housing", icon: "🏠", color: "#3B82F6" },
    { name: "Utilities", icon: "⚡", color: "#F59E0B" },
    { name: "Transportation", icon: "🚗", color: "#8B5CF6" },
    { name: "Entertainment", icon: "🎬", color: "#EC4899" },
    { name: "Shopping", icon: "🛍️", color: "#6366F1" },
    { name: "Healthcare", icon: "🏥", color: "#EF4444" },
    { name: "Other", icon: "📝", color: "#6B7280" },
  ]

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

  const getFilteredExpenses = () => {
    const now = new Date()
    let startDate: Date

    switch (timeRange) {
      case "1month":
        startDate = startOfMonth(now)
        break
      case "3months":
        startDate = startOfMonth(subMonths(now, 2))
        break
      case "6months":
        startDate = startOfMonth(subMonths(now, 5))
        break
      case "1year":
        startDate = startOfMonth(subMonths(now, 11))
        break
      default:
        return expenses
    }

    return expenses.filter((expense) =>
      isWithinInterval(new Date(expense.date), {
        start: startDate,
        end: now,
      }),
    )
  }

  const filteredExpenses = getFilteredExpenses()

  // Category breakdown data
  const getCategoryData = () => {
    const categoryTotals = categories.reduce(
      (acc, category) => {
        acc[category.name.toLowerCase().replace(/\s+/g, "-")] = 0
        return acc
      },
      {} as Record<string, number>,
    )

    filteredExpenses.forEach((expense) => {
      if (categoryTotals.hasOwnProperty(expense.category)) {
        categoryTotals[expense.category] += expense.amount
      }
    })

    const labels = Object.keys(categoryTotals)
      .filter((key) => categoryTotals[key] > 0)
      .map((key) => {
        const category = categories.find((cat) => cat.name.toLowerCase().replace(/\s+/g, "-") === key)
        return category ? category.name : key
      })

    const data = Object.keys(categoryTotals)
      .filter((key) => categoryTotals[key] > 0)
      .map((key) => categoryTotals[key])

    const colors = Object.keys(categoryTotals)
      .filter((key) => categoryTotals[key] > 0)
      .map((key) => {
        const category = categories.find((cat) => cat.name.toLowerCase().replace(/\s+/g, "-") === key)
        return category ? category.color : "#6B7280"
      })

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: colors.map((color) => color + "80"),
          borderWidth: 2,
        },
      ],
    }
  }

  // Monthly spending trend
  const getMonthlyTrendData = () => {
    const monthlyTotals: Record<string, number> = {}

    filteredExpenses.forEach((expense) => {
      const monthKey = format(new Date(expense.date), "MMM yyyy")
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount
    })

    const sortedMonths = Object.keys(monthlyTotals).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    return {
      labels: sortedMonths,
      datasets: [
        {
          label: "Total Spending",
          data: sortedMonths.map((month) => monthlyTotals[month]),
          borderColor: "#3B82F6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
      ],
    }
  }

  // Member spending data
  const getMemberSpendingData = () => {
    const memberTotals = users.reduce(
      (acc, member) => {
        acc[member.id] = 0
        return acc
      },
      {} as Record<string, number>,
    )

    filteredExpenses.forEach((expense) => {
      if (memberTotals.hasOwnProperty(expense.paidBy)) {
        memberTotals[expense.paidBy] += expense.amount
      }
    })

    const labels = Object.keys(memberTotals)
      .filter((key) => memberTotals[key] > 0)
      .map((key) => {
        const member = users.find((m) => m.id === key)
        return member ? member.displayName : key
      })

    const data = Object.keys(memberTotals)
      .filter((key) => memberTotals[key] > 0)
      .map((key) => memberTotals[key])

    const colors = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#6366F1"]

    return {
      labels,
      datasets: [
        {
          label: "Amount Paid",
          data,
          backgroundColor: colors.map((color) => color + "40"),
          borderColor: colors,
          borderWidth: 2,
        },
      ],
    }
  }

  // Statistics calculations
  const getTotalSpent = () => filteredExpenses.reduce((total, expense) => total + expense.amount, 0)

  const getAverageExpense = () => {
    const total = getTotalSpent()
    return filteredExpenses.length > 0 ? total / filteredExpenses.length : 0
  }

  const getMostExpensiveCategory = () => {
    const categoryTotals = categories.reduce(
      (acc, category) => {
        acc[category.name.toLowerCase().replace(/\s+/g, "-")] = {
          total: 0,
          name: category.name,
          icon: category.icon,
        }
        return acc
      },
      {} as Record<string, { total: number; name: string; icon: string }>,
    )

    filteredExpenses.forEach((expense) => {
      if (categoryTotals[expense.category]) {
        categoryTotals[expense.category].total += expense.amount
      }
    })

    const maxCategory = Object.values(categoryTotals).reduce(
      (max, current) => (current.total > max.total ? current : max),
      { total: 0, name: "None", icon: "📝" },
    )

    return maxCategory.total > 0 ? maxCategory : null
  }

  const getTopSpender = () => {
    if (users.length === 0) return null // Early return if no users

    const memberTotals = users.reduce(
      (acc, member) => {
        acc[member.id] = { total: 0, name: member.displayName }
        return acc
      },
      {} as Record<string, { total: number; name: string }>,
    )

    filteredExpenses.forEach((expense) => {
      if (memberTotals[expense.paidBy]) {
        memberTotals[expense.paidBy].total += expense.amount
      }
    })

    const topSpender = Object.values(memberTotals).reduce(
      (max, current) => (current.total > max.total ? current : max),
      { total: 0, name: "None" }, // Provide initial value
    )

    return topSpender.total > 0 ? topSpender : null
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#E5E7EB",
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.9)",
        titleColor: "#F9FAFB",
        bodyColor: "#E5E7EB",
        borderColor: "#374151",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#9CA3AF",
        },
        grid: {
          color: "rgba(75, 85, 99, 0.3)",
        },
      },
      y: {
        ticks: {
          color: "#9CA3AF",
          callback: (value: any) => "$" + value.toFixed(0),
        },
        grid: {
          color: "rgba(75, 85, 99, 0.3)",
        },
      },
    },
  }

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          color: "#E5E7EB",
          font: {
            size: 12,
          },
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.9)",
        titleColor: "#F9FAFB",
        bodyColor: "#E5E7EB",
        borderColor: "#374151",
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
            const percentage = ((context.parsed / total) * 100).toFixed(1)
            return `${context.label}: $${context.parsed.toFixed(2)} (${percentage}%)`
          },
        },
      },
    },
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading statistics...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex h-16 items-center px-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-lg shadow-lg">
                <BarChart3 className="h-6 w-6" />
              </div>
              <span className="text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ExpenseTracker
              </span>
            </Link>
            <nav className="ml-auto flex items-center gap-4 sm:gap-6">
              <Link href="/add-expense" className="text-sm font-medium hover:text-blue-400 transition-colors">
                Add Expense
              </Link>
              <Link href="/expenses" className="text-sm font-medium hover:text-blue-400 transition-colors">
                View Expenses
              </Link>
              <UserMenu />
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 animate-slide-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="outline" size="icon" className="border-gray-600 hover:bg-gray-800">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Expense Statistics
                  </h1>
                  <p className="text-gray-400">Analyze your spending patterns and trends</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-40 bg-gray-700/50 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="1month" className="text-white hover:bg-gray-700">
                      Last Month
                    </SelectItem>
                    <SelectItem value="3months" className="text-white hover:bg-gray-700">
                      Last 3 Months
                    </SelectItem>
                    <SelectItem value="6months" className="text-white hover:bg-gray-700">
                      Last 6 Months
                    </SelectItem>
                    <SelectItem value="1year" className="text-white hover:bg-gray-700">
                      Last Year
                    </SelectItem>
                    <SelectItem value="all" className="text-white hover:bg-gray-700">
                      All Time
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Total Spent</CardTitle>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">${getTotalSpent().toFixed(2)}</div>
                  <p className="text-xs text-gray-400">{filteredExpenses.length} transactions</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Average Expense</CardTitle>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">${getAverageExpense().toFixed(2)}</div>
                  <p className="text-xs text-gray-400">per transaction</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Top Category</CardTitle>
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <PieChart className="h-4 w-4 text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  {getMostExpensiveCategory() ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{getMostExpensiveCategory()?.icon}</span>
                        <div className="text-lg font-bold text-purple-400">
                          ${getMostExpensiveCategory()?.total.toFixed(2)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">{getMostExpensiveCategory()?.name}</p>
                    </>
                  ) : (
                    <div className="text-lg font-bold text-gray-400">No data</div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Top Spender</CardTitle>
                  <div className="p-2 bg-yellow-500/20 rounded-lg">
                    <Users className="h-4 w-4 text-yellow-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  {getTopSpender() ? (
                    <>
                      <div className="text-2xl font-bold text-yellow-400">${getTopSpender()?.total.toFixed(2)}</div>
                      <p className="text-xs text-gray-400">{getTopSpender()?.name}</p>
                    </>
                  ) : (
                    <div className="text-lg font-bold text-gray-400">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Category Breakdown Pie Chart */}
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <PieChart className="h-5 w-5 text-purple-400" />
                    Spending by Category
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Breakdown of expenses across different categories
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    {getCategoryData().labels.length > 0 ? (
                      <Pie data={getCategoryData()} options={pieOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                          <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No category data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Member Spending Bar Chart */}
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BarChart3 className="h-5 w-5 text-blue-400" />
                    Spending by Member
                  </CardTitle>
                  <CardDescription className="text-gray-400">Total amount paid by each group member</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="h-80">
                    {getMemberSpendingData().labels.length > 0 ? (
                      <Bar data={getMemberSpendingData()} options={chartOptions} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No member data available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend Line Chart */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-gray-700">
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  Monthly Spending Trend
                </CardTitle>
                <CardDescription className="text-gray-400">Track your spending patterns over time</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-80">
                  {getMonthlyTrendData().labels.length > 0 ? (
                    <Line data={getMonthlyTrendData()} options={chartOptions} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No trend data available</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category Details */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-b border-gray-700">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  Category Breakdown
                </CardTitle>
                <CardDescription className="text-gray-400">Detailed spending by category</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => {
                    const categoryKey = category.name.toLowerCase().replace(/\s+/g, "-")
                    const categoryTotal = filteredExpenses
                      .filter((expense) => expense.category === categoryKey)
                      .reduce((total, expense) => total + expense.amount, 0)

                    const categoryCount = filteredExpenses.filter((expense) => expense.category === categoryKey).length

                    if (categoryTotal === 0) return null

                    return (
                      <div
                        key={category.name}
                        className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                            style={{ backgroundColor: category.color + "20" }}
                          >
                            {category.icon}
                          </div>
                          <div>
                            <p className="font-medium text-white">{category.name}</p>
                            <p className="text-sm text-gray-400">{categoryCount} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">${categoryTotal.toFixed(2)}</p>
                          <p className="text-sm text-gray-400">
                            {((categoryTotal / getTotalSpent()) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}