import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("ComViewers storefront main", () => {
  it("renders the exact primary Figma sections and eight recommended products", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /RCPC 렌탈 마켓 플랫폼 전문기업.*ComViewers/, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "추천 RCPC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "복잡한 설치 없이 구매 즉시 이용" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "보안과 안정성을 고려한 RCPC 이용 환경" })).toBeInTheDocument();
    expect(screen.getByText("칠곡서버실 임시점검 안내 [4월 8일 수요일 08시 ~ 14시]")).toBeInTheDocument();
    expect(screen.getAllByTestId("product-card")).toHaveLength(8);
    expect(screen.getAllByText("WJ89023")).toHaveLength(8);
  });

  it("updates the active product category without adding non-Figma copy", () => {
    render(<App />);
    const gameFilter = screen.getByRole("button", { name: "게임용" });
    fireEvent.click(gameFilter);
    expect(gameFilter).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("게임 환경 추천")).not.toBeInTheDocument();
  });

  it("opens and closes the mobile navigation", () => {
    render(<App />);
    const menuButton = screen.getByRole("button", { name: "메뉴 열기" });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("primary-navigation")).toHaveClass("is-open");
    fireEvent.click(screen.getByRole("link", { name: "RCPC상품" }));
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
  });
});
