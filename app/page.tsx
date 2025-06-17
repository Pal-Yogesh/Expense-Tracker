"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle, Receipt, Sparkles, Zap, Shield, BarChart3, Calculator, Search } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { UserMenu } from "@/components/user-menu"
import { NotificationBell } from "@/components/notification-bell"

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-14 sm:h-16 items-center px-3 sm:px-6">
          <div className="flex items-center gap-2 font-semibold">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-1.5 sm:p-2 rounded-lg shadow-lg">
              <Receipt className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <span className="text-sm sm:text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ExpenseTracker
            </span>
          </div>
          <nav className="ml-auto flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
            {user ? (
              <>
                <Link href="/add-expense" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                  Add
                </Link>
                <Link href="/expenses" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                  Expenses
                </Link>
                <Link href="/statistics" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                  Stats
                </Link>
                <Link href="/calculator" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                  Split
                </Link>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              !loading && (
                <>
                  <Link href="/login" className="font-medium hover:text-blue-400 transition-colors px-2 py-1">
                    Sign In
                  </Link>
                  <Link href="/signup">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                      Sign Up
                    </Button>
                  </Link>
                </>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="w-full py-8 sm:py-12 md:py-24 lg:py-32 relative overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 h-40 sm:w-80 sm:h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 h-40 sm:w-80 sm:h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
          </div>

          <div className="container px-3 sm:px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center animate-slide-in-up">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-blue-400 mb-4">
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Now with Firebase Authentication & Advanced Analytics</span>
                  <span className="sm:hidden">Advanced Features</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold tracking-tighter bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent leading-tight">
                  Track Group Expenses
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Like Never Before
                  </span>
                </h1>
                <p className="max-w-[90%] sm:max-w-[600px] text-gray-400 text-sm sm:text-base md:text-xl px-4">
                  Simple and powerful way to track shared expenses with friends, roommates, and groups. Real-time sync
                  with beautiful analytics and smart splitting.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-sm sm:max-w-none">
                {user ? (
                  <>
                    <Link href="/add-expense" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        className="w-full group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <PlusCircle className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                        Add Expense
                      </Button>
                    </Link>
                    <Link href="/expenses" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                      >
                        <Receipt className="mr-2 h-4 w-4" />
                        View Expenses
                      </Button>
                    </Link>
                    <Link href="/calculator" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                      >
                        <Calculator className="mr-2 h-4 w-4" />
                        Split Calculator
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/signup" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        className="w-full group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <PlusCircle className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                        Get Started Free
                      </Button>
                    </Link>
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-all duration-300"
                      >
                        <Receipt className="mr-2 h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-8 sm:py-12 md:py-24 bg-gray-900/50">
          <div className="container px-3 sm:px-4 md:px-6">
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 animate-slide-in-up group">
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Secure Authentication</CardTitle>
                  <div className="ml-auto p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                    <Shield className="h-4 w-4 text-blue-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400 text-sm">
                    Sign in with Google or email. Your data is protected with Firebase security.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 animate-slide-in-up group"
                style={{ animationDelay: "0.1s" }}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Smart Search</CardTitle>
                  <div className="ml-auto p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <Search className="h-4 w-4 text-purple-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400 text-sm">
                    Advanced search and filtering with real-time results and smart suggestions.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 animate-slide-in-up group"
                style={{ animationDelay: "0.2s" }}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Split Calculator</CardTitle>
                  <div className="ml-auto p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                    <Calculator className="h-4 w-4 text-green-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400 text-sm">
                    Advanced splitting calculator with settlement optimization and payment tracking.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card
                className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-all duration-300 animate-slide-in-up group"
                style={{ animationDelay: "0.3s" }}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-200">Real-time Sync</CardTitle>
                  <div className="ml-auto p-2 bg-orange-500/20 rounded-lg group-hover:bg-orange-500/30 transition-colors">
                    <Zap className="h-4 w-4 text-orange-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-400 text-sm">
                    Instant updates across all devices with Firestore real-time database.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Features showcase */}
        <section className="w-full py-8 sm:py-12 md:py-24 relative">
          <div className="container px-3 sm:px-4 md:px-6">
            <div className="text-center mb-8 sm:mb-12 animate-slide-in-up">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Why Choose ExpenseTracker?</h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
                Built with modern technology and designed for simplicity, our app makes expense tracking effortless.
              </p>
            </div>

            <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: <Shield className="h-6 w-6 sm:h-8 sm:w-8" />,
                  title: "Secure & Reliable",
                  description: "Your data is safely stored in Firebase with enterprise-grade security.",
                  color: "from-green-400 to-emerald-600",
                },
                {
                  icon: <Zap className="h-6 w-6 sm:h-8 sm:w-8" />,
                  title: "Lightning Fast",
                  description: "Real-time updates and instant synchronization across all devices.",
                  color: "from-yellow-400 to-orange-600",
                },
                {
                  icon: <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />,
                  title: "Smart Analytics",
                  description: "Beautiful charts showing spending patterns, trends, and category breakdowns.",
                  color: "from-blue-400 to-purple-600",
                },
              ].map((feature, index) => (
                <Card
                  key={index}
                  className="bg-gray-800/30 border-gray-700 hover:bg-gray-800/50 transition-all duration-300 animate-slide-in-up group"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div
                      className={`inline-flex p-2 sm:p-3 rounded-lg bg-gradient-to-r ${feature.color} w-fit mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      {feature.icon}
                    </div>
                    <CardTitle className="text-white text-lg sm:text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-400 text-sm sm:text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-800 py-4 sm:py-6 md:py-0 bg-gray-900/50">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row px-3 sm:px-6">
          <p className="text-xs sm:text-sm text-gray-400 text-center">
            © 2023 ExpenseTracker. Simple expense tracking with style.
          </p>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <span>Powered by</span>
            <span className="text-orange-400 font-semibold">Firebase</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
