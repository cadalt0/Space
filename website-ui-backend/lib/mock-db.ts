import mockData from "../data/mock.json"

export interface Space {
  spaceId: string
  title: string
  description: string
  date: string
  location: string
  locationLink?: string
  featuresEnabled: string[]
  admins: string[]
  artwork: string
  background?: string
  tags: string[]
  upvotes: number
  downvotes: number
  space_contract_id?: string
}

export interface Shop {
  id: string
  name: string
  desc: string
  spaceId: string
  up: number
  down: number
  tags: string[]
}

export interface LendItem {
  id: string
  name: string
  desc: string
  owner: string
  available: boolean
  up: number
  down: number
  tags: string[]
}

export interface Request {
  id: string
  title: string
  desc: string
  requester: string
  up: number
  down: number
  tags: string[]
}

export interface Hangout {
  id: string
  title: string
  desc: string
  date: string
  location: string
  host: string
  up: number
  down: number
  tags: string[]
}
export interface MockDB {
  spaces: Space[]
  shops: Shop[]
  lendItems: LendItem[]
  requests: Request[]
  hangouts: Hangout[]
}

// In-memory database that can be modified
const db: MockDB = JSON.parse(JSON.stringify(mockData))

export const mockDB = {
  // Spaces
  getSpaces: (): Space[] => db.spaces,
  getSpace: (spaceId: string): Space | undefined => db.spaces.find((space) => space.spaceId === spaceId),
  addSpace: (space: Space): void => {
    db.spaces.push(space)
  },

  // Shops
  getShops: (): Shop[] => db.shops,
  getShopsBySpace: (spaceId: string): Shop[] => db.shops.filter((shop) => shop.spaceId === spaceId),
  addShop: (shop: Shop): void => {
    db.shops.push(shop)
  },

  // Lend Items
  getLendItems: (): LendItem[] => db.lendItems,
  addLendItem: (item: LendItem): void => {
    db.lendItems.push(item)
  },

  // Requests
  getRequests: (): Request[] => db.requests,
  addRequest: (request: Request): void => {
    db.requests.push(request)
  },

  // Hangouts
  getHangouts: (): Hangout[] => db.hangouts,
  addHangout: (hangout: Hangout): void => {
    db.hangouts.push(hangout)
  },

  // Voting
  upvote: (type: "spaces" | "shops" | "lendItems" | "requests" | "hangouts", id: string): void => {
    const items = db[type] as any[]
    const item = items.find((item) => (type === "spaces" ? item.spaceId === id : item.id === id))
    if (item) {
      if (type === "spaces") {
        item.upvotes = (item.upvotes || 0) + 1
      } else {
        item.up = (item.up || 0) + 1
      }
    }
  },

  downvote: (type: "spaces" | "shops" | "lendItems" | "requests" | "hangouts", id: string): void => {
    const items = db[type] as any[]
    const item = items.find((item) => (type === "spaces" ? item.spaceId === id : item.id === id))
    if (item) {
      if (type === "spaces") {
        item.downvotes = (item.downvotes || 0) + 1
      } else {
        item.down = (item.down || 0) + 1
      }
    }
  },
}

