"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarIcon, Receipt, ArrowLeft, Loader2, Sparkles } from "lucide-react"
import { format } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { AuthGuard } from "@/components/auth-guard"
import { UserMenu } from "@/components/user-menu"
import { NotificationBell } from "@/components/notification-bell"

interface User {
  id: string
  displayName: string
  email: string
  photoURL?: string
}

export default function AddExpensePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [category, setCategory] = useState("")
  const [paidBy, setPaidBy] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

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

  useEffect(() => {
    if (user) {
      setPaidBy(user.uid)
      loadUsers()
    }
  }, [user])

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
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description || !amount || !category || !paidBy || selectedMembers.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select at least one person to split with.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    const expense = {
      description,
      amount: Number.parseFloat(amount),
      date: date?.toISOString(),
      category,
      paidBy,
      splitWith: selectedMembers,
      notes,
      createdAt: new Date().toISOString(),
      createdBy: user?.uid,
    }

    try {
      await addDoc(collection(db, "expenses"), expense)

      toast({
        title: "Expense Added! 🎉",
        description: `Successfully added ${description} for $${amount}`,
      })

      // Reset form
      setDescription("")
      setAmount("")
      setDate(new Date())
      setCategory("")
      setPaidBy(user?.uid || "")
      setNotes("")
      setSelectedMembers([])

      setTimeout(() => {
        router.push("/expenses")
      }, 1000)
    } catch (error) {
      console.error("Error adding expense:", error)
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
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
            <nav className="ml-auto flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <Link href="/expenses" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                View Expenses
              </Link>
              <Link href="/calculator" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                Calculator
              </Link>
              <NotificationBell />
              <UserMenu />
            </nav>
          </div>
        </header>

        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
          <div className="flex flex-col gap-4 md:gap-8 animate-slide-in-up">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="icon" className="border-gray-600 hover:bg-gray-800">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Add New Expense
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">Record a new expense to track with your group</p>
              </div>
            </div>

            <Card className="max-w-2xl mx-auto bg-gray-800/50 border-gray-700 shadow-2xl">
              <form onSubmit={handleSubmit}>
                <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-gray-700">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="h-5 w-5 text-blue-400" />
                    Expense Details
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Enter the details of the expense you want to track
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 p-4 sm:p-6">
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-200">
                      Description *
                    </Label>
                    <Input
                      id="description"
                      placeholder="e.g., Dinner, Groceries, Rent"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-gray-200">
                      Amount *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-8 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-200">Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700",
                              !date && "text-gray-400",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            className="bg-gray-800 text-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-gray-200">
                        Category *
                      </Label>
                      <Select value={category} onValueChange={setCategory} required>
                        <SelectTrigger id="category" className="bg-gray-700/50 border-gray-600 text-white">
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paidBy" className="text-gray-200">
                      Paid by *
                    </Label>
                    <Select value={paidBy} onValueChange={setPaidBy} required>
                      <SelectTrigger id="paidBy" className="bg-gray-700/50 border-gray-600 text-white">
                        <SelectValue placeholder="Who paid for this expense?" />
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

                  <div className="space-y-4">
                    <Label className="text-gray-200">Split with (Select people who should share this expense) *</Label>
                    <div className="border border-gray-600 rounded-md p-4 bg-gray-700/30">
                      {loadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                          <span className="ml-2 text-gray-400">Loading users...</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {users.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-600/30 transition-colors"
                            >
                              <Checkbox
                                id={`member-${member.id}`}
                                checked={selectedMembers.includes(member.id)}
                                onCheckedChange={() => handleMemberToggle(member.id)}
                                className="border-gray-500"
                              />
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={member.photoURL || "/placeholder.svg"} />
                                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold">
                                    {member.displayName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <Label
                                  htmlFor={`member-${member.id}`}
                                  className="text-sm font-medium text-gray-200 cursor-pointer"
                                >
                                  {member.displayName}
                                  <span className="text-xs text-gray-400 block">{member.email}</span>
                                </Label>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-gray-200">
                      Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional details about this expense"
                      className="min-h-[100px] bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-500"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row justify-between gap-3 p-4 sm:p-6 bg-gray-800/30 border-t border-gray-700">
                  <Link href="/" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      type="button"
                      className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Receipt className="mr-2 h-4 w-4" />
                        Add Expense
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
