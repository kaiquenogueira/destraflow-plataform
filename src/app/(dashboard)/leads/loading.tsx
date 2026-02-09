export default function LeadsLoading() {
    return (
        <div className="space-y-6">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mt-2 animate-pulse" />
                </div>
                <div className="h-10 w-full sm:w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>

            {/* Filters Skeleton */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 h-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="w-full sm:w-[200px] h-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>

            {/* List Skeleton */}
            <div className="space-y-4">
                {/* Header Row */}
                <div className="hidden md:flex gap-4 p-4 border rounded-t-lg bg-slate-50 dark:bg-slate-900">
                    <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                
                {/* Rows */}
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 w-full bg-white dark:bg-slate-900 border rounded-lg md:rounded-none md:border-t-0 p-4 animate-pulse flex items-center gap-4">
                        <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
