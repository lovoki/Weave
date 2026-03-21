import React, { memo } from "react";
import { getBezierPath, type EdgeProps, useStore } from "reactflow";
import styles from "./FlowEdge.module.css";

const areEqual = (prev: EdgeProps, next: EdgeProps) => {
  return (
    prev.id === next.id &&
    prev.sourceX === next.sourceX &&
    prev.sourceY === next.sourceY &&
    prev.targetX === next.targetX &&
    prev.targetY === next.targetY &&
    prev.sourceHandleId === next.sourceHandleId &&
    prev.targetHandleId === next.targetHandleId
  );
};

export const FlowEdge = memo(function FlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  // 从局部 store 获取节点状态
  const targetNode = useStore((s) => s.nodeInternals.get(target));
  const sourceNode = useStore((s) => s.nodeInternals.get(source));
  
  const status = targetNode?.data?.status;
  const isFocused = targetNode?.selected || sourceNode?.selected;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  const gradientId = `grad-${id}`;
  const arrowId = `arrow-${id}`;
  
  // 核心样式逻辑局部化
  let strokeColor = isFocused ? "rgba(180, 138, 255, 0.8)" : "var(--border-muted)";
  if (status === "success") strokeColor = isFocused ? "rgba(61, 198, 83, 0.8)" : "rgba(61, 198, 83, 0.22)";
  else if (status === "fail") strokeColor = "rgba(255, 96, 87, 0.7)";
  else if (status === "running" || status === "retrying") strokeColor = "rgba(90, 173, 255, 0.95)";
  else if (status === "skipped") strokeColor = "rgba(90, 102, 120, 0.35)";

  const isAnimated = status === "running" || status === "retrying" || isFocused;
  const isFail = status === "fail";
  const strokeWidth = isAnimated ? 1.7 : 1.4;

  const edgeKind = (data as { edgeKind?: string } | undefined)?.edgeKind;
  let edgeLabelText = "";
  let edgeLabelColor = "#8fa3bc";
  if (edgeKind === "retry") { edgeLabelText = "↩ RETRY"; edgeLabelColor = "#e8872a"; }
  else if (edgeKind === "condition_true") { edgeLabelText = "✓ TRUE"; edgeLabelColor = "#3dc653"; }
  else if (edgeKind === "condition_false") { edgeLabelText = "✗ FALSE"; edgeLabelColor = "#ff6057"; }

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <g style={{ shapeRendering: "geometricPrecision" } as React.CSSProperties}>
      <defs>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,6 L8,3 z"
            fill={isAnimated ? (isFocused ? "#b48aff" : strokeColor) : strokeColor}
            opacity={isAnimated ? 0.85 : 0.6}
          />
        </marker>

        {(isAnimated || isFocused) && (
          <>
            <linearGradient
              id={gradientId}
              gradientUnits="userSpaceOnUse"
              x1={sourceX} y1={sourceY}
              x2={targetX} y2={targetY}
            >
              <stop offset="0%"   stopColor="#b48aff" stopOpacity="0.9" />
              <stop offset="50%"  stopColor="#3b82f6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#5aadff" stopOpacity="0.9" />
            </linearGradient>

            <filter id={`track-glow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={isFocused ? "3" : "2"} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </>
        )}
      </defs>

      {isAnimated ? (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={strokeWidth + (isFocused ? 0.8 : 0.5)}
          stroke={isFocused ? `url(#${gradientId})` : strokeColor}
          opacity={isFocused ? 0.6 : 0.35}
          filter={`url(#track-glow-${id})`}
          markerEnd={`url(#${arrowId})`}
          className={styles.edgeGlow}
        />
      ) : (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          markerEnd={`url(#${arrowId})`}
          strokeDasharray={isFail ? "4 4" : undefined}
          className={styles.edgePath}
        />
      )}

      {isAnimated && (
        <circle
          r={isFocused ? 2.5 : 2}
          className={styles.starParticle}
          style={{
            offsetPath: `path('${edgePath}')`,
            animation: `${isFocused ? 'fast-comet-flow' : 'comet-flow'} ${isFocused ? '1.2s' : '2s'} linear infinite`,
          } as any}
        />
      )}

      {edgeLabelText && (
        <g>
          <rect
            x={midX - 28}
            y={midY - 9}
            width="56"
            height="16"
            rx="4"
            className={styles.labelContainer}
            stroke={edgeLabelColor}
            strokeWidth="0.8"
          />
          <text
            x={midX}
            y={midY + 3}
            textAnchor="middle"
            fontSize="9"
            fill={edgeLabelColor}
            className={styles.labelText}
          >
            {edgeLabelText}
          </text>
        </g>
      )}
    </g>
  );
}, areEqual);
FlowEdge.displayName = "FlowEdge";
