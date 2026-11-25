/**
 * Utility functions for Operator Flow No resolution and SVG orthogonal routing.
 */
import { CBSewingOutputRow } from "../../types/cbSewingOutput";

export interface OperatorFlowOperation {
  flowNo: string;
  autoSeq?: number;
  processName?: string;
  operatorKey: string;
  operatorName: string;
  nik: string;
  module: string;
  opIndex: number;
}

export interface OperatorFlowConnection {
  id: string;
  sourceKey: string;
  targetKey: string;
  sourceOperatorName: string;
  targetOperatorName: string;
  sourceFlowNo: string;
  targetFlowNo: string;
  sourceIndex: number;
  targetIndex: number;
  flowPairs: { sourceFlowNo: string; targetFlowNo: string }[];
  laneIndex?: number;
}

// 10 Static Base Colors for Flow 1 - 10
export const FLOW_BASE_COLORS = [
  // 1. Sky Blue
  {
    key: "sky",
    name: "Sky Blue",
    stroke: "#38bdf8",
    hover: "#7dd3fc",
    marker: "arrow-sky",
    badgeClass: "bg-sky-950/90 text-sky-300 border-sky-500/80",
  },
  // 2. Emerald Green
  {
    key: "emerald",
    name: "Emerald Green",
    stroke: "#22c55e",
    hover: "#86efac",
    marker: "arrow-emerald",
    badgeClass: "bg-emerald-950/90 text-emerald-300 border-emerald-500/80",
  },
  // 3. Amber Yellow
  {
    key: "amber",
    name: "Amber Yellow",
    stroke: "#f59e0b",
    hover: "#fde68a",
    marker: "arrow-amber",
    badgeClass: "bg-amber-950/90 text-amber-300 border-amber-500/80",
  },
  // 4. Orange Brown
  {
    key: "orange",
    name: "Orange Brown",
    stroke: "#ea580c",
    hover: "#fed7aa",
    marker: "arrow-orange",
    badgeClass: "bg-orange-950/90 text-orange-300 border-orange-600/80",
  },
  // 5. Purple
  {
    key: "purple",
    name: "Purple",
    stroke: "#a855f7",
    hover: "#d8b4fe",
    marker: "arrow-purple",
    badgeClass: "bg-purple-950/90 text-purple-300 border-purple-500/80",
  },
  // 6. Rose Red
  {
    key: "rose",
    name: "Rose Red",
    stroke: "#f43f5e",
    hover: "#fda4af",
    marker: "arrow-rose",
    badgeClass: "bg-rose-950/90 text-rose-300 border-rose-500/80",
  },
  // 7. Teal Cyan
  {
    key: "teal",
    name: "Teal Cyan",
    stroke: "#14b8a6",
    hover: "#5eead4",
    marker: "arrow-teal",
    badgeClass: "bg-teal-950/90 text-teal-300 border-teal-500/80",
  },
  // 8. Indigo Blue
  {
    key: "indigo",
    name: "Indigo Blue",
    stroke: "#6366f1",
    hover: "#a5b4fc",
    marker: "arrow-indigo",
    badgeClass: "bg-indigo-950/90 text-indigo-300 border-indigo-500/80",
  },
  // 9. Lime Green
  {
    key: "lime",
    name: "Lime",
    stroke: "#84cc16",
    hover: "#bef264",
    marker: "arrow-lime",
    badgeClass: "bg-lime-950/90 text-lime-300 border-lime-500/80",
  },
  // 10. Pink
  {
    key: "pink",
    name: "Pink",
    stroke: "#ec4899",
    hover: "#f472b6",
    marker: "arrow-pink",
    badgeClass: "bg-pink-950/90 text-pink-300 border-pink-500/80",
  },
];

export function getFlowColorIndex(flowNo: string): number {
  if (!flowNo) return 0;
  const clean = flowNo.trim().toUpperCase();
  const match = clean.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return (((num - 1) % 10) + 10) % 10;
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = clean.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 10;
}

export function getFlowStyle(flowNo: string) {
  const idx = getFlowColorIndex(flowNo);
  return FLOW_BASE_COLORS[idx];
}

/**
 * Natural comparison for Flow No (e.g., PFFA1, PFFA2, PFFA10, PFFA1.D, PFFA2.D).
 * Handles numbers naturally so PFFA2 comes before PFFA10.
 */
export function naturalCompareFlowNo(a: string, b: string): number {
  const cleanA = (a || "").trim().toUpperCase();
  const cleanB = (b || "").trim().toUpperCase();
  if (cleanA === cleanB) return 0;

  // Split string into numeric and non-numeric chunks
  const regex = /(\d+|\D+)/g;
  const partsA = cleanA.match(regex) || [];
  const partsB = cleanB.match(regex) || [];

  const len = Math.min(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const pA = partsA[i];
    const pB = partsB[i];

    const isNumA = /^\d+$/.test(pA);
    const isNumB = /^\d+$/.test(pB);

    if (isNumA && isNumB) {
      const numA = parseInt(pA, 10);
      const numB = parseInt(pB, 10);
      if (numA !== numB) return numA - numB;
    } else {
      const cmp = pA.localeCompare(pB);
      if (cmp !== 0) return cmp;
    }
  }
  return partsA.length - partsB.length;
}

/**
 * Extract the primary/first flow token from a flow string (e.g. "PFFA1, PFFA2" -> "PFFA1").
 */
export function getFirstFlowToken(flowStr: string | null | undefined): string {
  if (!flowStr) return "";
  const raw = flowStr.trim();
  const tokens = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return tokens.length > 0 ? tokens[0] : "";
}

/**
 * Extract base flow and cross-module source from flow string.
 * Example: "H1_PFFA1" -> { baseFlow: "H1", cleanBaseCode: "H1", crossSource: "PFFA1" }
 * Example: "MF26.D_PPFA6" -> { baseFlow: "MF26.D", cleanBaseCode: "MF26", crossSource: "PPFA6" }
 * Example: "PFFA1" -> { baseFlow: "PFFA1", cleanBaseCode: "PFFA1", crossSource: null }
 */
export function parseFlowParts(flowNo: string): {
  baseFlow: string;
  cleanBaseCode: string;
  crossSource: string | null;
  groupPrefix: string;
  stepNum: number | null;
} {
  if (!flowNo) return { baseFlow: "", cleanBaseCode: "", crossSource: null, groupPrefix: "", stepNum: null };
  const clean = flowNo.trim();
  const underscoreIdx = clean.lastIndexOf("_");
  let base = clean;
  let cross: string | null = null;
  if (underscoreIdx !== -1) {
    base = clean.substring(0, underscoreIdx).trim();
    cross = clean.substring(underscoreIdx + 1).trim() || null;
  }
  const cleanBaseCode = (base.split(".")[0] || "").toUpperCase();
  const match = cleanBaseCode.match(/^([A-Z]+)(\d+)?/i);
  const groupPrefix = match ? match[1].toUpperCase() : cleanBaseCode;
  const stepNum = match && match[2] ? parseInt(match[2], 10) : null;

  return {
    baseFlow: base || clean,
    cleanBaseCode,
    crossSource: cross,
    groupPrefix,
    stepNum,
  };
}

/**
 * Extract all clean base flow codes that an operator can legitimately provide.
 * Rule:
 * 1. Collect all flow tokens for this operator from primaryFlowNo, row.FLOW_NO, and row.TASKS.
 * 2. If all tokens belong to the same group prefix (or single token), ALL flows are valid provided flows.
 *    (e.g. HAMDANI doing H12_HPFA12 and H13 -> both H12 and H13 have prefix 'H' -> can provide H13!).
 * 3. If tokens belong to multiple different group prefixes (e.g. LSFA1 and H13),
 *    only the primary flow is allowed to be provided!
 */
export function getValidProvidedFlowCodes(
  row: CBSewingOutputRow | undefined,
  primaryFlowNo: string
): string[] {
  const tokens: string[] = [];
  if (primaryFlowNo && primaryFlowNo.trim()) {
    primaryFlowNo.split(",").forEach((t) => tokens.push(t.trim()));
  }
  if (row?.FLOW_NO && row.FLOW_NO.trim()) {
    row.FLOW_NO.split(",").forEach((t) => tokens.push(t.trim()));
  }
  if (row?.TASKS && row.TASKS.length > 0) {
    row.TASKS.forEach((task) => {
      if (task.FLOW_NO && task.FLOW_NO.trim()) {
        task.FLOW_NO.split(",").forEach((t) => tokens.push(t.trim()));
      }
    });
  }

  if (tokens.length === 0) return [];

  const parsedList = tokens.map((tok) => parseFlowParts(tok));
  const distinctPrefixes = new Set<string>();
  parsedList.forEach((p) => {
    if (p.groupPrefix) {
      distinctPrefixes.add(p.groupPrefix.toUpperCase());
    }
  });

  // Return all valid flow codes provided by this operator across all their tokens/tasks
  const validCodes = new Set<string>();
  parsedList.forEach((p) => {
    if (p.cleanBaseCode) {
      validCodes.add(p.cleanBaseCode.toUpperCase());
    }
  });

  return Array.from(validCodes);
}

/**
 * Strict validation of whether two operators have a valid flow correlation.
 * 1. Intra-group: Same groupPrefix (e.g. PPFA -> PPFA, BA -> BA, MF -> MF), and source step < target step.
 * 2. Cross-group: Target's cross-source token (after _) matches any valid provided flow code from source.
 */
export function hasFlowCorrelation(
  src: OperatorFlowOperation,
  tgt: OperatorFlowOperation,
  tgtRow?: CBSewingOutputRow,
  srcRow?: CBSewingOutputRow
): boolean {
  if (!src.flowNo || !tgt.flowNo) return false;
  if (src.operatorKey === tgt.operatorKey) return false;

  const srcParts = parseFlowParts(src.flowNo);
  const tgtParts = parseFlowParts(tgt.flowNo);

  // 1. Intra-group correlation: Same group prefix and forward step
  if (
    srcParts.groupPrefix &&
    tgtParts.groupPrefix &&
    srcParts.groupPrefix === tgtParts.groupPrefix
  ) {
    if (srcParts.stepNum !== null && tgtParts.stepNum !== null) {
      return srcParts.stepNum < tgtParts.stepNum;
    }
    return naturalCompareFlowNo(srcParts.baseFlow, tgtParts.baseFlow) < 0;
  }

  // 2. Cross-group correlation: Target explicitly references source's base code via underscore
  const validSrcCodes = getValidProvidedFlowCodes(srcRow, src.flowNo);
  const checkCrossMatch = (crossToken: string | null): boolean => {
    if (!crossToken) return false;
    const cleanCross = crossToken.split(".")[0].toUpperCase();
    return validSrcCodes.includes(cleanCross);
  };

  if (checkCrossMatch(tgtParts.crossSource)) {
    return true;
  }

  // Check target's full FLOW_NO string for cross reference
  if (tgtRow?.FLOW_NO && tgtRow.FLOW_NO.includes("_")) {
    const tokens = tgtRow.FLOW_NO.split(",").map((s) => s.trim());
    for (const tok of tokens) {
      const parts = parseFlowParts(tok);
      if (checkCrossMatch(parts.crossSource)) {
        return true;
      }
    }
  }

  // Check target's tasks for cross reference
  if (tgtRow?.TASKS && tgtRow.TASKS.length > 0) {
    for (const task of tgtRow.TASKS) {
      if (task.FLOW_NO && task.FLOW_NO.includes("_")) {
        const tokens = task.FLOW_NO.split(",").map((s) => s.trim());
        for (const tok of tokens) {
          const parts = parseFlowParts(tok);
          if (checkCrossMatch(parts.crossSource)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Resolve operator list into ordered Flow operations and distinct Operator-to-Operator connections.
 * 1. Inside each module, operators flow sequentially strictly within their group prefix.
 * 2. Cross-module connections are only formed when a flow contains an underscore (e.g. H1_PFFA1),
 *    drawing an arrow from the source flow (PFFA1) to the target flow (H1_PFFA1).
 */
export function resolveOperatorFlow(data: CBSewingOutputRow[]): {
  operations: OperatorFlowOperation[];
  connections: OperatorFlowConnection[];
} {
  const allOps: OperatorFlowOperation[] = [];
  const flowLookup = new Map<string, OperatorFlowOperation>();
  const nikLookup = new Map<string, OperatorFlowOperation[]>();

  // 1. Extract primary flow per operator and build lookups
  data.forEach((op, opIndex) => {
    const opKey = `${op.NIK}-${op.MODULE}`;
    const groupedOps = (op as any)._groupedOperators as CBSewingOutputRow[] | undefined;
    const isGrp = !!(groupedOps && groupedOps.length > 1);

    // Dynamic label for grouped operators
    const opName = isGrp
      ? groupedOps!.map((o) => o.E_NAME || o.NIK).join(" + ")
      : op.E_NAME || op.NIK;

    let primaryFlow = "";
    let primaryAutoSeq: number | undefined = undefined;
    let primaryProcessName = "";

    // If operator has tasks, take only the first task with a valid FLOW_NO
    if (op.TASKS && op.TASKS.length > 0) {
      const firstValidTask = op.TASKS.find((t) => t.FLOW_NO && t.FLOW_NO.trim());
      if (firstValidTask && firstValidTask.FLOW_NO) {
        primaryFlow = getFirstFlowToken(firstValidTask.FLOW_NO);
        primaryAutoSeq = firstValidTask.AUTO_SEQ ?? undefined;
        primaryProcessName = firstValidTask.PROCESS_NAME || "";
      }
    }

    // Fallback to top-level FLOW_NO if no primary flow from tasks
    if (!primaryFlow && op.FLOW_NO && op.FLOW_NO.trim()) {
      primaryFlow = getFirstFlowToken(op.FLOW_NO);
      primaryAutoSeq = op.AUTO_SEQ ?? undefined;
      primaryProcessName = op.PROCESS_NAME || "";
    }

    // Fallback to any grouped operator's FLOW_NO
    if (!primaryFlow && isGrp) {
      for (const g of groupedOps!) {
        if (g.FLOW_NO && g.FLOW_NO.trim()) {
          primaryFlow = getFirstFlowToken(g.FLOW_NO);
          primaryAutoSeq = g.AUTO_SEQ ?? undefined;
          primaryProcessName = g.PROCESS_NAME || "";
          break;
        }
      }
    }

    // Fallback to PROCESS_NO or PROCESS_NAME
    if (!primaryFlow) {
      primaryFlow = (op.PROCESS_NO || op.PROCESS_NAME || "").trim();
    }

    // Ultimate fallback if no flow string at all
    if (!primaryFlow) {
      primaryFlow = `OP_${op.NIK || opIndex}`;
    }

    const opItem: OperatorFlowOperation = {
      flowNo: primaryFlow,
      autoSeq: primaryAutoSeq,
      processName: primaryProcessName,
      operatorKey: opKey,
      operatorName: opName,
      nik: op.NIK,
      module: op.MODULE,
      opIndex,
    };

    allOps.push(opItem);

    // Register NIK lookup (all NIKs represented by this display row / group)
    const allNiks = new Set<string>();
    if (op.NIK) allNiks.add(op.NIK.trim().toUpperCase());
    if (Array.isArray(groupedOps)) {
      groupedOps.forEach((g) => {
        if (g.NIK) allNiks.add(g.NIK.trim().toUpperCase());
      });
    }
    allNiks.forEach((n) => {
      if (!nikLookup.has(n)) {
        nikLookup.set(n, []);
      }
      nikLookup.get(n)!.push(opItem);
    });

    // Register all valid provided flows for this operator (and all grouped operators) in flowLookup
    const registerFlowInLookup = (row: CBSewingOutputRow, flowStr: string) => {
      if (!flowStr) return;
      const validCodes = getValidProvidedFlowCodes(row, flowStr);
      validCodes.forEach((code) => {
        flowLookup.set(code.toUpperCase(), opItem);
      });
      const cleanTok = flowStr.trim().toUpperCase();
      flowLookup.set(cleanTok, opItem);
      const { baseFlow, cleanBaseCode } = parseFlowParts(cleanTok);
      if (baseFlow) flowLookup.set(baseFlow.toUpperCase(), opItem);
      if (cleanBaseCode) flowLookup.set(cleanBaseCode.toUpperCase(), opItem);
    };

    registerFlowInLookup(op, primaryFlow);
    if (Array.isArray(groupedOps)) {
      groupedOps.forEach((g) => {
        if (g.FLOW_NO) {
          registerFlowInLookup(g, getFirstFlowToken(g.FLOW_NO));
        }
      });
    }
  });

  const connectionMap = new Map<string, OperatorFlowConnection>();
  const outgoingTargetsPerOp = new Map<string, Set<string>>();

  const addConnection = (src: OperatorFlowOperation, tgt: OperatorFlowOperation, bypassCorrelationCheck: boolean = false) => {
    if (src.operatorKey === tgt.operatorKey) return;
    const srcRow = data[src.opIndex];
    const tgtRow = data[tgt.opIndex];
    // Strict Gate: verify flow correlation before adding connection (unless explicit target from SP)
    if (!bypassCorrelationCheck && !hasFlowCorrelation(src, tgt, tgtRow, srcRow)) return;

    const pairKey = `${src.operatorKey}->${tgt.operatorKey}`;
    const existing = connectionMap.get(pairKey);

    if (!outgoingTargetsPerOp.has(src.operatorKey)) {
      outgoingTargetsPerOp.set(src.operatorKey, new Set<string>());
    }
    outgoingTargetsPerOp.get(src.operatorKey)!.add(tgt.operatorKey);

    if (!existing) {
      connectionMap.set(pairKey, {
        id: pairKey,
        sourceKey: src.operatorKey,
        targetKey: tgt.operatorKey,
        sourceOperatorName: src.operatorName,
        targetOperatorName: tgt.operatorName,
        sourceFlowNo: src.flowNo,
        targetFlowNo: tgt.flowNo,
        sourceIndex: src.opIndex,
        targetIndex: tgt.opIndex,
        flowPairs: [{ sourceFlowNo: src.flowNo, targetFlowNo: tgt.flowNo }],
      });
    } else {
      if (!existing.flowPairs.some((p) => p.sourceFlowNo === src.flowNo && p.targetFlowNo === tgt.flowNo)) {
        existing.flowPairs.push({
          sourceFlowNo: src.flowNo,
          targetFlowNo: tgt.flowNo,
        });
      }
    }
  };

  // 2. Explicit Flow Resolution (100% strictly from Stored Procedure):
  // Connect operators based on their explicit FLOW_TARGET_NIK returned by SP / API,
  // supporting grouped operators and fallback to FLOW_TARGET_FLOW.
  allOps.forEach((src) => {
    const srcRow = data[src.opIndex];
    if (!srcRow) return;

    const groupedOps = (srcRow as any)._groupedOperators as CBSewingOutputRow[] | undefined;

    // Collect all candidate target NIKs from this row and any grouped operators
    const targetNiks = new Set<string>();
    if (srcRow.FLOW_TARGET_NIK && srcRow.FLOW_TARGET_NIK.trim()) {
      targetNiks.add(srcRow.FLOW_TARGET_NIK.trim().toUpperCase());
    }
    if (Array.isArray(groupedOps)) {
      groupedOps.forEach((gOp) => {
        if (gOp.FLOW_TARGET_NIK && gOp.FLOW_TARGET_NIK.trim()) {
          targetNiks.add(gOp.FLOW_TARGET_NIK.trim().toUpperCase());
        }
      });
    }

    let connectionMade = false;

    targetNiks.forEach((targetNik) => {
      const candidates = nikLookup.get(targetNik) || [];
      // If multiple candidate rows for targetNik (e.g. across modules),
      // prefer downstream row (opIndex > src.opIndex) or same module
      let targetOp = candidates[0];
      if (candidates.length > 1) {
        targetOp = candidates.find((c) => c.opIndex > src.opIndex) || candidates[0];
      }
      if (targetOp && targetOp.operatorKey !== src.operatorKey) {
        addConnection(src, targetOp, true);
        connectionMade = true;
      }
    });

    // Fallback: If no connection made via target NIK, try target flows
    if (!connectionMade) {
      const targetFlows = new Set<string>();
      if (srcRow.FLOW_TARGET_FLOW && srcRow.FLOW_TARGET_FLOW.trim()) {
        targetFlows.add(srcRow.FLOW_TARGET_FLOW.trim().toUpperCase());
      }
      if (Array.isArray(groupedOps)) {
        groupedOps.forEach((gOp) => {
          if (gOp.FLOW_TARGET_FLOW && gOp.FLOW_TARGET_FLOW.trim()) {
            targetFlows.add(gOp.FLOW_TARGET_FLOW.trim().toUpperCase());
          }
        });
      }

      targetFlows.forEach((tgtFlow) => {
        const cleanFlow = tgtFlow.trim().toUpperCase();
        const { baseFlow, cleanBaseCode } = parseFlowParts(cleanFlow);
        const targetOp =
          flowLookup.get(cleanFlow) ||
          (baseFlow ? flowLookup.get(baseFlow.toUpperCase()) : undefined) ||
          (cleanBaseCode ? flowLookup.get(cleanBaseCode.toUpperCase()) : undefined);

        if (targetOp && targetOp.operatorKey !== src.operatorKey) {
          addConnection(src, targetOp, true);
          connectionMade = true;
        }
      });
    }
  });

  return {
    operations: allOps,
    connections: Array.from(connectionMap.values()),
  };
}

/**
 * Assign vertical lanes to connections to prevent vertical line collisions (Greedy interval coloring).
 */
export function assignConnectionLanes(
  connections: OperatorFlowConnection[],
  operatorPositions: Map<string, { y: number }>
): {
  routedConnections: (OperatorFlowConnection & { laneIndex: number })[];
  totalLanes: number;
} {
  // Sort connections: shorter spans get inner lanes, longer spans get outer lanes
  const connWithSpans = connections.map((conn) => {
    const srcY = operatorPositions.get(conn.sourceKey)?.y ?? 0;
    const tgtY = operatorPositions.get(conn.targetKey)?.y ?? 0;
    const minY = Math.min(srcY, tgtY);
    const maxY = Math.max(srcY, tgtY);
    const span = maxY - minY;
    return { conn, minY, maxY, span };
  });

  // Sort by span ascending (or start position)
  connWithSpans.sort((a, b) => a.span - b.span);

  // Lanes: each lane holds intervals [minY, maxY] that don't overlap
  const lanes: { minY: number; maxY: number }[][] = [];
  const PADDING = 12; // vertical buffer in px

  const routedConnections = connWithSpans.map(({ conn, minY, maxY }) => {
    let assignedLane = -1;

    for (let l = 0; l < lanes.length; l++) {
      const isOverlap = lanes[l].some(
        (int) => !(maxY + PADDING < int.minY || minY - PADDING > int.maxY)
      );
      if (!isOverlap) {
        assignedLane = l;
        lanes[l].push({ minY, maxY });
        break;
      }
    }

    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push([{ minY, maxY }]);
    }

    return {
      ...conn,
      laneIndex: assignedLane,
    };
  });

  return {
    routedConnections,
    totalLanes: Math.max(1, lanes.length),
  };
}

/**
 * Build orthogonal SVG path with 90-degree rounded corners.
 */
export function buildOrthogonalPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  laneX: number,
  radius: number = 6
): string {
  // If source and target are on identical Y level, straight line
  if (Math.abs(startY - endY) < 4) {
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }

  const isGoingDown = endY > startY;
  const dy = Math.abs(endY - startY);
  const actualRadius = Math.min(radius, dy / 2, Math.abs(laneX - startX) / 2);

  if (isGoingDown) {
    return [
      `M ${startX} ${startY}`,
      `L ${laneX - actualRadius} ${startY}`,
      `Q ${laneX} ${startY}, ${laneX} ${startY + actualRadius}`,
      `L ${laneX} ${endY - actualRadius}`,
      `Q ${laneX} ${endY}, ${laneX - actualRadius} ${endY}`,
      `L ${endX} ${endY}`,
    ].join(" ");
  } else {
    // Going UP
    return [
      `M ${startX} ${startY}`,
      `L ${laneX - actualRadius} ${startY}`,
      `Q ${laneX} ${startY}, ${laneX} ${startY - actualRadius}`,
      `L ${laneX} ${endY + actualRadius}`,
      `Q ${laneX} ${endY}, ${laneX - actualRadius} ${endY}`,
      `L ${endX} ${endY}`,
    ].join(" ");
  }
}
