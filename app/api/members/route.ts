// app/api/members/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { memberId: "asc" },
      select: {
        memberId: true,
        name: true,
        joinDate: true,
        annualLimit: true,
      },
    });

    return NextResponse.json({ members });
  } catch (error: any) {
    console.error("Members API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch members" },
      { status: 500 }
    );
  }
}
