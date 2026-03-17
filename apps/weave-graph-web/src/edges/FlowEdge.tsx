/*
 * 文件作用：带粒子动画的流动边组件，running 状态时沿 bezier 路径播放粒子 + glow 滤镜。
 */

import { getBezierPath, type EdgeProps } from "reactflow";

export function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  animated,
  markerEnd
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  });

  const pathId = `flow-path-${id}`;
  const filterId = `glow-${id}`;
  const strokeColor = (style.stroke as string) ?? "rgba(59,130,246,0.9)";
  const strokeWidth = (style.strokeWidth as number) ?? 1.8;

  return (
    <g>
      {animated && (
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}

      <path
        id={pathId}
        d={edgePath}
        style={style}
        fill="none"
        strokeWidth={strokeWidth}
        stroke={strokeColor}
        markerEnd={markerEnd}
        filter={animated ? `url(#${filterId})` : undefined}
      />

      {animated && (
        <circle r="3.5" fill="rgba(147,197,253,0.9)">
          <animateMotion dur="1.4s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </circle>
      )}
    </g>
  );
}
