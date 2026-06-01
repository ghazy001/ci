import { render, screen } from "@testing-library/react";

function SmokeComponent() {
  return <h1>Frontend test works</h1>;
}

describe("SmokeComponent", () => {
  it("renders the heading", () => {
    render(<SmokeComponent />);

    expect(
      screen.getByRole("heading", { name: /frontend test works/i }),
    ).toBeInTheDocument();
  });
});