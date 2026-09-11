import React from "react";
import { Routes, Route } from "react-router-dom";
import RequisitionsPage from "./pages/RequisitionsPage";

export default function RequisitionsRoutes() {
  return (
    <Routes>
      <Route path="" element={<RequisitionsPage />} />
      <Route path="list" element={<RequisitionsPage />} />
    </Routes>
  );
}
