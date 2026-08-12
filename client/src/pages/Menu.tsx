import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useCartStore from '../store/cart';
import CartDrawer from '../components/CartDrawer';

interface Category {
  id: number;
  name: string;
}

interface Dish {
  id: number;
  name: string;
  difficulty: number;
  duration: number;
  categoryId: number;
  status: string;
  description?: string;
  image?: string;
}

const FOOD_EMOJIS = [
  '🍜', '🍛', '🍝', '🥘', '🍲', '🍱', '🧆', '🥗',
  '🍗', '🥩', '🍤', '🦐', '🐟', '🍖', '🥟', '🍔',
  '🌮', '🥙', '🍚', '🍙', '🍣', '🍰', '🧁', '🍩',
  '🥤', '🍹', '🍵', '☕', '🥂', '🥣', '🍿', '🧀',
];

// 按菜名关键词匹配 emoji，避免"货不对板"
const EMOJI_RULES: [RegExp, string][] = [
  [/鸡|鸭|鹅|禽/, '🍗'],
  [/鱼|鲈|鳝|黄花|鲶|多宝|石斑|鲳|鳗/, '🐟'],
  [/虾|蟹|蚝|贝|螺|鱿|鲍|海参|甲鱼|濑尿|蛤蜊|花甲|带子|青口|蛏/, '🦞'],
  [/肉|骨|排|肘|蹄|腩|腊|叉烧|扣肉|烧肉/, '🍖'],
  [/牛|羊/, '🥩'],
  [/豆腐|豆皮|腐竹/, '🍢'],
  [/蛋|鸡蛋/, '🥚'],
  [/汤|羹|炖/, '🍲'],
  [/粥|饭|炒饭|煲仔|糯米饭/, '🍚'],
  [/面|粉|肠粉|云吞/, '🍜'],
  [/包|饺|烧卖|糯米鸡/, '🥟'],
  [/凉菜|拌|白切|卤|酱|醉|盐水|糟|腌/, '🥗'],
  [/蔬|菜|瓜|藕|笋|豆芽|西兰花|菠菜|莴笋/, '🥬'],
  [/糖水|甜|布丁|奶|糕|西米露|椰汁|冰淇淋|冰沙|班戟|糯米糍/, '🍮'],
  [/茶|饮|汁|可乐|雪碧|芬达|豆浆|牛奶|酸奶|奶茶/, '🥤'],
  [/果|橙|芒|菠萝|香蕉|草莓|西瓜|蜜桃|石榴/, '🍉'],
  [/菌|菇|木耳/, '🍄'],
];

function getEmoji(name: string, id: number): string {
  for (const [pattern, emoji] of EMOJI_RULES) {
    if (pattern.test(name)) return emoji;
  }
  return FOOD_EMOJIS[id % FOOD_EMOJIS.length];
}

const PAGE_SIZE = 20;

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<number>>(new Set());
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const items = useCartStore((s) => s.items);
  const totalCount = useCartStore((s) => s.totalCount);

  // Fetch categories and dishes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, dishRes] = await Promise.all([
          api.get<Category[]>('/categories'),
          api.get<Dish[]>('/dishes', { params: { status: 'ENABLED' } }),
        ]);
        setCategories(catRes.data);
        setDishes(dishRes.data);
      } catch (err) {
        console.error('Failed to fetch menu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Filter dishes by category AND search (must be declared before effects below)
  const filteredDishes = dishes.filter((d) => {
    const matchCategory = activeCategory === null || d.categoryId === activeCategory;
    const matchSearch = !debouncedSearch || d.name.toLowerCase().includes(debouncedSearch.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Reset pagination when filter changes
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [activeCategory, debouncedSearch]);

  // Infinite scroll: IntersectionObserver triggers load more
  const handleLoadMore = useCallback(() => {
    setDisplayCount(prev => prev + PAGE_SIZE);
  }, []);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < filteredDishes.length) {
          handleLoadMore();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayCount, filteredDishes.length, handleLoadMore]);

  // Get quantity of a dish in cart
  const getQuantity = (dishId: number): number => {
    const item = items.find((i) => i.dishId === dishId);
    return item ? item.quantity : 0;
  };

  // Handle add to cart with animation
  const handleAdd = (dish: Dish) => {
    addItem({ id: dish.id, name: dish.name, difficulty: dish.difficulty, duration: dish.duration });
    // Trigger scale animation
    setAnimatingIds((prev) => new Set(prev).add(dish.id));
    setTimeout(() => {
      setAnimatingIds((prev) => {
        const next = new Set(prev);
        next.delete(dish.id);
        return next;
      });
    }, 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f5f2] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f2] pb-6">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-orange-600 to-orange-500 shadow-lg">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
              🍽️
            </div>
            <div>
              <h1 className="text-white text-lg font-bold tracking-wide">美味餐厅</h1>
              <p className="text-orange-100 text-xs">Delicious Restaurant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* My Orders link */}
            <button
              onClick={() => navigate('/customer/orders')}
              className="text-orange-100 text-xs font-medium hover:text-white transition-colors"
            >
              我的订单
            </button>

            {/* Cart icon */}
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center justify-center w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl active:scale-95 transition-transform"
            >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z"
              />
            </svg>
            {totalCount() > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] flex items-center justify-center bg-white text-orange-600 text-xs font-bold rounded-full shadow-md px-1.5 animate-[scale-in_0.3s_ease-out]">
                {totalCount()}
              </span>
            )}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Search Bar + Category Tabs (merged sticky block) ===== */}
      <div className="sticky top-[72px] z-20 bg-[#f8f5f2] px-4 pt-3 pb-2 shadow-sm">
        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="搜索菜品..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
          />
          {searchText && (
            <button
              onClick={() => setSearchText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Categories - flex-wrap so all visible, no scroll needed */}
        <div className="flex flex-wrap gap-2">
          <button
            key="all"
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
              activeCategory === null
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
            }`}
          >
            全部
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-200'
                  : 'bg-white text-gray-600 shadow-sm hover:shadow-md'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ===== Dish Grid ===== */}
      <div className="px-4 pt-2">
        {filteredDishes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            {debouncedSearch ? (
              <>
                <span className="text-5xl mb-4">🔍</span>
                <p className="text-base">没有找到 "{debouncedSearch}"</p>
                <p className="text-sm mt-1">换个关键词试试</p>
              </>
            ) : (
              <>
                <span className="text-5xl mb-4">🍽️</span>
                <p className="text-base">该分类暂无菜品</p>
                <p className="text-sm mt-1">试试其他分类吧</p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2 px-1">
              共 {filteredDishes.length} 道菜，展示 {Math.min(displayCount, filteredDishes.length)} 道
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filteredDishes.slice(0, displayCount).map((dish) => {
                const qty = getQuantity(dish.id);
                const isAnimating = animatingIds.has(dish.id);
                return (
                  <div
                    key={dish.id}
                    className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Dish image */}
                    <div className="relative aspect-square bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden">
                      {dish.image ? (
                        <img
                          src={dish.image}
                          alt={dish.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-5xl">{getEmoji(dish.name, dish.id)}</span>
                      )}
                      {dish.description && (
                        <div className="absolute bottom-2 left-2 right-2 bg-black/40 backdrop-blur-sm rounded-lg px-2 py-1">
                          <p className="text-white text-[10px] truncate">{dish.description}</p>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 mb-1.5">
                        {dish.name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm text-orange-600 font-bold">
                            {'★'.repeat(dish.difficulty)}{'☆'.repeat(5 - dish.difficulty)}
                          </span>
                          <span className="text-xs text-gray-400">{dish.duration}分钟</span>
                        </div>

                        {/* Quantity control or add button */}
                        {qty > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateQuantity(dish.id, -1);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-full bg-orange-50 text-orange-600 text-base font-bold active:scale-90 transition-transform"
                            >
                              −
                            </button>
                            <span className="text-sm font-bold text-gray-700 w-5 text-center">
                              {qty}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdd(dish);
                              }}
                              className={`w-7 h-7 flex items-center justify-center rounded-full bg-orange-600 text-white text-base font-bold active:scale-90 transition-transform ${
                                isAnimating ? 'scale-125' : 'scale-100'
                              }`}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAdd(dish)}
                            className={`w-8 h-8 flex items-center justify-center rounded-full bg-orange-600 text-white text-lg font-bold shadow-md shadow-orange-200 active:scale-90 transition-all duration-200 hover:bg-orange-700 ${
                              isAnimating ? 'scale-125 bg-orange-500' : ''
                            }`}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-4" />
            {displayCount < filteredDishes.length && (
              <p className="text-center text-xs text-gray-400 pb-4">加载中...</p>
            )}
            {displayCount >= filteredDishes.length && filteredDishes.length > PAGE_SIZE && (
              <p className="text-center text-xs text-gray-400 pb-4">已全部加载完毕</p>
            )}
          </>
        )}
      </div>

      {/* ===== Cart Drawer ===== */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false);
          navigate('/customer/order');
        }}
      />

      {/* ===== Custom Keyframes (injected via style tag for simplicity) ===== */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
