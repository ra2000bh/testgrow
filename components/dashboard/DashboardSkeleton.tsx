"use client";

export function DashboardSkeleton() {
  return (
    <div className="dash-root -mx-4 w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] px-4 pb-8 pt-2">
      <div className="dash-bg-image" aria-hidden />
      <div className="dash-inner space-y-4">
        <div className="flex justify-between gap-3">
          <div className="dash-skeleton h-5 w-40" />
          <div className="dash-skeleton h-8 w-32" />
        </div>
        <div className="dash-skeleton h-10 w-full" />
        <div className="dash-tile dash-tile-wide space-y-3 py-5">
          <div className="dash-skeleton h-3 w-24" />
          <div className="dash-skeleton h-10 w-48" />
          <div className="dash-skeleton h-4 w-36" />
          <div className="dash-skeleton h-[180px] w-full" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="dash-tile h-28" />
          <div className="dash-tile h-28" />
        </div>
        <div className="dash-tile dash-tile-wide h-40" />
        <div className="dash-tile dash-tile-wide h-14" />
        <div className="dash-tile dash-tile-wide h-16" />
      </div>
    </div>
  );
}
