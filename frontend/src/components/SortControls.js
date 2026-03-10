import React from 'react';

const SortControls = ({ sortBy, sortOrder, onSortChange, sortOptions }) => {
    const handleSortFieldChange = (e) => {
        onSortChange(e.target.value, sortOrder);
    };

    const handleSortOrderChange = () => {
        const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        onSortChange(sortBy, newOrder);
    };

    return (
        <div className="sort-controls">
            <label htmlFor="sort-field">Sort by:</label>
            <select
                id="sort-field"
                value={sortBy}
                onChange={handleSortFieldChange}
                className="sort-select"
            >
                {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <button
                className="sort-order-btn"
                onClick={handleSortOrderChange}
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
                {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
        </div>
    );
};

export default SortControls;
