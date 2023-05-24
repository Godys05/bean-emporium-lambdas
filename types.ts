export type Cart = {
  productId: string;
  quantity: number;
}[];

export type User = {
  id: string;
  name: string;
  email: string;
  cart: Cart;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  minPerPurchase: number;
  variants: {
    id: string;
    name: string;
    stock: number;
    priceRanges: {
      minQuantity: number;
      maxQuantity: number;
      price: number;
    }[];
  }[];
};
