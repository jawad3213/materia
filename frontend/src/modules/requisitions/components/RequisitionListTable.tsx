import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../shared/components/ui/table";
import Checkbox from "../../../shared/components/form/input/Checkbox";
import Button from "../../../shared/components/ui/button/Button";
import DeleteConfirmModal from "../../../shared/components/ui/modal/DeleteConfirmModal";
import Pagination from "../../../shared/components/ui/Pagination";
import { requisitionApi } from "../services/requisitionApi";
import type {
  Requisition,
  RequisitionFilterTab,
  RequisitionSearchRequest,
} from "../types";
import RequisitionStatusBadge from "./RequisitionStatusBadge";
import RequisitionStatCards from "./RequisitionStatCards";
import RequisitionFilters from "./RequisitionFilters";
import RequisitionCancelModal from "./RequisitionCancelModal";

export default function RequisitionListTable() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());

  // Delete modal state
  const [requisitionToDelete, setRequisitionToDelete] =
    useState<Requisition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Convert to PO modal state
  const [convertToPoRequisition, setConvertToPoRequisition] =
    useState<Requisition | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Cancel modal state
  const [requisitionToCancel, setRequisitionToCancel] =
    useState<Requisition | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Search & Filter state
  const [searchKeyword, setSearchKeyword] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRequester, setFilterRequester] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  // Top KPI Card filter state
  const [activeStatFilter, setActiveStatFilter] =
    useState<RequisitionFilterTab>("ALL");
  const [statCounts, setStatCounts] = useState({
    total: 0,
    pendingReview: 0,
    readyForPo: 0,
    converted: 0,
    totalEstimatedValue: 0,
    currency: "MAD",
  });

  // Pagination state
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const isFirstMount = useRef(true);

  // Active filters count
  const activeFiltersCount = [
    filterStatus,
    filterRequester,
    filterDateFrom,
    filterDateTo,
  ].filter(Boolean).length;

  useEffect(() => {
    fetchStatCounts();
  }, [refreshTrigger]);

  const fetchStatCounts = async () => {
    try {
      const res = await requisitionApi.getAll();
      const all = res.data || [];
      const pending = all.filter(
        (r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW"
      ).length;
      const approved = all.filter((r) => r.status === "APPROVED").length;
      const converted = all.filter((r) => r.status === "CONVERTED").length;

      const totalVal = all.reduce((sum, r) => {
        const amt =
          typeof r.totalAmount === "number"
            ? r.totalAmount
            : parseFloat(String(r.totalAmount || "0").replace(/[^0-9.-]+/g, "")) || 0;
        return sum + amt;
      }, 0);

      const detectedCurr = all[0]?.currencyCode || "MAD";

      setStatCounts({
        total: all.length,
        pendingReview: pending,
        readyForPo: approved,
        converted: converted,
        totalEstimatedValue: totalVal,
        currency: detectedCurr,
      });
    } catch (err) {
      console.error("Failed to load requisition stats:", err);
    }
  };

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchRequisitions();
      return;
    }
    fetchRequisitions();
  }, [page, refreshTrigger, activeStatFilter]);

  const fetchRequisitions = async () => {
    try {
      setLoading(true);

      const criteria: RequisitionSearchRequest = {};

      if (searchKeyword.trim()) {
        criteria.keyword = searchKeyword.trim();
      }

      if (filterRequester.trim()) {
        criteria.requesterId = filterRequester.trim();
      }

      if (filterDateFrom) {
        criteria.requiredDateFrom = filterDateFrom;
      }

      if (filterDateTo) {
        criteria.requiredDateTo = filterDateTo;
      }

      // Merge activeStatFilter with filterStatus
      if (activeStatFilter === "PENDING") {
        criteria.status = "SUBMITTED";
      } else if (activeStatFilter === "APPROVED") {
        criteria.status = "APPROVED";
      } else if (activeStatFilter === "CONVERTED") {
        criteria.status = "CONVERTED";
      } else if (activeStatFilter === "DRAFT") {
        criteria.status = "DRAFT";
      } else if (filterStatus) {
        criteria.status = filterStatus;
      }

      const hasCriteria =
        criteria.keyword ||
        criteria.status ||
        criteria.requesterId ||
        criteria.requiredDateFrom ||
        criteria.requiredDateTo;

      if (hasCriteria) {
        try {
          const res = await requisitionApi.searchAdvanced(criteria, page, size);
          const data = res.data;
          setRequisitions(data.content || []);
          setTotalPages(data.totalPages || 0);
          setTotalElements(data.totalElements || 0);
        } catch (searchErr) {
          // Fallback to client-side filtering if search endpoint has criteria issues
          const allRes = await requisitionApi.getAll();
          let items = allRes.data || [];

          if (criteria.keyword) {
            const kw = criteria.keyword.toLowerCase();
            items = items.filter(
              (r) =>
                r.requisitionCode?.toLowerCase().includes(kw) ||
                r.title?.toLowerCase().includes(kw) ||
                r.requesterName?.toLowerCase().includes(kw) ||
                r.description?.toLowerCase().includes(kw)
            );
          }

          if (activeStatFilter === "PENDING") {
            items = items.filter(
              (r) => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW"
            );
          } else if (criteria.status) {
            items = items.filter((r) => r.status === criteria.status);
          }

          if (criteria.requesterId) {
            items = items.filter(
              (r) =>
                r.requesterId?.toLowerCase().includes(criteria.requesterId!.toLowerCase()) ||
                r.requesterName?.toLowerCase().includes(criteria.requesterId!.toLowerCase())
            );
          }

          setTotalElements(items.length);
          setTotalPages(Math.ceil(items.length / size) || 1);
          setRequisitions(items.slice(page * size, (page + 1) * size));
        }
      } else {
        const allRes = await requisitionApi.getAll();
        const items = allRes.data || [];
        setTotalElements(items.length);
        setTotalPages(Math.ceil(items.length / size) || 1);
        setRequisitions(items.slice(page * size, (page + 1) * size));
      }
    } catch (err) {
      console.error("Failed to load requisitions:", err);
      setRequisitions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRow = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(requisitions.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectStatFilter = (filter: RequisitionFilterTab) => {
    setActiveStatFilter((prev) => (prev === filter ? "ALL" : filter));
    setPage(0);
  };

  const handleApplyFilters = () => {
    setIsFilterOpen(false);
    setPage(0);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleClearFilters = () => {
    setFilterStatus("");
    setFilterRequester("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setIsFilterOpen(false);
    setPage(0);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Workflow Handlers
  const handleQuickSubmit = async (requisition: Requisition) => {
    try {
      setLoading(true);
      await requisitionApi.submit(requisition.id, "current-user");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to submit requisition:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToPoConfirm = async () => {
    if (!convertToPoRequisition) return;
    try {
      setIsConverting(true);
      const generatedPoCode = `PO-${new Date().getFullYear()}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;
      await requisitionApi.convert(
        convertToPoRequisition.id,
        crypto.randomUUID(),
        generatedPoCode,
        "current-user"
      );
      setConvertToPoRequisition(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to convert requisition to PO:", err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!requisitionToDelete) return;
    try {
      setIsDeleting(true);
      await requisitionApi.delete(requisitionToDelete.id);
      setRequisitionToDelete(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to delete requisition:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!requisitionToCancel) return;
    try {
      setIsCancelling(true);
      await requisitionApi.cancel(requisitionToCancel.id, "current-user", reason);
      setRequisitionToCancel(null);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to cancel requisition:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  const formatAmount = (amt: string | number, curr = "MAD") => {
    if (amt === undefined || amt === null) return `0.00 ${curr}`;
    const str = String(amt).trim();
    let detectedCurr = curr;
    if (!curr || curr === "MAD") {
      const upper = str.toUpperCase();
      if (upper.includes("EUR") || upper.includes("€") || upper.includes("â‚¬") || upper.includes("\u20AC")) {
        detectedCurr = "EUR";
      } else if (upper.includes("USD") || upper.includes("$")) {
        detectedCurr = "USD";
      } else if (upper.includes("MAD") || upper.includes("DH") || upper.includes("DIRHAM")) {
        detectedCurr = "MAD";
      }
    }

    let cleaned = str.replace(/[^0-9.,-]+/g, "");
    if (cleaned.includes(",") && cleaned.includes(".")) {
      if (cleaned.indexOf(",") < cleaned.indexOf(".")) {
        cleaned = cleaned.replace(/,/g, "");
      } else {
        cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
      }
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/,/g, ".");
    }
    const num = parseFloat(cleaned);
    const validNum = isNaN(num) ? 0 : num;
    return `${new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(validNum)} ${detectedCurr}`;
  };

  const getUrgencyBadge = (requiredDateStr?: string) => {
    if (!requiredDateStr) return null;
    const reqDate = new Date(requiredDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reqDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil(
      (reqDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400 border border-red-200/60 dark:border-red-500/20">
          <span className="size-1 rounded-full bg-red-500" />
          Overdue
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
          <span className="size-1 rounded-full bg-amber-500 animate-ping" />
          Due in {diffDays}d
        </span>
      );
    }
    return (
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {requiredDateStr}
      </span>
    );
  };

  const isAllSelected =
    requisitions.length > 0 &&
    requisitions.every((r) => selectedIds.includes(r.id));

  return (
    <div className="space-y-4">
      {/* Top Metric / Filter Stat Cards */}
      <RequisitionStatCards
        activeFilter={activeStatFilter}
        onSelectFilter={handleSelectStatFilter}
        counts={statCounts}
      />

      {/* Main Table Card Container */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/[0.07] dark:bg-gray-900">
        {/* Table Controls Header */}
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-white/[0.07]">
          {/* Left: Search Bar */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search code, title, requester..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(0);
                  fetchRequisitions();
                }
              }}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2.5 pl-10 pr-10 text-xs text-gray-900 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white dark:focus:bg-transparent"
            />
            <svg
              className="absolute left-3.5 top-3 size-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchKeyword && (
              <button
                type="button"
                onClick={() => {
                  setSearchKeyword("");
                  setPage(0);
                  setRefreshTrigger((prev) => prev + 1);
                }}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Right: Actions & Filter Toggle */}
          <div className="flex items-center gap-2">
            {/* Filter Popover */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filter
                </span>
              </Button>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow-sm">
                  {activeFiltersCount}
                </span>
              )}

              <RequisitionFilters
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                filterRequester={filterRequester}
                setFilterRequester={setFilterRequester}
                filterDateFrom={filterDateFrom}
                setFilterDateFrom={setFilterDateFrom}
                filterDateTo={filterDateTo}
                setFilterDateTo={setFilterDateTo}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
              />
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRefreshTrigger((prev) => prev + 1)}
              title="Refresh"
            >
              <svg
                className={`size-4 ${loading ? "animate-spin text-brand-500" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </Button>

            {/* Approvals Portal Link (Dedicated Page for Manager Approvals) */}
            <Link to="/requisitions/approvals">
              <Button
                variant="outline"
                size="sm"
                className="border-amber-300 text-amber-700 bg-amber-50/60 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
              >
                <span className="flex items-center gap-1.5">
                  <svg
                    className="size-4 text-amber-600 dark:text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Approvals Portal
                  {statCounts.pendingReview > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {statCounts.pendingReview}
                    </span>
                  )}
                </span>
              </Button>
            </Link>

            {/* Create New Requisition */}
            <Link to="/requisitions/create">
              <Button size="sm">
                <span className="flex items-center gap-1.5">
                  <svg
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  New Requisition
                </span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Active Filters Pill Bar */}
        {(activeFiltersCount > 0 || activeStatFilter !== "ALL") && (
          <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-gray-50/75 border-b border-gray-100 dark:bg-gray-900/40 dark:border-white/[0.05]">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Active filters:
            </span>
            {activeStatFilter !== "ALL" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                View: {activeStatFilter}
                <button
                  type="button"
                  onClick={() => setActiveStatFilter("ALL")}
                  className="hover:text-brand-900 dark:hover:text-white"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filterStatus && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                Status: {filterStatus}
                <button
                  type="button"
                  onClick={() => {
                    setFilterStatus("");
                    setRefreshTrigger((prev) => prev + 1);
                  }}
                  className="hover:text-brand-900 dark:hover:text-white"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filterRequester && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                Requester: {filterRequester}
                <button
                  type="button"
                  onClick={() => {
                    setFilterRequester("");
                    setRefreshTrigger((prev) => prev + 1);
                  }}
                  className="hover:text-brand-900 dark:hover:text-white"
                >
                  <svg className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        )}

        {/* Data Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/75 dark:bg-white/[0.02]">
              <TableRow className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableCell isHeader className="w-10 px-4 py-3.5">
                  <span className="sr-only">Expand</span>
                </TableCell>
                <TableCell isHeader className="w-10 px-4 py-3.5">
                  <Checkbox
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Requisition
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Requester
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Need By
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Total Value
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Status
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  PO Reference
                </TableCell>
                <TableCell isHeader className="px-4 py-3.5 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="px-4 py-12 text-center text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="size-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                      <span>Loading purchase requisitions...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : requisitions.length === 0 ? (
                <TableRow>
                  <TableCell className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/[0.05] dark:text-gray-500">
                        <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        No purchase requisitions found
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm">
                        {searchKeyword || activeFiltersCount > 0 || activeStatFilter !== "ALL"
                          ? "Try adjusting your search criteria or resetting filters."
                          : "Create your first purchase requisition to start managing material procurement."}
                      </p>
                      <Link to="/requisitions/create">
                        <Button size="sm">Create Requisition</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                requisitions.map((req) => {
                  const isExpanded = expandedRowIds.has(req.id);
                  const isSelected = selectedIds.includes(req.id);
                  const linesCount = req.lines?.length || 0;
                  const isPending =
                    req.status === "SUBMITTED" || req.status === "UNDER_REVIEW";
                  const isApproved = req.status === "APPROVED";
                  const isConverted = req.status === "CONVERTED";
                  const isDraft = req.status === "DRAFT";
                  const isRejected = req.status === "REJECTED";
                  const isCancelled = req.status === "CANCELLED";

                  // Status Lifecycle Rules:
                  // Modifier: DRAFT ✅ OUI, SUBMITTED ✅ OUI*, APPROVED ❌ NON, REJECTED ❌ NON, CONVERTED ❌ NON
                  const canEdit = isDraft || isPending;
                  // Supprimer: DRAFT ✅ OUI, SUBMITTED ❌ NON, APPROVED ❌ NON, REJECTED ✅ OUI, CONVERTED ❌ NON, CANCELLED ✅ OUI
                  const canDelete = isDraft || isRejected || isCancelled;
                  // Soumettre: DRAFT ✅ OUI
                  const canSubmit = isDraft;
                  // Convertir: APPROVED ✅ OUI
                  const canConvert = isApproved;
                  // Annuler: DRAFT ✅ OUI, SUBMITTED ✅ OUI, APPROVED ✅ OUI, REJECTED ❌ NON, CONVERTED ❌ NON
                  const canCancel = isDraft || isPending || isApproved;

                  return (
                    <React.Fragment key={req.id}>
                      <TableRow
                        className={`border-b border-gray-100 transition-colors hover:bg-gray-50/60 dark:border-white/[0.05] dark:hover:bg-white/[0.02] ${
                          isSelected
                            ? "bg-brand-50/30 dark:bg-brand-500/[0.06]"
                            : ""
                        }`}
                      >
                        {/* Expand Row Toggle */}
                        <TableCell className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleRow(req.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-transform"
                            title={isExpanded ? "Collapse lines" : "Expand lines"}
                          >
                            <svg
                              className={`size-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-90 text-brand-500" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                        </TableCell>

                        {/* Select Checkbox */}
                        <TableCell className="px-4 py-3.5">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleSelectOne(req.id)}
                          />
                        </TableCell>

                        {/* PR Code, Title & Item Count */}
                        <TableCell className="px-4 py-3.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/requisitions/view/${req.id}`}
                                className="font-bold text-xs text-brand-600 hover:underline dark:text-brand-400"
                              >
                                {req.requisitionCode}
                              </Link>
                              <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-medium rounded bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                {linesCount} {linesCount === 1 ? "item" : "items"}
                              </span>
                            </div>
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate max-w-xs">
                              {req.title}
                            </span>
                          </div>
                        </TableCell>

                        {/* Requester */}
                        <TableCell className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="size-7 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 flex items-center justify-center font-bold text-[10px]">
                              {(req.requesterName || "U")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                                {req.requesterName}
                              </span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                ID: {req.requesterId}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Need-By Date & Urgency Indicator */}
                        <TableCell className="px-4 py-3.5">
                          <div className="flex flex-col gap-1">
                            {getUrgencyBadge(req.requiredDate)}
                          </div>
                        </TableCell>

                        {/* Total Estimated Value */}
                        <TableCell className="px-4 py-3.5">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">
                            {formatAmount(req.totalAmount, req.currencyCode)}
                          </span>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="px-4 py-3.5">
                          <RequisitionStatusBadge status={req.status} size="sm" />
                        </TableCell>

                        {/* PO Reference */}
                        <TableCell className="px-4 py-3.5">
                          {isConverted && req.purchaseOrderCode ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                              <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              {req.purchaseOrderCode}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                          )}
                        </TableCell>

                        {/* Contextual Quick Actions */}
                        <TableCell className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">

                            {/* If Approved: Convert to Purchase Order Button */}
                            {canConvert && (
                              <button
                                type="button"
                                onClick={() => setConvertToPoRequisition(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:bg-purple-500/25 transition-colors"
                                title="Convert to Purchase Order"
                              >
                                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Convert to PO
                              </button>
                            )}

                            {/* If Draft: Quick Submit Button */}
                            {canSubmit && (
                              <button
                                type="button"
                                onClick={() => handleQuickSubmit(req)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 transition-colors"
                                title="Submit for Approval"
                              >
                                Submit
                              </button>
                            )}

                            {/* If Cancellable (Draft, Submitted, Approved): Quick Cancel Button */}
                            {canCancel && (
                              <button
                                type="button"
                                onClick={() => setRequisitionToCancel(req)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:text-gray-400 dark:hover:text-amber-400 dark:hover:bg-amber-500/15 transition-colors"
                                title="Cancel Requisition"
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </button>
                            )}

                            {/* View Details Link */}
                            <Link
                              to={`/requisitions/view/${req.id}`}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-brand-400 dark:hover:bg-gray-800 transition-colors"
                              title="View Details"
                            >
                              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>

                            {/* Edit Requisition Link (Draft & Submitted) or Locked Icon */}
                            {canEdit ? (
                              <Link
                                to={`/requisitions/edit/${req.id}`}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:text-gray-400 dark:hover:text-brand-400 dark:hover:bg-brand-500/15 transition-colors"
                                title="Edit Requisition"
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                            ) : (
                              <span
                                className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 cursor-not-allowed inline-flex items-center"
                                title={`Locked: Requisition is in ${req.status} status and cannot be modified`}
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              </span>
                            )}

                            {/* Delete Requisition (Draft, Rejected, Cancelled) */}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => setRequisitionToDelete(req)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-500/15 transition-colors"
                                title="Delete Requisition"
                              >
                                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Nested Line Items Row */}
                      {isExpanded && (
                        <TableRow className="bg-gray-50/75 dark:bg-gray-800/30 border-b border-gray-100 dark:border-white/[0.05]">
                          <TableCell className="p-0" />
                          <TableCell className="py-3 px-4" />
                          <TableCell className="py-3 px-4" colSpan={7}>
                            <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-inner dark:border-white/[0.07] dark:bg-gray-900/90">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                  <svg className="size-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                  </svg>
                                  Requisition Line Items ({linesCount})
                                </h5>
                                {req.justification && (
                                  <span className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                                    Justification: "{req.justification}"
                                  </span>
                                )}
                              </div>

                              {linesCount === 0 ? (
                                <p className="text-xs text-gray-400 italic py-2">
                                  No line items recorded for this requisition.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-xs">
                                    <thead>
                                      <tr className="text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                                        <th className="py-2 pr-3">Line #</th>
                                        <th className="py-2 px-3">Material Code</th>
                                        <th className="py-2 px-3">Description</th>
                                        <th className="py-2 px-3 text-right">Qty</th>
                                        <th className="py-2 px-3 text-right">Unit Price</th>
                                        <th className="py-2 px-3 text-right">Line Total</th>
                                        <th className="py-2 pl-3">Supplier</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                                      {req.lines.map((line, idx) => (
                                        <tr key={line.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                                          <td className="py-2 pr-3 font-medium text-gray-500">
                                            #{line.lineNumber ?? idx + 1}
                                          </td>
                                          <td className="py-2 px-3 font-semibold text-brand-600 dark:text-brand-400">
                                            {line.materialCode}
                                          </td>
                                          <td className="py-2 px-3 text-gray-800 dark:text-gray-200">
                                            {line.materialName}
                                          </td>
                                          <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-white">
                                            {line.quantity} {line.unitOfMeasure}
                                          </td>
                                          <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                                            {formatAmount(line.unitPrice, line.currencyCode || req.currencyCode)}
                                          </td>
                                          <td className="py-2 px-3 text-right font-bold text-gray-900 dark:text-white">
                                            {formatAmount(line.lineTotal, line.currencyCode || req.currencyCode)}
                                          </td>
                                          <td className="py-2 pl-3 text-gray-500 dark:text-gray-400">
                                            {line.supplierName || "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-t border-gray-100 dark:border-white/[0.07]">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold">{requisitions.length}</span> of{" "}
            <span className="font-semibold">{totalElements}</span> requisitions
            {selectedIds.length > 0 && (
              <span className="ml-2 font-medium text-brand-600 dark:text-brand-400">
                ({selectedIds.length} selected)
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setPage(p)}
            />
          )}
        </div>
      </div>

      {/* Convert to PO Confirmation Modal */}
      {convertToPoRequisition && (
        <DeleteConfirmModal
          isOpen={!!convertToPoRequisition}
          onClose={() => setConvertToPoRequisition(null)}
          onConfirm={handleConvertToPoConfirm}
          title="Convert Requisition to Purchase Order"
          message={`Are you sure you want to convert approved requisition ${convertToPoRequisition.requisitionCode} ("${convertToPoRequisition.title}") into an official Purchase Order? This will generate a new PO and advance the requisition status to CONVERTED.`}
          isDeleting={isConverting}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!requisitionToDelete}
        onClose={() => setRequisitionToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Requisition"
        message={`Are you sure you want to delete requisition ${requisitionToDelete?.requisitionCode}? This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Cancel Confirmation Modal */}
      {requisitionToCancel && (
        <RequisitionCancelModal
          isOpen={!!requisitionToCancel}
          onClose={() => setRequisitionToCancel(null)}
          requisition={requisitionToCancel}
          onConfirm={handleCancelConfirm}
          isLoading={isCancelling}
        />
      )}
    </div>
  );
}
