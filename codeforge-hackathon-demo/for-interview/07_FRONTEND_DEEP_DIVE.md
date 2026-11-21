# ⚛️ 07. Frontend Architecture Deep Dive (React 19, Vite, Tailwind CSS)

This document explains the React 19 single-page application structure, TanStack Query data synchronization, SVG canvas math, and Tailwind CSS design tokens in `apps/dashboard`.

---

## 🎨 1. Design Tokens & Aesthetic System

VibePulse features a modern **sleek dark-mode glassmorphism theme**:

- **Background**: `#030712` (Gray-950) with subtle slate dot-grid background patterns.
- **Card Containers**: `bg-gray-900/60 backdrop-blur-md border border-gray-800`.
- **Primary Accent**: `#6366f1` / `#818cf8` (Indigo).
- **Security Alert Accent**: `#f43f5e` (Rose-500) with subtle pulse animation.
- **Incident Accent**: `#f59e0b` (Amber-500).
- **Observed Provenance**: `#10b981` (Emerald-500).

---

## 🕸️ 2. SVG Canvas Engine & Gestures (`CorrelationGraphCanvas.tsx`)

The custom SVG canvas renders hardware-accelerated nodes and edges without third-party heavy canvas libraries:

```typescript
// Cursor-Centered Zoom Math
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const rect = containerRef.current.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  const zoomDelta = e.deltaY < 0 ? 1.09 : 0.91;
  setZoom((prevZoom) => {
    const nextZoom = Math.min(3.5, Math.max(0.2, prevZoom * zoomDelta));
    setPan((prevPan) => ({
      x: cursorX - (cursorX - prevPan.x) * (nextZoom / prevZoom),
      y: cursorY - (cursorY - prevPan.y) * (nextZoom / prevZoom),
    }));
    return nextZoom;
  });
};
```

---

## 📡 3. State Management & Server Synchronization

VibePulse uses **TanStack Query (React Query v5)** for optimistic UI updates, background caching, and automatic refetching:

```typescript
export function useKnowledgeGraph(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["knowledge-graph", projectId],
    queryFn: () => fetchKnowledgeGraph(projectId!),
    enabled: Boolean(projectId),
    staleTime: 10_000,
  });

  return {
    graph: query.data,
    isLoading: query.isLoading,
    refreshGraph: () => queryClient.invalidateQueries({ queryKey: ["knowledge-graph", projectId] }),
  };
}
```
