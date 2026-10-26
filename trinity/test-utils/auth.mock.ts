// Remplace auth.ts dans Jest : next-auth est publié en module ES, que Jest ne charge pas
export const auth = jest.fn(async () => null);
export const signIn = jest.fn();
export const signOut = jest.fn();
export const handlers = {};
