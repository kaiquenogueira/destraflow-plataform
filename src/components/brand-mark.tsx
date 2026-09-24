import { platformBrand, symbolPath, symbolViewBox } from "@destraflow/brand";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        aria-hidden="true"
        viewBox={symbolViewBox}
        fill="currentColor"
        className="h-8 w-8 shrink-0"
      >
        <path fillRule="evenodd" d={symbolPath} />
      </svg>
      <span className="text-[1.02rem] font-semibold tracking-[-0.045em]">
        {platformBrand.name}
      </span>
    </span>
  );
}
