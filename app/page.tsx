"use client";

import { useState, useEffect } from "react";
import DotGrid from "@/components/ui/DotGrid";
import Button3D from "@/components/ui/Button3D";
import Loader from "@/components/ui/Loader";
import UploadInput from "@/components/ui/UploadInput";
import { TextAnimate } from "@/components/ui/text-animate";
import { Upload, FileText, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";

type AppState = "IDLE" | "EXTRACTING" | "REVIEW" | "ADJUDICATING" | "RESULT";
type MemberInfo = { memberId: string; name: string; joinDate: string; annualLimit: number };

// Helper function to prevent Gemini API Rate Limits (429 Error)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function ClaimAdjudicator() {
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [extractedDocs, setExtractedDocs] = useState<any[]>([]); 
  const [adjudicationResult, setAdjudicationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>("");

  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [memberId, setMemberId] = useState<string>("");
  const [cashlessRequest, setCashlessRequest] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/members')
      .then(res => res.json())
      .then(data => {
        if (data.members) {
          setMembers(data.members);
          if (data.members.length > 0) setMemberId(data.members[0].memberId);
        }
      })
      .catch(console.error);
  }, []);

  const selectedMember = members.find(m => m.memberId === memberId);

  const resetApp = () => {
    setAppState("IDLE");
    setExtractedDocs([]);
    setAdjudicationResult(null);
    setError(null);
    setProgressMsg("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setAppState("EXTRACTING");
    setError(null);
    
    const processedDocs = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgressMsg(`Extracting document ${i + 1} of ${files.length}: ${file.name}`);
      
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        
        if (!data.success) throw new Error(`AI Extraction failed for ${file.name}`);

        processedDocs.push({
           ...data.data,
           fileName: file.name
        });

        if (i < files.length - 1) {
          setProgressMsg(`Cooling down API for 4 seconds...`);
          await sleep(4000);
        }

      } catch (err: any) {
        setError(`Failed on ${file.name}: ${err.message}`);
        setAppState("IDLE");
        return; 
      }
    }

    setExtractedDocs(processedDocs);
    setAppState("REVIEW");
  };

  const runAdjudication = async () => {
    setAppState("ADJUDICATING");
    setError(null);

    const patientName = extractedDocs.find(d => d.patientName)?.patientName || "Unknown Patient";
    const treatmentDate = extractedDocs.find(d => d.treatmentDate)?.treatmentDate || new Date().toISOString().split('T')[0];
    const hospitalName = extractedDocs.find(d => d.clinicName)?.clinicName || "Unknown Facility";
    
    const totalClaimAmount = extractedDocs.reduce((sum, doc) => sum + (doc.totalAmount || 0), 0);

    const adjudicatePayload = {
      memberId: memberId,
      memberName: patientName,
      treatmentDate: treatmentDate,
      claimAmount: totalClaimAmount,
      hospital: hospitalName,
      cashlessRequest: cashlessRequest,
      documents: extractedDocs.map(doc => ({
        type: doc.documentType || "OTHER",
        extractedData: doc
      }))
    };

    try {
      const res = await fetch("/api/adjudicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adjudicatePayload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Adjudication Engine failed (${res.status})`);
      
      setAdjudicationResult(data);
      setAppState("RESULT");
    } catch (err: any) {
      setError(err.message);
      setAppState("REVIEW");
    }
  };

  return (
    <div className="relative min-h-screen text-gray-900 font-sans overflow-x-hidden bg-gray-50">
      {/* DotGrid Background */}
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

      {/* Main Content Overlay */}
      <main className="relative z-10 p-6 md:p-12 min-h-screen flex items-center justify-center">
        <div className="max-w-6xl w-full mx-auto backdrop-blur-xl bg-white/70 border border-gray-200 rounded-3xl shadow-xl overflow-hidden p-8 md:p-12 transition-all duration-500">
          
          <header className="mb-10 text-center flex flex-col items-center">
            <TextAnimate 
               animation="slideUp"
               by="word"
               className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#CB2957]"
            >
              AI Adjudication Engine
            </TextAnimate>
            <p className="text-gray-600 mt-3 font-medium text-lg">Intelligent policy enforcement & claim processing</p>
          </header>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 font-mono text-sm border border-red-200 flex items-start gap-3">
              <AlertTriangle className="shrink-0 mt-0.5" size={18} />
              <span>{error}</span>
            </div>
          )}

          {appState === "IDLE" && (
            <div className="flex flex-col items-center justify-center py-10">
              <UploadInput 
                 multiple 
                 accept="image/jpeg, image/png, application/pdf" 
                 onChange={handleFileUpload} 
              />
              <p className="text-gray-500 mt-8 text-sm font-medium">Select multiple files to extract</p>
            </div>
          )}

          {appState === "EXTRACTING" && (
            <div className="bg-white border border-gray-200 rounded-3xl p-20 flex flex-col items-center justify-center text-center animate-pulse shadow-sm">
              <Loader />
              <h3 className="text-2xl font-bold tracking-tight text-gray-900 mb-2 mt-4">Analyzing Documents</h3>
              <p className="text-gray-500 font-medium text-sm">{progressMsg}</p>
            </div>
          )}

          {appState === "REVIEW" && extractedDocs.length > 0 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <h2 className="text-2xl font-bold tracking-tight mb-6 flex items-center gap-3 text-gray-900">
                  <FileText className="text-purple-600" /> 
                  Extracted Data
                </h2>
                
                <div className="space-y-4 mb-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {extractedDocs.map((doc, idx) => (
                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 hover:border-gray-300 transition-colors">
                      <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                         <span className="font-bold text-sm text-gray-800">{doc.fileName}</span>
                         <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-3 py-1 rounded-full border border-purple-200">
                           {doc.documentType}
                         </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                         <div>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Patient</p>
                           <p className="text-sm font-medium text-gray-900">{doc.patientName || '-'}</p>
                         </div>
                         <div>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Date</p>
                           <p className="text-sm font-medium text-gray-900">{doc.treatmentDate || '-'}</p>
                         </div>
                         <div>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Amount</p>
                           <p className="text-sm font-medium text-green-700">₹{doc.totalAmount || 0}</p>
                         </div>
                         <div>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Confidence</p>
                           <p className="text-sm font-medium text-blue-700">{Math.round((doc.confidence || 0) * 100)}%</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-200">
                         <div>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Provider & Clinic</p>
                           <p className="text-sm font-medium text-gray-900">{doc.doctorName || 'Unknown Doctor'}</p>
                           <p className="text-xs text-gray-600">{doc.clinicName || 'Unknown Clinic'}</p>
                           {doc.doctorRegistrationNumber && <p className="text-[10px] text-gray-400 mt-1">Reg: {doc.doctorRegistrationNumber}</p>}
                         </div>
                         <div>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Diagnosis</p>
                           <p className="text-sm font-medium text-gray-900">{doc.diagnosis || '-'}</p>
                         </div>
                         <div>
                           <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Verification</p>
                           <div className="flex gap-2">
                              {doc.hasStamp ? <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-sm">STAMPED</span> : <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-sm">NO STAMP</span>}
                              {doc.hasSignature ? <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-sm">SIGNED</span> : <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-sm">UNSIGNED</span>}
                           </div>
                         </div>
                      </div>

                      {(doc.medicines?.length > 0 || doc.testsOrdered?.length > 0 || doc.procedures?.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 pt-4 border-t border-gray-200">
                           {doc.medicines?.length > 0 && (
                             <div>
                               <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Medicines</p>
                               <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                                 {doc.medicines.map((m: string, i: number) => <li key={i}>{m}</li>)}
                               </ul>
                             </div>
                           )}
                           {doc.testsOrdered?.length > 0 && (
                             <div>
                               <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Tests Ordered</p>
                               <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                                 {doc.testsOrdered.map((t: string, i: number) => <li key={i}>{t}</li>)}
                               </ul>
                             </div>
                           )}
                           {doc.procedures?.length > 0 && (
                             <div>
                               <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Procedures</p>
                               <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1">
                                 {doc.procedures.map((p: string, i: number) => <li key={i}>{p}</li>)}
                               </ul>
                             </div>
                           )}
                        </div>
                      )}
                      
                      {doc.lineItems?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Line Items</p>
                          <div className="space-y-1">
                            {doc.lineItems.map((item: any, i: number) => (
                              <div key={i} className="flex justify-between text-xs text-gray-700">
                                <span>{item.description}</span>
                                <span className="font-medium">₹{item.amount}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Member Lookup Panel */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-100 rounded-3xl p-8 shadow-sm">
                <h3 className="text-xl font-bold mb-6 text-gray-900">Claim Configuration</h3>
                
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-widest">Select Member Profile</label>
                    <select
                      value={memberId}
                      onChange={(e) => setMemberId(e.target.value)}
                      className="w-full p-4 rounded-xl border border-gray-300 bg-white text-gray-900 font-medium focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                    >
                      {members.length === 0 && <option value="">Loading members...</option>}
                      {members.map((m) => (
                        <option key={m.memberId} value={m.memberId}>
                          {m.memberId} — {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedMember && (
                    <div className="grid grid-cols-3 gap-4 bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                      <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Member ID</span>
                        <span className="font-mono text-sm text-gray-900">{selectedMember.memberId}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Join Date</span>
                        <span className="font-mono text-sm text-gray-900">{new Date(selectedMember.joinDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Annual Limit</span>
                        <span className="font-mono text-sm text-green-700">₹{selectedMember.annualLimit.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center pt-2">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                      <div className="relative flex items-center justify-center">
                        <input type="checkbox" checked={cashlessRequest} onChange={(e) => setCashlessRequest(e.target.checked)} className="peer sr-only" />
                        <div className="w-6 h-6 border-2 border-gray-300 rounded-md peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-colors"></div>
                        <CheckCircle size={16} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-sm font-bold text-gray-700 uppercase tracking-widest group-hover:text-gray-900 transition-colors">Request Cashless Processing</span>
                    </label>
                  </div>
                </div>
                
                <div className="pt-2">
                  <Button3D onClick={runAdjudication}>
                    Run Adjudication Engine
                  </Button3D>
                </div>
              </div>
            </div>
          )}

          {appState === "ADJUDICATING" && (
             <div className="bg-white border border-gray-200 rounded-3xl p-24 flex flex-col items-center justify-center text-center animate-pulse shadow-sm">
               <Loader />
               <h3 className="text-2xl font-bold tracking-tight mb-2 text-gray-900 mt-4">Enforcing Policy Rules</h3>
               <p className="text-gray-500 font-mono text-sm mt-2">Checking limits, waiting periods, and fraud signals...</p>
             </div>
          )}

          {appState === "RESULT" && adjudicationResult && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className={`rounded-3xl border overflow-hidden shadow-xl bg-white ${
                adjudicationResult.result?.decision === 'APPROVED' 
                  ? 'border-green-200' 
                  : adjudicationResult.result?.decision === 'PARTIAL'
                    ? 'border-yellow-200'
                    : 'border-red-200'
              }`}>
                
                <div className={`p-10 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
                  adjudicationResult.result?.decision === 'APPROVED' 
                  ? 'bg-green-50/50 border-green-100' 
                  : adjudicationResult.result?.decision === 'PARTIAL'
                    ? 'bg-yellow-50/50 border-yellow-100'
                    : 'bg-red-50/50 border-red-100'
                }`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {adjudicationResult.result?.decision === 'APPROVED' && <CheckCircle className="text-green-600" size={32} />}
                      {adjudicationResult.result?.decision === 'PARTIAL' && <AlertTriangle className="text-yellow-600" size={32} />}
                      {adjudicationResult.result?.decision === 'REJECTED' && <AlertTriangle className="text-red-600" size={32} />}
                      <h2 className={`text-4xl font-extrabold tracking-tight ${
                        adjudicationResult.result?.decision === 'APPROVED' ? 'text-green-800' :
                        adjudicationResult.result?.decision === 'PARTIAL' ? 'text-yellow-800' : 'text-red-800'
                      }`}>
                        {adjudicationResult.result?.decision || "UNKNOWN"}
                      </h2>
                    </div>
                    <p className="font-mono text-sm text-gray-500 pl-11">
                      Claim ID: {adjudicationResult.claimId}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm text-center min-w-[150px]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Approved Amount</p>
                    <p className={`text-3xl font-bold ${adjudicationResult.result?.decision === 'APPROVED' ? 'text-green-600' : 'text-gray-900'}`}>
                      ₹{adjudicationResult.result?.approvedAmount || 0}
                    </p>
                  </div>
                </div>
                
                <div className="p-10 space-y-8">
                  {/* AI Reasoning */}
                  <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-purple-700 mb-3">AI Reasoning</h3>
                    <p className="text-gray-800 leading-relaxed">{adjudicationResult.result?.aiReasoning}</p>
                    
                    {adjudicationResult.result?.notes && (
                      <p className="text-gray-600 text-sm mt-4 pt-4 border-t border-purple-200">
                        <strong>Internal Notes:</strong> {adjudicationResult.result.notes}
                      </p>
                    )}
                  </div>

                  {/* Deductions & Rejections */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4">Financial Breakdown</h3>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="text-gray-600">Copay (10%)</span>
                          <span className="text-red-600 font-medium">-₹{adjudicationResult.result?.deduction?.copay || 0}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                          <span className="text-gray-600">Network Discount</span>
                          <span className="text-red-600 font-medium">-₹{adjudicationResult.result?.deduction?.networkDiscount || 0}</span>
                        </div>
                      </div>
                    </div>

                    {(adjudicationResult.result?.rejectionReasons?.length > 0 || adjudicationResult.result?.rejectedItems?.length > 0) && (
                      <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-red-700 mb-4">Rejections & Exclusions</h3>
                        <ul className="space-y-2 text-sm text-red-800 list-disc pl-4">
                          {adjudicationResult.result.rejectionReasons?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                          {adjudicationResult.result.rejectedItems?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
                     <ShieldCheck className="text-blue-600 shrink-0" size={24} />
                     <div>
                       <h3 className="text-sm font-bold uppercase tracking-widest text-blue-800 mb-1">Next Steps</h3>
                       <p className="text-blue-900/80 text-sm">{adjudicationResult.result?.nextSteps}</p>
                     </div>
                  </div>
                </div>
                
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <Button3D onClick={resetApp}>
                    Process New Claim
                  </Button3D>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2); 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2); 
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.4); 
        }
      `}</style>
    </div>
  );
}