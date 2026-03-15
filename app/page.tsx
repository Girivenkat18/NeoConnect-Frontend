import Link from "next/link";
import { ArrowRight, BellRing, ClipboardCheck, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10">
      <section className="grid gap-8 rounded-[2rem] border border-white/60 bg-white/70 p-8 shadow-xl backdrop-blur md:grid-cols-[1.4fr_1fr] md:p-12">
        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              A clear, trusted place for people to raise concerns and see what happens next.
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              NeoConnect helps teams submit issues safely, follow progress with confidence, read company updates, and stay informed about the actions being taken.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/login">
                Open Workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        <Card className="border-cyan-100 bg-slate-950 text-white">
          <CardHeader>
            <CardTitle>One shared source of truth</CardTitle>
            <CardDescription className="text-slate-300">
              Keep submissions, responses, updates, and decisions in one place so important follow-up never gets buried.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl bg-white/10 p-4">
              <MessageSquareWarning className="mb-2 h-5 w-5 text-cyan-300" />
              Private reporting with optional anonymity, attachments, and a clear reference number for every submission.
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <ClipboardCheck className="mb-2 h-5 w-5 text-cyan-300" />
              A structured workflow that keeps ownership, updates, and resolution history easy to follow.
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <BellRing className="mb-2 h-5 w-5 text-cyan-300" />
              Updates, minutes, polls, and change tracking that help people see how feedback is turning into action.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
