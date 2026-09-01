import React, { useState } from "react";

const UserTable = ({ columns, data, title, loading }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const indexOfLast = currentPage * rowsPerPage;
    const indexOfFirst = indexOfLast - rowsPerPage;
    const currentRows = data.slice(indexOfFirst, indexOfLast);
    const totalPages = Math.ceil(data.length / rowsPerPage);
    const load = true;

    const getVisiblePages = () => {
        const pages = [];
        const start = Math.max(1, currentPage - 1);
        const end = Math.min(totalPages, currentPage + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };


    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>{title}</h5>
                <select
                    className="form-select w-auto" style={{ padding: ".375rem 1.25rem .375rem .75rem", fontSize: "12px", backgroundPosition: "right .55rem center", backgroundSize: "10px 12px", boxShadow: "none" }}
                    value={rowsPerPage}
                    onChange={(e) => {
                        setRowsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                    }}
                >
                    <option value={5}>5 rows</option>
                    <option value={10}>10 rows</option>

                </select>
            </div>

            <div className="table-responsive user-table-responsive">
                <table className="table table-bordered table-hover text-center">


                    <thead className="table-dark">
                        <tr>
                            <th>#</th>
                            {
                                columns.map(col => (
                                    <th key={col.key}>{col.label}</th>
                                ))}
                        </tr>
                    </thead>

                    {loading ? (
                        <tbody>
                            <tr>
                                <td colSpan={columns.length + 1} style={{ border: "red" }} >
                                    <div className="text-center py-5">
                                        <div className="spinner-border" role="status">
                                            <span className="visually-hidden">Loading...</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    ) : (
                        <tbody>
                            {
                                currentRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length + 1}>No Records</td>
                                    </tr>
                                ) : (
                                    currentRows.map((row, index) => (
                                        <tr key={index}>
                                            <td>{indexOfFirst + index + 1}</td>

                                            {columns.map(col => (
                                                <td key={col.key}>
                                                    {col.render ? col.render(row) : row[col.key]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                        </tbody>
                    )}
                </table>
            </div>


            {/* Pagination */}

            <nav>
                <ul className="pagination justify-content-end">

                    <li className={`page-item ${currentPage === 1 && "disabled"}`}>
                        <button className="page-link fs-12" onClick={() => setCurrentPage(currentPage - 1)} style={{
                            padding: "4px 9px",
                            fontSize: "13px",
                            color: "#000000",
                            boxShadow: "none",
                        }}>
                            Prev
                        </button>
                    </li>
                    {getVisiblePages().map((page) => (
                        <li
                            key={page}
                            className={`page-item ${currentPage === page ? "active" : ""}`}
                        >
                            <button
                                className="page-link fs-12"
                                onClick={() => setCurrentPage(page)}
                                style={{
                                    padding: "4px 9px",
                                    fontSize: "13px",
                                    boxShadow: "none",
                                    backgroundColor: currentPage === page ? "#212529" : "white",
                                    color: currentPage === page ? "white" : "#000000",
                                    borderColor: currentPage === page ? "#212529" : "#dee2e6",
                                }}
                            >
                                {page}
                            </button>
                        </li>
                    ))}

                    <li className={`page-item ${currentPage === totalPages && "disabled"}`}>
                        <button className="page-link fs-12" onClick={() => setCurrentPage(currentPage + 1)} style={{
                            padding: "4px 9px",
                            fontSize: "13px",
                            color: "#000000",
                            boxShadow: "none",
                        }}>
                            Next
                        </button>
                    </li>

                </ul>
            </nav>

        </div>
    );
};



export default UserTable;