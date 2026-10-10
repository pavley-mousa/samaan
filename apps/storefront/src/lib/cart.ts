export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  unit: 'meter' | 'piece';
  unitPrice: number;
  quantity: number;
  variantId?: string;
  variantLabel?: string;
  imageUrl?: string;
};

const CART_KEY = 'samaan_cart_v1';

export function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is CartItem => Boolean(
      item && typeof item.productId === 'string' && typeof item.slug === 'string' &&
      typeof item.name === 'string' && (item.unit === 'meter' || item.unit === 'piece') &&
      Number.isFinite(Number(item.unitPrice)) && Number(item.quantity) > 0,
    )).map((item) => ({ ...item, unitPrice: Number(item.unitPrice), quantity: Number(item.quantity) }));
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addCartItem(item: CartItem): CartItem[] {
  const cart = readCart();
  const existing = cart.find((line) => line.productId === item.productId && line.variantId === item.variantId);
  const next = existing
    ? cart.map((line) => line === existing ? { ...line, quantity: line.quantity + item.quantity } : line)
    : [...cart, item];
  writeCart(next);
  return next;
}
