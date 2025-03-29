export {};

declare global {
  namespace PrismaJson {
    type DetailsRestaurantType = {
      title: string;
      items: { value: string; isIncluded: boolean }[];
    }[];
  }
}