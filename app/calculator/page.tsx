"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Calculator, Users, DollarSign, ArrowRight, CheckCircle, Calendar } from "lucide-react"
import { collection, onSnapshot, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, endOfMonth, isWithinInterval } from "date-fns"
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

interface User {
  id: string
  displayName: string
  email: string
  photoURL?: string
}

interface MonthlyCalculation {
  totalExpenses: number
  equalShare: number
  memberPayments: Record<string, number>
  memberOwes: Record<string, number>
  settlements: Settlement[]
}

interface Settlement {
  from: string
  to: string
  amount: number
}

export default function CalculatorPage() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedMonth, setSelectedMonth] = useState("")
  const [isLoading, setIsLoading] = useState(true)

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

    // Set current month as default
    const now = new Date()
    setSelectedMonth(format(now, "yyyy-MM"))

    return () => unsubscribe()
  }, [user])

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

  const getFilteredExpenses = () => {
    if (!selectedMonth) return expenses

    const [year, month] = selectedMonth.split("-")
    const monthStart = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
    const monthEnd = endOfMonth(monthStart)

    return expenses.filter((expense) =>
      isWithinInterval(new Date(expense.date), {
        start: monthStart,
        end: monthEnd,
      }),
    )
  }

  const calculateMonthlyPayments = (): MonthlyCalculation => {
    const filteredExpenses = getFilteredExpenses()
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

    // Get unique members who participated in expenses
    const participatingMembers = new Set<string>()
    filteredExpenses.forEach((expense) => {
      participatingMembers.add(expense.paidBy)
      expense.splitWith.forEach((memberId) => participatingMembers.add(memberId))
    })

    const participatingMembersList = Array.from(participatingMembers)
    const equalShare = participatingMembersList.length > 0 ? totalExpenses / participatingMembersList.length : 0

    // Calculate how much each member has paid
    const memberPayments: Record<string, number> = {}
    participatingMembersList.forEach((memberId) => {
      memberPayments[memberId] = 0
    })

    filteredExpenses.forEach((expense) => {
      if (memberPayments.hasOwnProperty(expense.paidBy)) {
        memberPayments[expense.paidBy] += expense.amount
      }
    })

    // Calculate how much each member owes (equal share - what they paid)
    const memberOwes: Record<string, number> = {}
    participatingMembersList.forEach((memberId) => {
      const amountOwed = equalShare - memberPayments[memberId]
      memberOwes[memberId] = amountOwed
    })

    // Calculate settlements needed
    const settlements = calculateOptimalSettlements(memberOwes)

    return {
      totalExpenses,
      equalShare,
      memberPayments,
      memberOwes,
      settlements,
    }
  }

  const calculateOptimalSettlements = (memberOwes: Record<string, number>): Settlement[] => {
    const settlements: Settlement[] = []

    // Create arrays of people who owe money and people who are owed money
    const debtors: { id: string; amount: number }[] = []
    const creditors: { id: string; amount: number }[] = []

    Object.entries(memberOwes).forEach(([memberId, amount]) => {
      if (amount > 0.01) {
        debtors.push({ id: memberId, amount })
      } else if (amount < -0.01) {
        creditors.push({ id: memberId, amount: -amount })
      }
    })

    // Sort by amount (largest first)
    debtors.sort((a, b) => b.amount - a.amount)
    creditors.sort((a, b) => b.amount - a.amount)

    // Calculate optimal settlements
    let i = 0,
      j = 0
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i]
      const creditor = creditors[j]

      const settlementAmount = Math.min(debtor.amount, creditor.amount)

      if (settlementAmount > 0.01) {
        settlements.push({
          from: debtor.id,
          to: creditor.id,
          amount: settlementAmount,
        })

        debtor.amount -= settlementAmount
        creditor.amount -= settlementAmount

        if (debtor.amount < 0.01) i++
        if (creditor.amount < 0.01) j++
      } else {
        break
      }
    }

    return settlements
  }

  const getMemberInfo = (memberId: string) => {
    return (
      users.find((member) => member.id === memberId) || {
        id: memberId,
        displayName: "Unknown User",
        email: "",
        photoURL: undefined,
      }
    )
  }

  // Get only users who participated in expenses for the selected month
  const getParticipatingUsers = () => {
    const filteredExpenses = getFilteredExpenses()
    const participatingMembers = new Set<string>()

    filteredExpenses.forEach((expense) => {
      participatingMembers.add(expense.paidBy)
      expense.splitWith.forEach((memberId) => participatingMembers.add(memberId))
    })

    return users.filter((user) => participatingMembers.has(user.id))
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Calculating monthly splits...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  const monthlyCalc = calculateMonthlyPayments()
  const selectedMonthLabel = getMonthOptions().find((m) => m.value === selectedMonth)?.label || "Current Month"
  const participatingUsers = getParticipatingUsers()

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-1.5 sm:p-2 rounded-lg shadow-lg">
                <Calculator className="h-4 w-4 sm:h-6 sm:w-6" />
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
              <Link href="/statistics" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                Stats
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
                <Link href="/">
                  <Button variant="outline" size="icon" className="border-gray-600 hover:bg-gray-800">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Monthly Split Calculator
                  </h1>
                  <p className="text-gray-400 text-sm sm:text-base">Equal split calculation for {selectedMonthLabel}</p>
                </div>
              </div>

              {/* Month Selector */}
              <div className="w-full sm:w-auto">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-48 bg-gray-700/50 border-gray-600 text-white">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Select month" />
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
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Total Monthly Expenses</CardTitle>
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <DollarSign className="h-4 w-4 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-blue-400">
                    ${monthlyCalc.totalExpenses.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-400">{getFilteredExpenses().length} expenses</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Equal Share Per Person</CardTitle>
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <Users className="h-4 w-4 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-400">
                    ${monthlyCalc.equalShare.toFixed(2)}
                  </div>
                  <p className="text-xs text-gray-400">per person ({participatingUsers.length} people)</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700 shadow-xl sm:col-span-2 lg:col-span-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Settlements Needed</CardTitle>
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Calculator className="h-4 w-4 text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-purple-400">{monthlyCalc.settlements.length}</div>
                  <p className="text-xs text-gray-400">transactions</p>
                </CardContent>
              </Card>
            </div>

            {/* Member Payment Summary */}
            <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-gray-700">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="h-5 w-5 text-blue-400" />
                  Monthly Payment Summary
                </CardTitle>
                <CardDescription className="text-gray-400">
                  How much each person paid vs their equal share for {selectedMonthLabel}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4 sm:gap-6">
                  {participatingUsers.map((member, index) => {
                    const paid = monthlyCalc.memberPayments[member.id] || 0
                    const owes = monthlyCalc.memberOwes[member.id] || 0
                    const status = owes > 0.01 ? "owes" : owes < -0.01 ? "overpaid" : "settled"

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600 animate-slide-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="flex items-center gap-4 mb-3 sm:mb-0">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.photoURL || "/placeholder.svg"} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                              {member.displayName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-white text-base sm:text-lg">{member.displayName}</h3>
                            <Link href={`/users/${member.id}`} className="text-xs text-blue-400 hover:underline">
                              View Profile
                            </Link>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full sm:w-auto text-center">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Paid</p>
                            <p className="font-bold text-blue-400">${paid.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Equal Share</p>
                            <p className="font-bold text-white">${monthlyCalc.equalShare.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">
                              {status === "owes" ? "Still Owes" : status === "overpaid" ? "Overpaid" : "Balance"}
                            </p>
                            <p
                              className={`font-bold ${
                                status === "owes"
                                  ? "text-red-400"
                                  : status === "overpaid"
                                    ? "text-green-400"
                                    : "text-gray-400"
                              }`}
                            >
                              ${Math.abs(owes).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <Badge
                              className={`${
                                status === "owes"
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : status === "overpaid"
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                              } border`}
                            >
                              {status === "owes" ? "Owes Money" : status === "overpaid" ? "Overpaid" : "Settled"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Settlement Recommendations */}
            {monthlyCalc.settlements.length > 0 && (
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    Settlement Plan for {selectedMonthLabel}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Optimized payments to settle all balances with minimum transfers
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {monthlyCalc.settlements.map((settlement, index) => {
                      const fromMember = getMemberInfo(settlement.from)
                      const toMember = getMemberInfo(settlement.to)

                      return (
                        <div
                          key={index}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600 animate-slide-in-up"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="flex items-center gap-4 mb-3 sm:mb-0">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={fromMember.photoURL || "/placeholder.svg"} />
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm">
                                {fromMember.displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2 sm:gap-4">
                              <div className="text-center">
                                <p className="font-medium text-white text-sm sm:text-base">{fromMember.displayName}</p>
                                <p className="text-xs text-gray-400">pays</p>
                              </div>
                              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 mx-2" />
                              <div className="text-center">
                                <p className="font-medium text-white text-sm sm:text-base">{toMember.displayName}</p>
                                <p className="text-xs text-gray-400">receives</p>
                              </div>
                            </div>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={toMember.photoURL || "/placeholder.svg"} />
                              <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm">
                                {toMember.displayName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-sm sm:text-base px-3 py-1">
                              ${settlement.amount.toFixed(2)}
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                            >
                              Mark Paid
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Expenses Message */}
            {monthlyCalc.totalExpenses === 0 && (
              <Card className="bg-gray-800/50 border-gray-700 shadow-xl">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No Expenses for {selectedMonthLabel}</h3>
                  <p className="text-gray-400 mb-6">Add some expenses to see the monthly split calculation.</p>
                  <Link href="/add-expense">
                    <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg">
                      Add First Expense
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
