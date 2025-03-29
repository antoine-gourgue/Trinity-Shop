"use client";

import { ReactNode } from "react";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

export default function PayPalProvider({ children }: { children: ReactNode }) {
    return (
        <PayPalScriptProvider options={{
            clientId: "Aa2D9hyreQJfG6GUnTWVXepEiRA77VUd_9oPBym_xNaWTp10bkL1lvU11qFQk_L62bzrhlteXOt7TSdp",
            currency: "EUR" }}>
            {children}
        </PayPalScriptProvider>
    );
}
