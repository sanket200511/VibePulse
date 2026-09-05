import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  FileCode,
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Layers,
  Cpu,
  FolderTree,
  Activity,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  Plus,
  User,
  Maximize,
  Minimize,
  Compass,
  Hand,
  Filter,
} from "lucide-react";
import type {
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  KnowledgeGraphNodeType,
  GraphTraversalStep,
} from "./types";

interface CorrelationGraphCanvasProps {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
  selectedNode: KnowledgeGraphNode | null;
  selectedEdge: KnowledgeGraphEdge | null;
  onSelectNode: (node: KnowledgeGraphNode | null) => void;
  onSelectEdge: (edge: KnowledgeGraphEdge | null) => void;
  focusNodeId: string | null;
  focusDepth: number;
  onDepthChange?: (depth: number) => void;
  traversalSteps?: GraphTraversalStep[];
  traversalMode?: "ROOT_CAUSE" | "IMPACT" | null | undefined;
}

interface NodePosition {
  x: number;
  y: number;
}

export type NodeCategory = "all" | "context" | "code" | "findings" | "impact";

export function getNodeFilterCategory(
  type: KnowledgeGraphNodeType,
): "context" | "code" | "findings" | "impact" {
  switch (type) {
    case "Subsystem":
    case "Technology":
    case "Framework":
      return "context";
    case "File":
    case "DevelopmentEvent":
      return "code";
    case "SecurityFinding":
    case "RootCause":
      return "findings";
    case "Incident":
    case "HealthDimension":
    case "Prediction":
    case "Resolution":
    case "Project":
    default:
      return "impact";
  }
}

export function CorrelationGraphCanvas({
  nodes,
  edges,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
  focusNodeId,
  focusDepth,
  onDepthChange,
  traversalSteps = [],
  traversalMode = null,
}: CorrelationGraphCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<NodeCategory>("all");

  // Visual theme matching traversal mode
  const traversalTheme = useMemo(() => {
    if (traversalMode === "ROOT_CAUSE") {
      return {
        color: "#f43f5e",
        badgeBg: "bg-rose-950/90",
        badgeBorder: "border-rose-500/50",
        badgeText: "text-rose-200",
        pingBg: "bg-rose-400",
        markerId: "url(#arrow-traversal-rc)",
      };
    }
    return {
      color: "#38bdf8",
      badgeBg: "bg-indigo-950/90",
      badgeBorder: "border-indigo-500/50",
      badgeText: "text-indigo-200",
      pingBg: "bg-indigo-400",
      markerId: "url(#arrow-traversal-impact)",
    };
  }, [traversalMode]);

  // Multi-touch pinch zoom state
  const touchStateRef = useRef<{
    initialDistance: number | null;
    initialZoom: number;
    initialPan: { x: number; y: number };
    startCenter: { x: number; y: number } | null;
  }>({
    initialDistance: null,
    initialZoom: 1,
    initialPan: { x: 0, y: 0 },
    startCenter: null,
  });

  // ── 1. ACTIVE ANCHOR DETERMINATION ─────────────────────────────────────────
  const activeAnchorId = useMemo(() => {
    if (selectedNode && nodes.some((n) => n.node_id === selectedNode.node_id)) {
      return selectedNode.node_id;
    }
    if (focusNodeId && nodes.some((n) => n.node_id === focusNodeId)) {
      return focusNodeId;
    }
    const priorityNode =
      nodes.find((n) => n.node_type === "SecurityFinding") ||
      nodes.find((n) => n.node_type === "Incident") ||
      nodes.find((n) => n.node_type === "File") ||
      nodes[0];
    return priorityNode?.node_id || null;
  }, [selectedNode, focusNodeId, nodes]);

  // ── 2. PROGRESSIVE NEIGHBORHOOD ISOLATION ACCORDING TO DEPTH ───────────────
  const visibleNeighborhoodIds = useMemo(() => {
    if (!activeAnchorId || nodes.length === 0) return new Set<string>();

    // If depth >= 4 ("All"), display all nodes in current mode
    if (focusDepth >= 4) {
      return new Set(nodes.map((n) => n.node_id));
    }

    const reached = new Set<string>([activeAnchorId]);
    let frontier = new Set<string>([activeAnchorId]);

    for (let d = 0; d < focusDepth; d++) {
      const nextFrontier = new Set<string>();
      edges.forEach((e) => {
        if (frontier.has(e.source_node_id) && !reached.has(e.target_node_id)) {
          reached.add(e.target_node_id);
          nextFrontier.add(e.target_node_id);
        }
        if (frontier.has(e.target_node_id) && !reached.has(e.source_node_id)) {
          reached.add(e.source_node_id);
          nextFrontier.add(e.source_node_id);
        }
      });
      frontier = nextFrontier;
    }

    traversalSteps.forEach((s) => reached.add(s.node_id));

    return reached;
  }, [nodes, edges, activeAnchorId, focusDepth, traversalSteps]);

  // Counts for each category in current neighborhood
  const categoryCounts = useMemo(() => {
    const counts = { all: 0, context: 0, code: 0, findings: 0, impact: 0 };
    nodes.forEach((n) => {
      if (visibleNeighborhoodIds.has(n.node_id)) {
        counts.all++;
        const cat = getNodeFilterCategory(n.node_type);
        counts[cat]++;
      }
    });
    return counts;
  }, [nodes, visibleNeighborhoodIds]);

  const visibleNodes = useMemo(() => {
    let list = nodes.filter((n) => visibleNeighborhoodIds.has(n.node_id));
    if (activeCategoryFilter !== "all") {
      list = list.filter(
        (n) =>
          getNodeFilterCategory(n.node_type) === activeCategoryFilter ||
          n.node_id === activeAnchorId ||
          traversalSteps.some((s) => s.node_id === n.node_id),
      );
    }
    return list;
  }, [nodes, visibleNeighborhoodIds, activeCategoryFilter, activeAnchorId, traversalSteps]);

  const visibleEdges = useMemo(() => {
    return edges.filter(
      (e) =>
        visibleNeighborhoodIds.has(e.source_node_id) &&
        visibleNeighborhoodIds.has(e.target_node_id),
    );
  }, [edges, visibleNeighborhoodIds]);

  // ── 3. BFS MULTI-HOP CAUSAL-RADIAL LAYOUT CALCULATION ─────────────────────
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({});

  const calculateLayout = useCallback(() => {
    if (!visibleNodes.length || !activeAnchorId) return;

    const positions: Record<string, NodePosition> = {};
    positions[activeAnchorId] = { x: 0, y: 0 };

    // BFS distance and direction
    const hopDistances: Record<string, number> = { [activeAnchorId]: 0 };
    const nodeCategory: Record<string, "upstream" | "downstream" | "context"> = {
      [activeAnchorId]: "downstream",
    };

    const queue: string[] = [activeAnchorId];
    const visited = new Set<string>([activeAnchorId]);

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const currDist = hopDistances[currId] || 0;

      visibleEdges.forEach((edge) => {
        let neighborId: string | null = null;
        let isUpstreamFromCurr = false;

        if (edge.target_node_id === currId) {
          neighborId = edge.source_node_id;
          isUpstreamFromCurr = true;
        } else if (edge.source_node_id === currId) {
          neighborId = edge.target_node_id;
          isUpstreamFromCurr = false;
        }

        if (neighborId && !visited.has(neighborId)) {
          visited.add(neighborId);
          hopDistances[neighborId] = currDist + 1;

          const neighborNode = visibleNodes.find((n) => n.node_id === neighborId);
          if (
            neighborNode?.node_type === "Subsystem" ||
            neighborNode?.node_type === "Technology" ||
            neighborNode?.node_type === "Framework"
          ) {
            nodeCategory[neighborId] = "context";
          } else if (currId === activeAnchorId) {
            nodeCategory[neighborId] = isUpstreamFromCurr ? "upstream" : "downstream";
          } else {
            nodeCategory[neighborId] =
              nodeCategory[currId] || (isUpstreamFromCurr ? "upstream" : "downstream");
          }

          queue.push(neighborId);
        }
      });
    }

    // Group nodes by (category, hopDistance)
    const columns: Record<string, KnowledgeGraphNode[]> = {};

    visibleNodes.forEach((node) => {
      if (node.node_id === activeAnchorId) return;
      const dist = Math.min(3, hopDistances[node.node_id] || 1);
      const cat =
        node.node_type === "Subsystem" ||
        node.node_type === "Technology" ||
        node.node_type === "Framework"
          ? "context"
          : nodeCategory[node.node_id] ||
            (["DevelopmentEvent", "File", "SecurityFinding", "RootCause"].includes(node.node_type)
              ? "upstream"
              : "downstream");

      const colKey = cat === "context" ? "context" : `${cat}_${dist}`;
      if (!columns[colKey]) columns[colKey] = [];
      columns[colKey].push(node);
    });

    // Place nodes in each column with symmetric Y distribution
    const ySpacing = 82;

    Object.entries(columns).forEach(([colKey, colNodes]) => {
      if (colKey === "context") {
        colNodes.forEach((node, idx) => {
          const isTop = idx % 2 === 0;
          const x = Math.floor(idx / 2) * 160 - 40;
          const y = isTop ? -110 : 110;
          positions[node.node_id] = { x, y };
        });
      } else {
        const [cat, distStr] = colKey.split("_");
        const dist = parseInt(distStr || "1", 10);
        const xOffset = cat === "upstream" ? -dist * 220 : dist * 220;
        const startY = -((colNodes.length - 1) * ySpacing) / 2;

        colNodes.forEach((node, idx) => {
          positions[node.node_id] = {
            x: xOffset,
            y: startY + idx * ySpacing,
          };
        });
      }
    });

    setNodePositions(positions);
  }, [visibleNodes, visibleEdges, activeAnchorId]);

  useEffect(() => {
    calculateLayout();
  }, [calculateLayout]);

  // ── 4. DYNAMIC INTELLIGENT AUTO-FIT ───────────────────────────────────────
  const fitVisibleGraph = useCallback(() => {
    if (!containerRef.current || Object.keys(nodePositions).length === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 540;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    Object.values(nodePositions).forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    if (minX === Infinity) return;

    const paddingX = 110;
    const paddingY = 85;
    const bboxW = Math.max(320, maxX - minX + paddingX * 2);
    const bboxH = Math.max(220, maxY - minY + paddingY * 2);

    const scaleX = width / bboxW;
    const scaleY = height / bboxH;
    const optimalScale = Math.min(1.4, Math.max(0.65, Math.min(scaleX, scaleY) * 0.88));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    setZoom(optimalScale);
    setPan({
      x: width / 2 - midX * optimalScale,
      y: height / 2 - midY * optimalScale,
    });
  }, [nodePositions]);

  useEffect(() => {
    fitVisibleGraph();
  }, [nodePositions, fitVisibleGraph]);

  const centerOnNode = useCallback(
    (nodeId: string) => {
      const pos = nodePositions[nodeId];
      if (!pos || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 540;
      setPan({
        x: width / 2 - pos.x * zoom,
        y: height / 2 - pos.y * zoom,
      });
    },
    [nodePositions, zoom],
  );

  // ── 5. CURSOR-CENTERED MOUSE WHEEL & PINCH-TO-ZOOM GESTURES ───────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > Math.abs(e.deltaX) * 2) {
        const zoomDelta = e.deltaY < 0 ? 1.09 : 0.91;
        setZoom((prevZoom) => {
          const nextZoom = Math.min(3.5, Math.max(0.2, prevZoom * zoomDelta));
          setPan((prevPan) => ({
            x: cursorX - (cursorX - prevPan.x) * (nextZoom / prevZoom),
            y: cursorY - (cursorY - prevPan.y) * (nextZoom / prevZoom),
          }));
          return nextZoom;
        });
      } else {
        setPan((prevPan) => ({
          x: prevPan.x - e.deltaX * 1.2,
          y: prevPan.y - e.deltaY * 1.2,
        }));
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // ── 6. FULLSCREEN MODE TOGGLE & KEYBOARD SHORTCUTS ────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!wrapperRef.current) return;

    if (!document.fullscreenElement && !isFullscreen) {
      if (wrapperRef.current.requestFullscreen) {
        wrapperRef.current
          .requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
            setTimeout(fitVisibleGraph, 80);
          })
          .catch(() => {
            setIsFullscreen((prev) => !prev);
            setTimeout(fitVisibleGraph, 80);
          });
      } else {
        setIsFullscreen((prev) => !prev);
        setTimeout(fitVisibleGraph, 80);
      }
    } else {
      if (document.exitFullscreen && document.fullscreenElement) {
        document
          .exitFullscreen()
          .then(() => {
            setIsFullscreen(false);
            setTimeout(fitVisibleGraph, 80);
          })
          .catch(() => {
            setIsFullscreen(false);
            setTimeout(fitVisibleGraph, 80);
          });
      } else {
        setIsFullscreen(false);
        setTimeout(fitVisibleGraph, 80);
      }
    }
  }, [isFullscreen, fitVisibleGraph]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setTimeout(fitVisibleGraph, 100);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === " " && !isSpacePressed) {
        setIsSpacePressed(true);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "0") {
        e.preventDefault();
        fitVisibleGraph();
      } else if ((e.key === "c" || e.key === "C") && selectedNode) {
        e.preventDefault();
        centerOnNode(selectedNode.node_id);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((z) => Math.min(3.0, z * 1.15));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((z) => Math.max(0.3, z * 0.85));
      } else if (e.key === "ArrowLeft") {
        setPan((p) => ({ ...p, x: p.x + 60 }));
      } else if (e.key === "ArrowRight") {
        setPan((p) => ({ ...p, x: p.x - 60 }));
      } else if (e.key === "ArrowUp") {
        setPan((p) => ({ ...p, y: p.y + 60 }));
      } else if (e.key === "ArrowDown") {
        setPan((p) => ({ ...p, y: p.y - 60 }));
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
          setTimeout(fitVisibleGraph, 100);
        } else if (selectedNode || selectedEdge) {
          onSelectNode(null);
          onSelectEdge(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setIsSpacePressed(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    toggleFullscreen,
    isFullscreen,
    fitVisibleGraph,
    centerOnNode,
    selectedNode,
    selectedEdge,
    onSelectNode,
    onSelectEdge,
    isSpacePressed,
  ]);

  // ── 7. TOUCH GESTURES ─────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (!touch) return;
      setIsPanning(true);
      setStartPan({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      touchStateRef.current.initialDistance = null;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (!t1 || !t2) return;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStateRef.current.initialDistance = dist;
      touchStateRef.current.initialZoom = zoom;
      touchStateRef.current.initialPan = { ...pan };
      touchStateRef.current.startCenter = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      if (!touch) return;
      setPan({ x: touch.clientX - startPan.x, y: touch.clientY - startPan.y });
    } else if (e.touches.length === 2 && touchStateRef.current.initialDistance) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      if (!t1 || !t2) return;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scaleFactor = dist / touchStateRef.current.initialDistance;
      const newZoom = Math.min(3.5, Math.max(0.3, touchStateRef.current.initialZoom * scaleFactor));

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !touchStateRef.current.startCenter) return;

      const centerPointX = touchStateRef.current.startCenter.x - rect.left;
      const centerPointY = touchStateRef.current.startCenter.y - rect.top;

      setZoom(newZoom);
      setPan({
        x: centerPointX - (centerPointX - touchStateRef.current.initialPan.x) * (newZoom / touchStateRef.current.initialZoom),
        y: centerPointY - (centerPointY - touchStateRef.current.initialPan.y) * (newZoom / touchStateRef.current.initialZoom),
      });
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchStateRef.current.initialDistance = null;
  };

  // Traversal Mapping
  const traversalNodeMap = useMemo(() => {
    const map = new Map<string, number>();
    traversalSteps.forEach((s) => {
      map.set(s.node_id, s.step_index);
    });
    return map;
  }, [traversalSteps]);

  // Pan & Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || isSpacePressed || !draggingNodeId) {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x, y },
      }));
      return;
    }
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const getNodeColor = (type: KnowledgeGraphNodeType) => {
    switch (type) {
      case "Project":
        return "#818cf8";
      case "Subsystem":
        return "#6366f1";
      case "File":
        return "#06b6d4";
      case "DevelopmentEvent":
        return "#38bdf8";
      case "SecurityFinding":
        return "#f43f5e";
      case "RootCause":
        return "#f97316";
      case "Incident":
        return "#f59e0b";
      case "Resolution":
        return "#10b981";
      case "HealthDimension":
        return "#a855f7";
      case "Prediction":
        return "#c084fc";
      default:
        return "#94a3b8";
    }
  };

  const getNodeIcon = (type: KnowledgeGraphNodeType) => {
    switch (type) {
      case "File":
        return <FileCode className="h-3.5 w-3.5 text-cyan-400" />;
      case "DevelopmentEvent":
        return <Activity className="h-3.5 w-3.5 text-sky-400" />;
      case "SecurityFinding":
        return <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />;
      case "Incident":
        return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
      case "RootCause":
        return <Crosshair className="h-3.5 w-3.5 text-orange-400" />;
      case "Prediction":
        return <Sparkles className="h-3.5 w-3.5 text-purple-400" />;
      case "Resolution":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "Subsystem":
        return <Layers className="h-3.5 w-3.5 text-indigo-400" />;
      case "Technology":
        return <Cpu className="h-3.5 w-3.5 text-teal-400" />;
      case "Actor":
        return <User className="h-3.5 w-3.5 text-violet-400" />;
      default:
        return <FolderTree className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-gray-950 transition-all duration-200"
          : "relative h-[560px] w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-950 shadow-2xl backdrop-blur-md"
      }
    >
      {/* ── TOP OVERLAY STRIP ──────────────────────────────────────────────── */}
      <div className="absolute left-4 top-4 z-20 flex flex-wrap items-center gap-2">
        {/* Zoom, Center, Fit & Fullscreen Controls */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-800 bg-gray-900/90 p-1 backdrop-blur-md shadow-lg">
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
            title="Zoom In (+ or Scroll Up)"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            title="Zoom Out (- or Scroll Down)"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={fitVisibleGraph}
            title="Fit Graph to Screen (0 or Double-Click Canvas)"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {selectedNode && (
            <button
              onClick={() => centerOnNode(selectedNode.node_id)}
              title="Center on Selected Node (C)"
              className="rounded-lg p-1.5 text-indigo-400 hover:bg-indigo-950 hover:text-indigo-200 transition"
            >
              <Compass className="h-4 w-4" />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (Esc or F)" : "Enter Fullscreen Mode (F)"}
            className={`rounded-lg p-1.5 transition ${
              isFullscreen
                ? "bg-indigo-600/30 text-indigo-400 hover:bg-indigo-600/50 hover:text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>

          <div className="border-l border-gray-800 px-2 text-[10px] font-mono text-gray-400">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        {/* Scope Pill */}
        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900/90 px-3 py-1.5 text-xs text-gray-300 backdrop-blur-md shadow-lg font-mono">
          <span className="font-semibold text-gray-400">Neighborhood:</span>
          <span className="font-bold text-indigo-400">
            {visibleNodes.length} of {nodes.length} entities
          </span>
          {focusDepth < 4 && onDepthChange && (
            <button
              onClick={() => onDepthChange(focusDepth + 1)}
              className="inline-flex items-center gap-1 rounded bg-indigo-600/80 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-indigo-500 transition"
            >
              <Plus className="h-3 w-3" />
              Expand
            </button>
          )}
        </div>

        {/* Declutter / Category Filter Chips */}
        <div className="flex items-center gap-1 rounded-xl border border-gray-800 bg-gray-900/90 p-1 backdrop-blur-md shadow-lg text-[11px] font-mono">
          <div className="flex items-center gap-1 px-1.5 text-gray-500 font-semibold">
            <Filter className="h-3 w-3" />
            <span className="hidden sm:inline">Layer:</span>
          </div>
          {(
            [
              { id: "all", label: "All", count: categoryCounts.all },
              { id: "findings", label: "Security", count: categoryCounts.findings },
              { id: "impact", label: "Impact", count: categoryCounts.impact },
              { id: "code", label: "Code", count: categoryCounts.code },
              { id: "context", label: "Arch", count: categoryCounts.context },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryFilter(cat.id)}
              className={`rounded-lg px-2 py-1 transition flex items-center gap-1 ${
                activeCategoryFilter === cat.id
                  ? "bg-indigo-600/80 text-white font-semibold shadow"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[9px] rounded-full px-1 py-0.2 ${
                  activeCategoryFilter === cat.id
                    ? "bg-indigo-800 text-indigo-100"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Traversal Mode Active Banner */}
      {traversalMode && (
        <div
          className={`absolute right-4 top-4 z-20 flex items-center gap-2 rounded-xl border ${traversalTheme.badgeBorder} ${traversalTheme.badgeBg} px-3.5 py-1.5 backdrop-blur-md shadow-lg`}
        >
          <div className={`h-2 w-2 animate-ping rounded-full ${traversalTheme.pingBg}`} />
          <span className={`text-xs font-semibold ${traversalTheme.badgeText} font-mono`}>
            {traversalMode === "ROOT_CAUSE" ? "Root Cause Causal Walk" : "Impact Downstream Walk"} (
            {traversalSteps.length} steps)
          </span>
        </div>
      )}

      {/* Gesture / Navigation Tip in Bottom Left */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden md:flex items-center gap-2 rounded-lg border border-gray-800/80 bg-gray-950/80 px-3 py-1 text-[10px] font-mono text-gray-400 backdrop-blur-md shadow">
        <Hand className="h-3 w-3 text-indigo-400" />
        <span>Scroll to Zoom • Drag or Space+Drag to Pan • Double-click to Fit</span>
      </div>

      {/* Fullscreen Toast Prompt */}
      {isFullscreen && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-gray-800 bg-gray-900/80 px-4 py-1.5 text-xs font-mono text-gray-400 backdrop-blur-md shadow-xl">
          Press <span className="font-bold text-indigo-300">Esc</span> or{" "}
          <span className="font-bold text-indigo-300">F</span> to exit Fullscreen Mode
        </div>
      )}

      {/* ── INTERACTIVE CANVAS ────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={(e) => {
          if (
            e.target === containerRef.current ||
            (e.target as HTMLElement).tagName === "svg" ||
            (e.target as HTMLElement).tagName === "rect"
          ) {
            fitVisibleGraph();
          }
        }}
        className={`h-full w-full select-none ${
          isSpacePressed || isPanning ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <svg className="h-full w-full">
          <defs>
            <marker
              id="arrow-subtle"
              viewBox="0 0 10 10"
              refX="16"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 2 L 7 5 L 0 8 z" fill="#475569" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="16"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#818cf8" />
            </marker>
            <marker
              id="arrow-traversal-impact"
              viewBox="0 0 10 10"
              refX="16"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
            <marker
              id="arrow-traversal-rc"
              viewBox="0 0 10 10"
              refX="16"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f43f5e" />
            </marker>
            <filter id="anchor-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#818cf8" floodOpacity="0.7" />
            </filter>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Dot Grid */}
            <pattern id="dot-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#1e293b" />
            </pattern>
            <rect x="-4000" y="-4000" width="8000" height="8000" fill="url(#dot-grid)" />

            {/* EDGES */}
            {visibleEdges.map((edge) => {
              const srcPos = nodePositions[edge.source_node_id];
              const tgtPos = nodePositions[edge.target_node_id];
              if (!srcPos || !tgtPos) return null;

              const isEdgeSelected = selectedEdge?.relationship_id === edge.relationship_id;
              const isSrcSelected = selectedNode?.node_id === edge.source_node_id;
              const isTgtSelected = selectedNode?.node_id === edge.target_node_id;
              const isHovered = hoveredEdgeId === edge.relationship_id;
              const isHighlighted = isEdgeSelected || isSrcSelected || isTgtSelected || isHovered;

              const srcStep = traversalNodeMap.get(edge.source_node_id);
              const tgtStep = traversalNodeMap.get(edge.target_node_id);
              const isTraversalEdge =
                srcStep !== undefined && tgtStep !== undefined && Math.abs(srcStep - tgtStep) === 1;

              const isObserved = edge.provenance === "OBSERVED";

              const dx = tgtPos.x - srcPos.x;
              const cp1x = srcPos.x + Math.max(40, dx * 0.45);
              const cp1y = srcPos.y;
              const cp2x = tgtPos.x - Math.max(40, dx * 0.45);
              const cp2y = tgtPos.y;
              const pathD = `M ${srcPos.x} ${srcPos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tgtPos.x} ${tgtPos.y}`;

              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;

              return (
                <g
                  key={edge.relationship_id}
                  onMouseEnter={() => setHoveredEdgeId(edge.relationship_id)}
                  onMouseLeave={() => setHoveredEdgeId(null)}
                >
                  <path
                    d={pathD}
                    fill="none"
                    stroke={
                      isTraversalEdge
                        ? traversalTheme.color
                        : isHighlighted
                          ? "#818cf8"
                          : isObserved
                            ? "#334155"
                            : "#1e293b"
                    }
                    strokeWidth={isTraversalEdge ? 2.5 : isHighlighted ? 2 : 1.2}
                    strokeDasharray={isObserved ? undefined : "4 3"}
                    markerEnd={
                      isTraversalEdge
                        ? traversalTheme.markerId
                        : isHighlighted
                          ? "url(#arrow-active)"
                          : "url(#arrow-subtle)"
                    }
                    className="cursor-pointer transition-colors duration-150"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEdge(edge);
                      onSelectNode(null);
                    }}
                  />

                  {(isHighlighted || isTraversalEdge) && (
                    <g
                      transform={`translate(${midX}, ${midY})`}
                      className="cursor-pointer pointer-events-none"
                    >
                      <rect
                        x="-45"
                        y="-9"
                        width="90"
                        height="18"
                        rx="9"
                        fill="#090d16"
                        stroke={isTraversalEdge ? traversalTheme.color : "#818cf8"}
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fontSize="8.5"
                        fill="#f8fafc"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {edge.relationship_type}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* NODES */}
            {visibleNodes.map((node) => {
              const pos = nodePositions[node.node_id];
              if (!pos) return null;

              const isNodeSelected = selectedNode?.node_id === node.node_id;
              const isHovered = hoveredNodeId === node.node_id;
              const nodeColor = getNodeColor(node.node_type);

              const traversalStep = traversalNodeMap.get(node.node_id);
              const isTraversalNode = traversalStep !== undefined;

              const isDimmed =
                selectedNode &&
                !isNodeSelected &&
                !isTraversalNode &&
                !visibleEdges.some(
                  (e) =>
                    (e.source_node_id === selectedNode.node_id && e.target_node_id === node.node_id) ||
                    (e.target_node_id === selectedNode.node_id && e.source_node_id === node.node_id),
                );

              const labelText = node.label.length > 17 ? `${node.label.slice(0, 15)}…` : node.label;

              return (
                <g
                  key={node.node_id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer select-none"
                  onMouseEnter={() => setHoveredNodeId(node.node_id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingNodeId(node.node_id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectNode(node);
                    onSelectEdge(null);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    centerOnNode(node.node_id);
                  }}
                >
                  {(isNodeSelected || isTraversalNode) && (
                    <circle
                      r="22"
                      fill="none"
                      stroke={isTraversalNode ? traversalTheme.color : "#818cf8"}
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      filter="url(#anchor-glow)"
                    />
                  )}

                  <rect
                    x="-18"
                    y="-18"
                    width="36"
                    height="36"
                    rx="10"
                    fill={isDimmed ? "#090d16" : isNodeSelected ? "#1e1b4b" : "#0f172a"}
                    stroke={
                      isTraversalNode
                        ? traversalTheme.color
                        : isNodeSelected
                          ? "#818cf8"
                          : isHovered
                            ? "#ffffff"
                            : nodeColor
                    }
                    strokeWidth={isNodeSelected || isTraversalNode ? "2.5" : "1.5"}
                    opacity={isDimmed ? 0.35 : 1}
                  />

                  {isTraversalNode && (
                    <g transform="translate(13, -13)">
                      <circle r="7.5" fill={traversalTheme.color} />
                      <text
                        x="0"
                        y="2.5"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="bold"
                        fill="#0f172a"
                      >
                        {traversalStep + 1}
                      </text>
                    </g>
                  )}

                  <foreignObject x="-8" y="-8" width="16" height="16" className="pointer-events-none">
                    <div className="flex h-full w-full items-center justify-center">
                      {getNodeIcon(node.node_type)}
                    </div>
                  </foreignObject>

                  <g transform="translate(0, 26)">
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill={isDimmed ? "#475569" : isNodeSelected ? "#ffffff" : "#e2e8f0"}
                      fontWeight={isNodeSelected ? "700" : "500"}
                      fontFamily="monospace"
                      className="pointer-events-none"
                    >
                      {labelText}
                    </text>
                  </g>

                  <g transform="translate(0, 37)">
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      fontSize="7.5"
                      fill={
                        node.provenance === "OBSERVED"
                          ? "#10b981"
                          : node.provenance === "INFERRED"
                            ? "#c084fc"
                            : "#64748b"
                      }
                      fontWeight="600"
                      className="pointer-events-none"
                    >
                      [{node.provenance.slice(0, 3)}]
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
    </div>
  );
}
