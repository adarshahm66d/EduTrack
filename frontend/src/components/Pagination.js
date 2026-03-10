import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange, pageSize, total, onPageSizeChange }) => {
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }
        
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="pagination-container">
            <div className="pagination-info">
                <span>
                    Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} results
                </span>
                {onPageSizeChange && (
                    <select
                        value={pageSize}
                        onChange={(e) => onPageSizeChange(Number(e.target.value))}
                        className="page-size-select"
                    >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                    </select>
                )}
            </div>
            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    title="First page"
                >
                    ««
                </button>
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    title="Previous page"
                >
                    ‹
                </button>
                {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                        {page === '...' ? (
                            <span className="pagination-ellipsis">...</span>
                        ) : (
                            <button
                                className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </button>
                        )}
                    </React.Fragment>
                ))}
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    title="Next page"
                >
                    ›
                </button>
                <button
                    className="pagination-btn"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    title="Last page"
                >
                    »»
                </button>
            </div>
        </div>
    );
};

export default Pagination;
