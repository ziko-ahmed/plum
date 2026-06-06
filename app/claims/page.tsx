"use client";
import React, { useEffect, useState } from "react";
import DotGrid from "@/components/ui/DotGrid";
import { CheckCircle, AlertTriangle, Clock, FileText } from "lucide-react";

export default function ClaimsHistoryPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const res = await fetch("/api/claims");
        if (res.ok) {
          const data = await res.json();
          setClaims(data);
        }
      } catch (err) {
        console.error("Failed to fetch claims:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchClaims();
  }, []);

  return (
    <div className="min-h-screen bg-[#EEEEEE] text-gray-900 font-sans selection:bg-purple-200 selection:text-purple-900 relative">
      <div className="absolute inset-0 overflow-hidden z-0">
        <DotGrid
          dotSize={5}
          gap={15}
          baseColor="#DDDDDD"
          activeColor="#CB2957"
          proximity={120}
          speedTrigger={100}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      <main className="relative z-10 p-6 md:p-12 min-h-screen flex items-start justify-center pt-16">
        <div className="max-w-5xl w-full mx-auto backdrop-blur-xl bg-white/70 border border-gray-200 rounded-3xl shadow-xl overflow-hidden p-8 md:p-12 transition-all duration-500">
          
          <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 mb-2">Claim History</h1>
              <p className="text-gray-600 font-medium text-sm">Review previously adjudicated claims and AI decisions.</p>
            </div>
            <div className="mt-4 md:mt-0 px-4 py-2 bg-gray-100 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 flex items-center gap-2 shadow-sm">
              <FileText size={16} className="text-[#CB2957]" />
              Total Claims: {claims.length}
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CB2957]"></div>
            </div>
          ) : claims.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">No Claims Found</h3>
              <p className="text-gray-500 text-sm mt-2">Any claims processed by the AI Adjudicator will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim) => (
                <div key={claim.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{claim.memberName}</h3>
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">ID: {claim.memberId}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">Claimed on: {new Date(claim.createdAt).toLocaleString()}</p>
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end">
                      <div className="flex items-center gap-2 mb-1">
                        {claim.status === 'APPROVED' && <span className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-full"><CheckCircle size={12} /> APPROVED</span>}
                        {claim.status === 'PARTIAL' && <span className="flex items-center gap-1 text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 px-3 py-1 rounded-full"><AlertTriangle size={12} /> PARTIAL</span>}
                        {claim.status === 'REJECTED' && <span className="flex items-center gap-1 text-xs font-bold bg-red-100 text-red-800 border border-red-200 px-3 py-1 rounded-full"><AlertTriangle size={12} /> REJECTED</span>}
                        {claim.status === 'PENDING' && <span className="flex items-center gap-1 text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 px-3 py-1 rounded-full"><Clock size={12} /> PENDING</span>}
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mt-1">Status</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Claim Amount</p>
                      <p className="font-bold text-gray-900">₹{claim.claimAmount?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Approved Amount</p>
                      <p className={`font-bold ${claim.status === 'APPROVED' ? 'text-green-600' : claim.status === 'PARTIAL' ? 'text-yellow-600' : 'text-gray-900'}`}>
                        ₹{claim.adjudication?.approvedAmount?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                       <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">AI Reasoning Summary</p>
                       <p className="text-xs text-gray-700 line-clamp-2">{claim.adjudication?.aiReasoning || 'No reasoning available.'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
