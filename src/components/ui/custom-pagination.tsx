import * as React from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface PaginationProps {
    totalPages: number
    currentPage: number
    createUrl: (page: number) => string
}

export function Pagination({ totalPages, currentPage, createUrl }: PaginationProps) {
    // Logic to generate page numbers
    const pages = React.useMemo(() => {
        const items: (number | "ellipsis")[] = []

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) items.push(i)
        } else {
            if (currentPage < 4) {
                items.push(1, 2, 3, 4, 5, "ellipsis", totalPages)
            } else if (currentPage > totalPages - 3) {
                items.push(1, "ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
            } else {
                items.push(1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages)
            }
        }
        return items
    }, [totalPages, currentPage])

    if (totalPages <= 1) return null

    return (
        <nav role="navigation" aria-label="pagination" className="mx-auto flex w-full justify-center gap-1">
            <Link
                href={createUrl(Math.max(1, currentPage - 1))}
                className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    currentPage === 1 && "pointer-events-none opacity-50"
                )}
                aria-disabled={currentPage === 1}
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous</span>
            </Link>

            {pages.map((page, i) => (
                page === "ellipsis" ? (
                    <div key={`ellipsis-${i}`} className="flex h-9 w-9 items-center justify-center">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">More pages</span>
                    </div>
                ) : (
                    <Link
                        key={page}
                        href={createUrl(page as number)}
                        className={cn(
                            buttonVariants({
                                variant: currentPage === page ? "default" : "ghost",
                                size: "icon"
                            })
                        )}
                    >
                        {page}
                    </Link>
                )
            ))}

            <Link
                href={createUrl(Math.min(totalPages, currentPage + 1))}
                className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    currentPage === totalPages && "pointer-events-none opacity-50"
                )}
                aria-disabled={currentPage === totalPages}
            >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next</span>
            </Link>
        </nav>
    )
}
