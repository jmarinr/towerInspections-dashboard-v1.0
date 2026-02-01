import { create } from 'zustand'
import { mockOrders } from '../data/mockOrders.js'

export const useOrdersStore = create((set, get) => ({
  orders: [],
  isLoading: false,
  selectedStatus: 'all',
  search: '',
  load: async () => {
    set({ isLoading: true })
    // Simula llamada a API (luego se conecta al backend)
    await new Promise(r => setTimeout(r, 350))
    set({ orders: mockOrders, isLoading: false })
  },
  setFilter: (patch) => set(patch),
  getFiltered: () => {
    const { orders, selectedStatus, search } = get()
    const q = search.trim().toLowerCase()
    return orders.filter(o => {
      const statusOk = selectedStatus === 'all' ? true : o.status === selectedStatus
      const text = `${o.id} ${o.siteId} ${o.siteName} ${o.inspectorName}`.toLowerCase()
      const qOk = q ? text.includes(q) : true
      return statusOk && qOk
    })
  },
  byId: (id) => get().orders.find(o => String(o.id) === String(id)),
}))
