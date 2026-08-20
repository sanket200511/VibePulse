import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeleteProjectModal } from "./DeleteProjectModal";
import type { Project } from "./types";

const mockProject: Project = {
  id: "proj-safe-delete",
  display_name: "Test-Safe-Project",
  root_path: "D:/Projects/Test-Safe-Project",
  created_at: "2026-08-01T00:00:00Z",
  updated_at: "2026-08-01T00:00:00Z",
};

describe("DeleteProjectModal", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("does not render when isOpen is false", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <DeleteProjectModal project={mockProject} isOpen={false} onClose={vi.fn()} />
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Remove from VibePulse")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true and requires project name to enable delete button", () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <DeleteProjectModal project={mockProject} isOpen={true} onClose={onClose} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Remove from VibePulse")).toBeInTheDocument();
    expect(screen.getByText(/Your physical project directory and source files will/i)).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: "Remove Project" });
    expect(deleteBtn).toBeDisabled();

    // Type incorrect name
    const input = screen.getByPlaceholderText("Test-Safe-Project");
    fireEvent.change(input, { target: { value: "Wrong-Name" } });
    expect(deleteBtn).toBeDisabled();

    // Type exact project name
    fireEvent.change(input, { target: { value: "Test-Safe-Project" } });
    expect(deleteBtn).not.toBeDisabled();
  });
});
