import { create } from 'zustand';

export interface CartItem {
  dishId: number;
  name: string;
  difficulty: number;
  duration: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (dish: { id: number; name: string; difficulty: number; duration: number }) => void;
  removeItem: (dishId: number) => void;
  updateQuantity: (dishId: number, delta: number) => void;
  clearCart: () => void;
  totalDifficulty: () => number;
  totalDuration: () => number;
  totalCount: () => number;
}

const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (dish) => {
    set((state) => {
      const existing = state.items.find((item) => item.dishId === dish.id);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.dishId === dish.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { dishId: dish.id, name: dish.name, difficulty: dish.difficulty, duration: dish.duration, quantity: 1 },
        ],
      };
    });
  },

  removeItem: (dishId) => {
    set((state) => ({
      items: state.items.filter((item) => item.dishId !== dishId),
    }));
  },

  updateQuantity: (dishId, delta) => {
    set((state) => {
      const updated = state.items
        .map((item) => {
          if (item.dishId !== dishId) return item;
          return { ...item, quantity: item.quantity + delta };
        })
        .filter((item) => item.quantity > 0);
      return { items: updated };
    });
  },

  clearCart: () => set({ items: [] }),

  totalDifficulty: () => {
    return get().items.reduce((sum, item) => sum + item.difficulty * item.quantity, 0);
  },

  totalDuration: () => {
    return get().items.reduce((sum, item) => sum + item.duration * item.quantity, 0);
  },

  totalCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

export default useCartStore;
