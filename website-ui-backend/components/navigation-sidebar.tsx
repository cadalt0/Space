"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Store, Package, MessageSquare, Users, Plus, Wallet, User } from "lucide-react"
import { useAuthGuard } from "@/lib/useAuthGuard"
import Image from "next/image"

interface NavigationSidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  enabledSections?: Array<{ id: string; label: string; enabled: boolean }>
  isSpacePage?: boolean
}

const defaultNavigationItems = [
  {
    id: "explore",
    label: "Explore Spaces",
    icon: Store,
  },
  {
    id: "create",
    label: "Create Space",
    icon: Plus,
    special: true,
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: Wallet,
  },
]

const spaceNavigationItems = [
  {
    id: "explore",
    label: "Explore onchain shops",
    icon: Store,
  },
  {
    id: "lend",
    label: "Lend IRL items",
    icon: Package,
  },
  {
    id: "request",
    label: "Request",
    icon: MessageSquare,
  },
  {
    id: "hangout",
    label: "Hangout",
    icon: Users,
  },
  {
    id: "create-room",
    label: "Create Room",
    icon: Plus,
    special: true,
  },
]

export function NavigationSidebar({
  activeSection,
  onSectionChange,
  enabledSections,
  isSpacePage = false,
}: NavigationSidebarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { requireAuth } = useAuthGuard()

  const navigationItems =
    isSpacePage && enabledSections
      ? [
          ...enabledSections
            .filter((section) => section.enabled)
            .map((section) => {
              const defaultItem = spaceNavigationItems.find((item) => item.id === section.id)
              return {
                id: section.id,
                label: section.label,
                icon: defaultItem?.icon || Store,
                enabled: section.enabled,
                special: false,
              }
            }),
          // Always add Create Room option for spaces
          {
            id: "create-room",
            label: "Create Room",
            icon: Plus,
            enabled: true,
            special: true,
          },
        ]
      : defaultNavigationItems

  const NavContent = () => (
    <div className="flex flex-col h-full glass-sidebar">
      {!isSpacePage && (
        <div className="mb-8 p-6 md:p-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-18 h-18 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="SPACE Logo"
                  width={72}
                  height={72}
                  className="object-contain drop-shadow-lg"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl blur-md -z-10"></div>
            </div>
          </div>
        </div>
      )}

      <nav className={`flex-1 space-y-2 px-4 sm:px-6 md:px-0 ${isSpacePage ? "pt-6" : ""}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          const isSpecial = item.special

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.special) {
                  requireAuth("create a room", () => {
                    onSectionChange(item.id)
                    setIsMobileMenuOpen(false)
                  })
                } else {
                  onSectionChange(item.id)
                  setIsMobileMenuOpen(false)
                }
              }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${
                isActive
                  ? "bg-white/10 text-white shadow-lg backdrop-blur-sm"
                  : isSpecial
                    ? "text-green-400 hover:bg-white/5 hover:text-green-300"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">
                {isSpecial && !isSpacePage ? `+ ${item.label}` : item.label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-full md:w-1/5 min-h-screen glass-sidebar p-4 md:p-6">
        <NavContent />
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {!isSpacePage && (
          <div className="flex items-center justify-between p-4 glass-sidebar">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-15 h-15 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="SPACE Logo"
                    width={60}
                    height={60}
                    className="object-contain drop-shadow-lg"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-xl blur-md -z-10"></div>
              </div>
            </div>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:glass-card">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 glass-modal p-0">
                <NavContent />
              </SheetContent>
            </Sheet>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 glass-sidebar p-3 md:hidden z-50">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {navigationItems.slice(0, 4).map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 ${
                    isActive ? "text-white glass-card" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-xs font-medium truncate max-w-16">{item.label.split(" ")[0]}</span>
                </button>
              )
            })}
            {navigationItems.find((item) => item.special) && (
              <button
                onClick={() => requireAuth("create a room", () => onSectionChange(navigationItems.find((item) => item.special)?.id || "create"))}
                className="flex flex-col items-center gap-1 p-2 rounded-lg text-green-400 hover:text-green-300 min-w-0"
              >
                <Plus className="h-5 w-5 flex-shrink-0" />
                <span className="text-xs font-medium">Create</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
