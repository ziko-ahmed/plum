"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { IconSettings, IconShieldCheck, IconReceipt2, IconUser, IconHistory, IconCode } from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Adjudication Engine",
      href: "/",
      icon: <IconShieldCheck className="text-neutral-700 h-6 w-6 flex-shrink-0" />,
    },
    {
      label: "Policy Rules",
      href: "/policies",
      icon: <IconReceipt2 className="text-neutral-700 h-6 w-6 flex-shrink-0" />,
    },
    {
      label: "Claim History",
      href: "/claims",
      icon: <IconHistory className="text-neutral-700 h-6 w-6 flex-shrink-0" />,
    },
    {
      label: "API Docs",
      href: "/api-docs",
      icon: <IconCode className="text-neutral-700 h-6 w-6 flex-shrink-0" />,
    }
  ];

  return (
    <div className={cn("rounded-md flex flex-col md:flex-row bg-[#EEEEEE] w-full flex-1 w-full mx-auto overflow-hidden", "h-screen")}>
      <Sidebar open={open} setOpen={setOpen} animate={true}>
        <SidebarBody className="justify-between gap-10 bg-[#DDDDDD] border-r border-[#CCCCCC]">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            <Link
              href="/"
              className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20 mb-8"
            >
              <div className="h-6 w-6 bg-black rounded-br-lg rounded-tr-sm rounded-tl-lg rounded-bl-sm flex-shrink-0" />
              <span className="font-extrabold text-xl tracking-tighter text-black whitespace-pre">
                PLUM <span className="font-normal text-gray-400">| AI Pod</span>
              </span>
            </Link>
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: "Admin User",
                href: "#",
                icon: (
                  <IconUser className="text-neutral-700 h-6 w-6 flex-shrink-0" />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
      <div className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
