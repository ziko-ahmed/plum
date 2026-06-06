"use client";

import React from 'react';
import { ShieldCheck, AlertTriangle, Clock, Activity, Stethoscope } from 'lucide-react';
import DotGrid from '@/components/ui/DotGrid';

export default function PoliciesPage() {
  return (
    <div className="relative min-h-screen text-gray-900 font-sans overflow-x-hidden bg-gray-50">
      {/* Lightfall background equivalent but with DotGrid */}
      <div className="fixed inset-0 z-0">
        <DotGrid
          dotSize={5}
          gap={15}
          baseColor="#e5e7eb"
          activeColor="#5227FF"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>

      <main className="relative z-10 p-6 md:p-12 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="mb-10 text-center bg-white/70 backdrop-blur-xl border border-gray-200 rounded-3xl p-10 shadow-sm">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-50 mb-4 border border-blue-100">
              <ShieldCheck size={32} className="text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
              Policy Guidelines & Rules
            </h1>
            <p className="text-gray-500 mt-3 font-medium text-lg">Comprehensive overview of internal adjudication rules and limits.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <Clock className="text-purple-500" size={28} />
                <h2 className="text-xl font-bold">Waiting Periods</h2>
              </div>
              <ul className="space-y-4 text-gray-600">
                <li className="flex gap-3">
                  <span className="font-bold text-gray-900 min-w-[120px]">Initial Period:</span>
                  <span>30 days after joining date (except for accidental injuries).</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-gray-900 min-w-[120px]">Diabetes:</span>
                  <span>90 days waiting period for related treatments.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-gray-900 min-w-[120px]">Hypertension:</span>
                  <span>90 days waiting period for related treatments.</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <Activity className="text-green-500" size={28} />
                <h2 className="text-xl font-bold">Financial Limits</h2>
              </div>
              <ul className="space-y-4 text-gray-600">
                <li className="flex gap-3">
                  <span className="font-bold text-gray-900 min-w-[120px]">Annual Limit:</span>
                  <span>₹50,000 per member.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-gray-900 min-w-[120px]">Per Claim Cap:</span>
                  <span>₹5,000 maximum payout per standard claim.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-gray-900 min-w-[120px]">Copayment:</span>
                  <span>10% flat deduction on all approved amounts.</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-4">
                <Stethoscope className="text-blue-500" size={28} />
                <h2 className="text-xl font-bold">Category Sub-limits</h2>
              </div>
              <ul className="space-y-4 text-gray-600">
                <li className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="font-bold text-gray-900">Dental Treatments</span>
                  <span className="text-blue-600 font-mono">₹10,000</span>
                </li>
                <li className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="font-bold text-gray-900">Vision/Optical</span>
                  <span className="text-blue-600 font-mono">₹5,000</span>
                </li>
                <li className="flex justify-between">
                  <span className="font-bold text-gray-900">Physiotherapy</span>
                  <span className="text-blue-600 font-mono">₹15,000</span>
                </li>
              </ul>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-red-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center gap-4 mb-6 border-b border-red-50 pb-4">
                <AlertTriangle className="text-red-500" size={28} />
                <h2 className="text-xl font-bold text-red-900">Strict Rejections</h2>
              </div>
              <ul className="space-y-4 text-gray-600">
                <li className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-2"></span>
                  <span>Claims submitted <strong>more than 30 days</strong> after treatment.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-2"></span>
                  <span>Missing doctor registration number on bills.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-2"></span>
                  <span>Cosmetic or aesthetic procedures.</span>
                </li>
                <li className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-2"></span>
                  <span>Amount below minimum threshold (₹200).</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
