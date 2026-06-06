"use client";

import React from "react";
import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import { swaggerConfig } from "@/lib/swagger-config";

// Dynamically import SwaggerUI to prevent Server-Side Rendering issues
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="bg-white min-h-screen relative z-10 w-full overflow-y-auto">
      <div className="max-w-7xl mx-auto pt-10 pb-20">
        <SwaggerUI spec={swaggerConfig} />
      </div>
    </div>
  );
}
