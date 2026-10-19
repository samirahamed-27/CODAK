'use client';

import * as React from "react";
import { TelegramHeader } from "@/components/ui/telegram-profile-header";

function DemoContent() {
  return (
    <div className="mt-8 px-4 space-y-4">
      <div className="h-8 w-full rounded-lg bg-zinc-800" />
      <div className="h-8 w-full rounded-lg bg-zinc-800" />
      <div className="overflow-hidden rounded-lg bg-zinc-800">
        {Array.from({ length: 5 }).map((_, index) => (
          <React.Fragment key={index}>
            <div className="h-8 w-full" />
            <div className="my-0 ml-12 h-[1px] bg-zinc-700" />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function DefaultDemo() {
  return (
    <div className="mx-auto w-full max-w-md h-[600px] overflow-hidden rounded-[30px] bg-zinc-950 border border-zinc-800 text-white">
      <div className="sticky top-0 bg-zinc-950 relative z-10">
        <TelegramHeader
          avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop"
          name="John Doe"
          phone="+1 234 567 8900"
          username="@johndoe"
          actionButton={{
            text: "Edit",
            onClick: () => console.log("Edit clicked"),
            backgroundColor: "#ffffff",
          }}
        />
        <DemoContent />
      </div>
    </div>
  );
}

export { DefaultDemo };
