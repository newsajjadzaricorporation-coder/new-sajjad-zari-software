import React from 'react';

export const SkeletonRow: React.FC<{ cols?: number; height?: string }> = ({
  cols = 6,
  height = 'h-10',
}) => {
  return (
    <tr className="animate-pulse border-b border-slate-800/40">
      {Array.from({ length: cols }).map((_, idx) => (
        <td key={idx} className={`p-3.5 ${height}`}>
          <div
            className={`h-4 bg-slate-800/70 rounded-md ${
              idx === 0
                ? 'w-6'
                : idx === 1
                ? 'w-36'
                : idx === cols - 1
                ? 'w-16 ml-auto'
                : 'w-24'
            }`}
          />
        </td>
      ))}
    </tr>
  );
};

export const TableSkeleton: React.FC<{
  rows?: number;
  cols?: number;
  headerLabels?: string[];
}> = ({ rows = 8, cols = 7, headerLabels }) => {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-xl">
      <table className="w-full text-left border-collapse text-xs">
        {headerLabels && (
          <thead>
            <tr className="bg-slate-900/90 text-slate-500 border-b border-slate-800 uppercase tracking-wider font-semibold text-[11px]">
              {headerLabels.map((lbl, i) => (
                <th key={i} className="p-3.5">
                  {lbl}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-800/40">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols || (headerLabels ? headerLabels.length : 6)} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-md"
        >
          <div className="flex items-center justify-between">
            <div className="h-3 w-20 bg-slate-800 rounded" />
            <div className="w-7 h-7 rounded-xl bg-slate-800" />
          </div>
          <div className="h-7 w-28 bg-slate-800 rounded-lg" />
          <div className="h-2.5 w-36 bg-slate-800/60 rounded" />
        </div>
      ))}
    </div>
  );
};

export const HeatmapSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Top 4 Stat Cards */}
      <CardSkeleton count={4} />

      {/* Analytics Chart Block Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 h-80 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-4 w-40 bg-slate-800 rounded" />
            <div className="h-6 w-24 bg-slate-800 rounded-lg" />
          </div>
          <div className="h-56 bg-slate-800/40 rounded-xl flex items-end gap-3 p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-slate-800 rounded-t"
                style={{ height: `${25 + (i * 17) % 70}%` }}
              />
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 h-80 flex flex-col justify-between">
          <div className="h-4 w-32 bg-slate-800 rounded" />
          <div className="w-40 h-40 mx-auto rounded-full border-8 border-slate-800 border-t-amber-500/30 animate-spin" />
          <div className="h-3 w-44 mx-auto bg-slate-800/60 rounded" />
        </div>
      </div>

      {/* Heatmap Grid Matrix Skeleton */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-4 w-48 bg-slate-800 rounded" />
          <div className="h-7 w-32 bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-800/50 p-3 space-y-2 border border-slate-800/60">
              <div className="h-3 w-16 bg-slate-800 rounded" />
              <div className="h-4 w-24 bg-slate-800 rounded" />
              <div className="h-5 w-12 bg-slate-800 rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 6 }) => {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/70 flex items-center justify-between gap-3"
        >
          <div className="space-y-2 flex-1">
            <div className="h-3.5 w-32 bg-slate-800 rounded" />
            <div className="h-2.5 w-24 bg-slate-800/60 rounded" />
          </div>
          <div className="h-4 w-16 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
};
