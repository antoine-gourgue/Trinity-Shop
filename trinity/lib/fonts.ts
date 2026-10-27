import { Barlow_Condensed } from "next/font/google";

// Police condensée des opérations commerciales (bannières, prix du prospectus), comme sur un
// prospectus papier ; le reste du site garde Mulish
export const displayFont = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
