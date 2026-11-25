import React, { useMemo, useState, forwardRef } from "react";
import {
  OperatorFlowConnection,
  assignConnectionLanes,
  buildOrthogonalPath,
  FLOW_BASE_COLORS,
  getFlowStyle,
} from "./flowUtils";

interface OperatorPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OperatorFlowArrowsProps {
  connections: OperatorFlowConnection[];
  routedConnections?: (OperatorFlowConnection & { laneIndex: number })[];
  totalLanes?: number;
  operatorPositions: Map<string, OperatorPosition>;
  containerWidth: number;
  containerHeight: number;
  flowColumnX?: number;
  flowColumnWidth: number;
  highlightOperatorKey?: string | null;
  selectedOperatorKey?: string | null;
  onSelectOperator?: (opKey: string) => void;
  onHoverConnection?: (conn: OperatorFlowConnection | null) => void;
}

export const OperatorFlowArrows = React.memo(
  forwardRef<SVGGElement, OperatorFlowArrowsProps>(
    (
      {
        connections,
        routedConnections: preRoutedConnections,
        totalLanes: preTotalLanes,
        operatorPositions,
        containerWidth,
        containerHeight,
        flowColumnX = 0,
        flowColumnWidth,
        highlightOperatorKey,
        selectedOperatorKey,
        onSelectOperator,
        onHoverConnection,
      },
      ref
    ) => {
      const [hoveredConnId, setHoveredConnId] = useState<string | null>(null);

      // Assign lanes to prevent overlapping vertical segments
      const { routedConnections, totalLanes } = useMemo(() => {
        if (preRoutedConnections && preTotalLanes !== undefined) {
          return { routedConnections: preRoutedConnections, totalLanes: preTotalLanes };
        }
        return assignConnectionLanes(connections, operatorPositions);
      }, [connections, operatorPositions, preRoutedConnections, preTotalLanes]);

      // Width per lane in px (minimum 20px spacing for clarity)
      const laneSpacing = useMemo(() => {
        if (totalLanes <= 1) return 24;
        return Math.max(20, (flowColumnWidth - 44) / Math.max(1, totalLanes - 1));
      }, [totalLanes, flowColumnWidth]);

      if (connections.length === 0 || operatorPositions.size === 0) {
        return null;
      }

      const effectiveHighlightKey = selectedOperatorKey || highlightOperatorKey;

      return (
        <svg
          className="absolute top-0 left-0 pointer-events-none z-30 overflow-visible"
          style={{
            width: `${Math.max(containerWidth, 100)}px`,
            height: `${Math.max(containerHeight, 100)}px`,
            contain: "paint layout",
          }}
        >
          <defs>
            {/* Arrow Markers for 10 Static Base Colors (Flow 1 to 10) */}
            {FLOW_BASE_COLORS.map((c) => (
              <React.Fragment key={c.marker}>
                <marker
                  id={c.marker}
                  markerWidth="7"
                  markerHeight="7"
                  refX="5"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 1, 6 3.5, 0 6" fill={c.stroke} />
                </marker>
                <marker
                  id={`${c.marker}-hover`}
                  markerWidth="8"
                  markerHeight="8"
                  refX="6"
                  refY="4"
                  orient="auto"
                >
                  <polygon points="0 1, 7 4, 0 7" fill={c.hover} />
                </marker>
              </React.Fragment>
            ))}
          </defs>

          {/* Flow group translated to sticky FLOW column via hardware-accelerated transform */}
          <g
            ref={ref}
            style={{
              transform: `translate3d(${flowColumnX}px, 0px, 0px)`,
              willChange: "transform",
            }}
          >
            {routedConnections.map((conn) => {
              const srcPos = operatorPositions.get(conn.sourceKey);
              const tgtPos = operatorPositions.get(conn.targetKey);

              if (!srcPos || !tgtPos) return null;

              const colorScheme = getFlowStyle(conn.sourceFlowNo);
              const isHovered = hoveredConnId === conn.id;
              const isOpHighlighted =
                effectiveHighlightKey != null &&
                conn.sourceKey === effectiveHighlightKey; // outgoing only
              const isOpSelected =
                selectedOperatorKey != null &&
                conn.sourceKey === selectedOperatorKey;

              const activeColor = isHovered ? colorScheme.hover : colorScheme.stroke;
              const markerUrl = isHovered
                ? `url(#${colorScheme.marker}-hover)`
                : `url(#${colorScheme.marker})`;

              const anchorX = 8;
              const ANCHOR_OFFSET = 6;
              const startY = srcPos.y + ANCHOR_OFFSET;
              const endY = tgtPos.y - ANCHOR_OFFSET;
              const startX = anchorX;
              const endX = anchorX;

              const laneX =
                totalLanes <= 1
                  ? flowColumnWidth / 2
                  : 22 + (conn.laneIndex ?? 0) * laneSpacing;

              const pathData = buildOrthogonalPath(startX, startY, endX, endY, laneX, 6);

              let opacity = 0.88;
              if (effectiveHighlightKey) {
                opacity = isOpHighlighted ? 1 : 0.12;
              } else if (hoveredConnId) {
                opacity = isHovered ? 1 : 0.18;
              }

              const isHighlighted = isHovered || isOpHighlighted;

              return (
                <g
                  key={conn.id}
                  style={{
                    opacity,
                    transition: "opacity 0.12s ease-out",
                  }}
                >
                  {/* Invisible thick hit-area for clicking / hovering */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={16}
                    className="pointer-events-auto cursor-pointer"
                    onClick={() => onSelectOperator?.(conn.sourceKey)}
                    onMouseEnter={() => {
                      setHoveredConnId(conn.id);
                      onHoverConnection?.(conn);
                    }}
                    onMouseLeave={() => {
                      setHoveredConnId(null);
                      onHoverConnection?.(null);
                    }}
                  >
                    <title>
                      {`Flow: ${conn.flowPairs.map((p) => `${p.sourceFlowNo}→${p.targetFlowNo}`).join(", ")}\n` +
                        `${conn.sourceOperatorName} ➔ ${conn.targetOperatorName} (${colorScheme.name})\n` +
                        `(Klik untuk lock tracking)`}
                    </title>
                  </path>

                  {/* Halo line for highlight/selection (pure GPU path stroke, 0 raster filter lag) */}
                  {isHighlighted && (
                    <path
                      d={pathData}
                      fill="none"
                      stroke={isOpSelected ? "#c084fc" : activeColor}
                      strokeWidth={isOpSelected ? 6 : 5}
                      strokeOpacity={0.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Main visible connector path */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={activeColor}
                    strokeWidth={isHighlighted ? 2.5 : 1.5}
                    markerEnd={markerUrl}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />

                  {/* Source anchor dot */}
                  <circle
                    cx={startX}
                    cy={startY}
                    r={isHighlighted ? 3.5 : 2.5}
                    fill={activeColor}
                    stroke="#0f172a"
                    strokeWidth={1}
                  />

                  {/* Target anchor dot */}
                  <circle
                    cx={endX}
                    cy={endY}
                    r={isHighlighted ? 3.5 : 2.5}
                    fill={activeColor}
                    stroke="#0f172a"
                    strokeWidth={1}
                  />

                  {/* Flow label on hover/highlight */}
                  {isHighlighted && (
                    <g
                      transform={`translate(${
                        laneX > flowColumnWidth - 65 ? laneX - 60 : laneX + 4
                      }, ${(startY + endY) / 2})`}
                      className="pointer-events-none"
                    >
                      <rect
                        x="-2"
                        y="-10"
                        width={Math.max(54, (conn.sourceFlowNo.length + conn.targetFlowNo.length) * 6 + 18)}
                        height="18"
                        rx="3"
                        fill="#0b1329"
                        stroke={activeColor}
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x="3"
                        y="3"
                        fill="#f8fafc"
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {`${conn.sourceFlowNo}→${conn.targetFlowNo}`}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      );
    }
  )
);

OperatorFlowArrows.displayName = "OperatorFlowArrows";
