import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

describe("Ui components", () => {
  it("Button -> render", () => {
    render(<Button>Click</Button>);

    const button = screen.getByText("Click");

    expect(button).toBeInTheDocument();
  });
});
