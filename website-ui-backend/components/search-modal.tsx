"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Users, ExternalLink } from "lucide-react"

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
}

const mockEvents = [
  {
    id: 1,
    title: "ETH Global London Hackathon",
    date: "March 15-17, 2024",
    location: "London, UK",
    attendees: 500,
    type: "Hackathon",
    description: "Build the future of Web3 with the best developers in London",
    tags: ["Ethereum", "DeFi", "NFTs"],
  },
  {
    id: 2,
    title: "Solana Breakpoint Conference",
    date: "April 20-21, 2024",
    location: "New York, NY",
    attendees: 1200,
    type: "Conference",
    description: "The biggest Solana event of the year featuring top builders",
    tags: ["Solana", "DApps", "Gaming"],
  },
  {
    id: 3,
    title: "Bitcoin Miami Meetup",
    date: "March 25, 2024",
    location: "Miami, FL",
    attendees: 150,
    type: "Meetup",
    description: "Monthly Bitcoin meetup for enthusiasts and developers",
    tags: ["Bitcoin", "Lightning", "Mining"],
  },
  {
    id: 4,
    title: "DeFi Summit Berlin",
    date: "May 10-12, 2024",
    location: "Berlin, Germany",
    attendees: 800,
    type: "Summit",
    description: "Exploring the future of decentralized finance",
    tags: ["DeFi", "Yield Farming", "Protocols"],
  },
]

export function SearchModal({ isOpen, onClose, searchQuery }: SearchModalProps) {
  const filteredEvents = mockEvents.filter(
    (event) =>
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-black/95 backdrop-blur-md border-cyan-500/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Search Results for "{searchQuery}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className="p-6 rounded-xl bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-cyan-500/20 hover:border-cyan-400/40 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                      <Badge
                        variant="secondary"
                        className="bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/30"
                      >
                        {event.type}
                      </Badge>
                    </div>

                    <p className="text-gray-300 mb-4">{event.description}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {event.attendees} attendees
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {event.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs border-gray-600 text-gray-300 hover:border-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white border-0 shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40">
                    View Event
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">No events found for "{searchQuery}"</div>
              <p className="text-gray-500">Try searching for different keywords or locations</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
