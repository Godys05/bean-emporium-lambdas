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
