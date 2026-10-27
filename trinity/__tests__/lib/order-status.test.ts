import { ORDER_STEPS, nextOrderStatus } from "@/lib/order-status";

describe("nextOrderStatus", () => {
    it("moves an order through every step, in order", () => {
        expect(ORDER_STEPS.slice(0, -1).map(nextOrderStatus)).toEqual(ORDER_STEPS.slice(1));
    });

    it("stops once the order is finished or cancelled", () => {
        expect(nextOrderStatus("completed")).toBeNull();
        expect(nextOrderStatus("cancelled")).toBeNull();
    });
});
