import React from "react";
import { Routes, Route } from "react-router-dom";
import RequisitionsPage from "./pages/RequisitionsPage";
import CreateRequisitionPage from "./pages/CreateRequisitionPage";

export default function RequisitionsRoutes() {
  return (
    <Routes>
      <Route path="" element={<RequisitionsPage />} />
      <Route path="list" element={<RequisitionsPage />} />
      <Route path="create" element={<CreateRequisitionPage />} />
      <Route path="create-requisition" element={<CreateRequisitionPage />} />
    </Routes>
  );
}
