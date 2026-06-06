// app/api/adjudicate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { runAdjudication } from "@/lib/adjudication/engine";
import { DocumentType, ClaimStatus, Decision } from '@prisma/client';
import type { ClaimInput, AdjudicationInput } from "@/types";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const claimData = body as ClaimInput;

        // 1. Lookup the Member from the database — source of truth for joinDate
        const member = await prisma.member.findUnique({
            where: { memberId: claimData.memberId }
        });

        if (!member) {
            return NextResponse.json(
                { error: `Member '${claimData.memberId}' not found in the system.` },
                { status: 404 }
            );
        }

        // 2. Auto-count previous claims submitted by this member on the same treatment day
        const treatmentDay = new Date(claimData.treatmentDate);
        const startOfDay = new Date(treatmentDay.getFullYear(), treatmentDay.getMonth(), treatmentDay.getDate());
        const endOfDay = new Date(startOfDay.getTime() + 86400000);

        const previousClaimsCount = await prisma.claim.count({
            where: {
                memberId: claimData.memberId,
                treatmentDate: { gte: startOfDay, lt: endOfDay },
            }
        });

        // 3. Query year-to-date approved total for annual limit enforcement
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const ytdAgg = await prisma.adjudication.aggregate({
            _sum: { approvedAmount: true },
            where: {
                claim: {
                    memberId: claimData.memberId,
                    createdAt: { gte: yearStart },
                },
                decision: { in: ['APPROVED', 'PARTIAL'] },
            },
        });
        const annualClaimsTotal = ytdAgg._sum.approvedAmount || 0;
         
        const engineInput: AdjudicationInput = {
            memberId: claimData.memberId,
            memberName: claimData.memberName,
            treatmentDate: new Date(claimData.treatmentDate),
            claimAmount: claimData.claimAmount,
            hospital: claimData.hospital || null,
            cashlessRequest: claimData.cashlessRequest || false,
            memberJoinDate: member.joinDate, // from DB, not frontend
            previousClaimsSameDay: previousClaimsCount, // auto-calculated from DB
            annualClaimsTotal, // YTD approved total from DB
            documents: claimData.documents.map((doc) => ({
                type: doc.type,
                diagnosis: doc.extractedData.diagnosis || null,
                doctorName: doc.extractedData.doctorName || null,
                doctorReg: doc.extractedData.doctorRegistrationNumber || null,
                medicines: doc.extractedData.medicines || [],
                procedures: doc.extractedData.procedures || [],
                tests: doc.extractedData.testsOrdered || [],
                lineItems: doc.extractedData.lineItems || [],
                totalAmount: doc.extractedData.totalAmount || null,
                confidence: doc.extractedData.confidence || 1.0,
                hasStamp: doc.extractedData.hasStamp,
                hasSignature: doc.extractedData.hasSignature,
            })),
        };

        // 3. Save Claim and Documents to DB
        const claim = await prisma.claim.create({
            data: {
                memberId: claimData.memberId,
                memberName: claimData.memberName,
                treatmentDate: new Date(claimData.treatmentDate),
                claimAmount: claimData.claimAmount,
                hospital: claimData.hospital,
                cashlessRequest: claimData.cashlessRequest || false,
                memberJoinDate: member.joinDate, // from DB
                previousClaimsSameDay: previousClaimsCount,
                status: ClaimStatus.PROCESSING,
                documents: {
                    create: claimData.documents.map((doc) => {
                        const docTypeStr = (doc.type || "OTHER").toUpperCase();
                        const finalDocType = Object.values(DocumentType).includes(docTypeStr as any) 
                            ? (docTypeStr as DocumentType) 
                            : DocumentType.OTHER;

                        return {
                            documentType: finalDocType,
                            fileName: "uploaded_document.jpg", // Mock filename for now
                            mimeType: "application/json",
                            parsedData: doc.extractedData as any
                        };
                    })
                }
            }
        });

        // 4. Run your Business Rules
        const result = await runAdjudication(engineInput);

        // 5. Save Adjudication Results to DB
        const adjudication = await prisma.adjudication.create({
            data: {
                claimId: claim.id,
                decision: result.decision as Decision,
                approvedAmount: result.approvedAmount,
                rejectedItems: result.rejectedItems || [],
                rejectionReasons: result.rejectionReasons || [],
                deduction: result.deduction as any, 
                confidenceScore: result.confidenceScore,
                flags: result.flags || [],
                notes: result.notes,
                nextSteps: result.nextSteps,
                aiReasoning: result.aiReasoning,
                networkDiscount: result.deduction?.networkDiscount || 0
            }
        });

        // 6. Update the parent claim with the final status
        await prisma.claim.update({
            where: { id: claim.id },
            data: { status: result.decision as ClaimStatus }
        });

        return NextResponse.json({ success: true, result, claimId: claim.id });

    } catch (error: any) {  
        console.error("Adjudication API Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to adjudicate the claim and save to database" },
            { status: 500 }
        );
    }
}