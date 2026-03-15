"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, Bell, FileText, Flag, LayoutDashboard, LogOut, Plus, Search, Shield, Upload, UserCog, Vote } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CASE_CATEGORIES, CASE_SEVERITIES, CASE_STATUSES } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function toApiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

type User = {
  id: string;
  name: string;
  email: string;
  role: "staff" | "secretariat" | "case_manager" | "admin";
  department: string;
};

type CaseItem = {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  department: string;
  location: string;
  severity: string;
  anonymous: boolean;
  submitterName: string | null;
  status: string;
  assignedToId: string | null;
  assignedAt: string | null;
  lastResponseAt: string | null;
  escalatedAt: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  caseManagerName: string | null;
};

type CaseNote = {
  id: string;
  body: string;
  status_after: string | null;
  created_at: string;
  author_name: string;
};

type Poll = {
  id: string;
  question: string;
  createdAt: string;
  createdByName: string;
  totalVotes: number;
  myVote: number | null;
  options: Array<{ label: string; votes: number }>;
};

type PublicHubData = {
  digests: Array<{ id: string; title: string; summary: string; published_at: string }>;
  impacts: Array<{ id: string; raised: string; action_taken: string; changed: string }>;
  announcements: Array<{ id: string; title: string; body: string; created_at: string }>;
  minutes: Array<{ id: string; title: string; description: string; file_path: string; original_name: string; uploaded_by_name: string; created_at: string }>;
};

type AnalyticsData = {
  openByDepartment: Array<{ department: string; total: number }>;
  byStatus: Array<{ label: string; total: number }>;
  byCategory: Array<{ label: string; total: number }>;
  byDepartment: Array<{ label: string; total: number }>;
  hotspots: Array<{ department: string; category: string; total: number }>;
};

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  active: number;
  created_at: string;
};

function statusBadgeVariant(status: string) {
  if (status === "Escalated") return "destructive";
  if (status === "Resolved") return "secondary";
  return "outline";
}

function StatCard({ title, value, subtitle }: { title: string; value: number | string; subtitle: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">{subtitle}</CardContent>
    </Card>
  );
}

export function DashboardApp() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [hub, setHub] = useState<PublicHubData>({ digests: [], impacts: [], announcements: [], minutes: [] });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [caseManagers, setCaseManagers] = useState<Array<{ id: string; name: string; department: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchMinutes, setSearchMinutes] = useState("");
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [selectedCaseNotes, setSelectedCaseNotes] = useState<CaseNote[]>([]);
  const [caseDetailLoading, setCaseDetailLoading] = useState(false);

  const [submissionForm, setSubmissionForm] = useState({
    title: "",
    description: "",
    category: "Safety",
    department: user?.department ?? "",
    location: "",
    severity: "Medium",
    anonymous: false,
    attachment: null as File | null,
  });
  const [noteForm, setNoteForm] = useState({ body: "", status: "In Progress" });
  const [assignToId, setAssignToId] = useState("");
  const [pollForm, setPollForm] = useState({ question: "", optionsText: "Option 1\nOption 2" });
  const [digestForm, setDigestForm] = useState({ title: "", summary: "", caseId: "" });
  const [impactForm, setImpactForm] = useState({ raised: "", actionTaken: "", changed: "", caseId: "" });
  const [announcementForm, setAnnouncementForm] = useState({ title: "", body: "" });
  const [minutesForm, setMinutesForm] = useState({ title: "", description: "", file: null as File | null });
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "staff", department: "" });

  const openCases = useMemo(() => cases.filter((item) => item.status !== "Resolved"), [cases]);
  const escalatedCases = useMemo(() => cases.filter((item) => item.status === "Escalated"), [cases]);

  async function api<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(toApiUrl(url), {
      credentials: "include",
      ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    return data as T;
  }

  async function loadCases() {
    const response = await api<{ cases: CaseItem[] }>("/api/cases");
    setCases(response.cases);
  }

  async function loadPolls() {
    const response = await api<{ polls: Poll[] }>("/api/polls");
    setPolls(response.polls);
  }

  async function loadHub(query = "") {
    const response = await api<PublicHubData>(`/api/public-hub${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setHub(response);
  }

  async function loadAnalytics() {
    try {
      const response = await api<AnalyticsData>("/api/analytics");
      setAnalytics(response);
    } catch {
      setAnalytics(null);
    }
  }

  async function loadUsers() {
    try {
      const response = await api<{ users: ManagedUser[] }>("/api/users");
      setUsers(response.users);
    } catch {
      setUsers([]);
    }
  }

  async function loadCaseManagers() {
    try {
      const response = await api<{ users: Array<{ id: string; name: string; department: string }> }>("/api/case-managers");
      setCaseManagers(response.users);
    } catch {
      setCaseManagers([]);
    }
  }

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        const meResponse = await api<{ user: User }>("/api/auth/me");
        if (!mounted) return;

        setUser(meResponse.user);
        setSubmissionForm((current) => ({ ...current, department: meResponse.user.department }));

        const requests: Array<Promise<unknown>> = [
          api<{ cases: CaseItem[] }>("/api/cases"),
          api<{ polls: Poll[] }>("/api/polls"),
          api<PublicHubData>("/api/public-hub"),
        ];

        if (meResponse.user.role === "secretariat" || meResponse.user.role === "admin") {
          requests.push(api<AnalyticsData>("/api/analytics"));
          requests.push(api<{ users: ManagedUser[] }>("/api/users"));
          requests.push(api<{ users: Array<{ id: string; name: string; department: string }> }>("/api/case-managers"));
        } else {
          requests.push(Promise.resolve(null));
          requests.push(Promise.resolve({ users: [] }));
          requests.push(Promise.resolve({ users: [] }));
        }

        const [casesResponse, pollsResponse, hubResponse, analyticsResponse, usersResponse, managersResponse] = await Promise.all(requests);
        if (!mounted) return;

        setCases((casesResponse as { cases: CaseItem[] }).cases);
        setPolls((pollsResponse as { polls: Poll[] }).polls);
        setHub(hubResponse as PublicHubData);
        setAnalytics((analyticsResponse as AnalyticsData | null) ?? null);
        setUsers(((usersResponse as { users: ManagedUser[] })?.users) ?? []);
        setCaseManagers(((managersResponse as { users: Array<{ id: string; name: string; department: string }> })?.users) ?? []);
        setLoading(false);
      } catch {
        router.replace("/login");
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function openCase(caseItem: CaseItem) {
    setSelectedCase(caseItem);
    setAssignToId(caseItem.assignedToId ? String(caseItem.assignedToId) : "");
    setNoteForm({ body: "", status: caseItem.status === "New" ? "In Progress" : caseItem.status });
    setCaseDetailLoading(true);
    try {
      const response = await api<{ case: CaseItem; notes: CaseNote[] }>(`/api/cases/${caseItem.id}`);
      setSelectedCase(response.case);
      setSelectedCaseNotes(response.notes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load case.");
    } finally {
      setCaseDetailLoading(false);
    }
  }

  async function submitCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(submissionForm).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        if (key === "attachment") {
          if (value) formData.append("attachment", value as File);
        } else {
          formData.append(key, String(value));
        }
      });
      await api("/api/cases", { method: "POST", body: formData });
      toast.success("Case submitted successfully.");
      setSubmissionForm({
        title: "",
        description: "",
        category: "Safety",
        department: user?.department ?? "",
        location: "",
        severity: "Medium",
        anonymous: false,
        attachment: null,
      });
      await loadCases();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit case.");
    }
  }

  async function assignCase() {
    if (!selectedCase || !assignToId) return;
    try {
      await api(`/api/cases/${selectedCase.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: assignToId }),
      });
      toast.success("Case assigned.");
      await Promise.all([loadCases(), openCase(selectedCase)]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not assign case.");
    }
  }

  async function addNote() {
    if (!selectedCase) return;
    try {
      await api(`/api/cases/${selectedCase.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noteForm),
      });
      toast.success("Case updated.");
      await Promise.all([loadCases(), openCase(selectedCase), loadAnalytics()]);
      setNoteForm({ body: "", status: selectedCase.status });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update case.");
    }
  }

  async function createPoll(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: pollForm.question,
          options: pollForm.optionsText.split("\n").map((option) => option.trim()).filter(Boolean),
        }),
      });
      toast.success("Poll created.");
      setPollForm({ question: "", optionsText: "Option 1\nOption 2" });
      await loadPolls();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create poll.");
    }
  }

  async function vote(pollId: string, optionIndex: number) {
    try {
      await api(`/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
      toast.success("Vote submitted.");
      await loadPolls();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit vote.");
    }
  }

  async function createDigest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/public-hub/digests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...digestForm, caseId: digestForm.caseId || undefined }),
      });
      toast.success("Quarterly digest entry published.");
      setDigestForm({ title: "", summary: "", caseId: "" });
      await loadHub(searchMinutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish digest.");
    }
  }

  async function createImpact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/public-hub/impacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...impactForm, caseId: impactForm.caseId || undefined }),
      });
      toast.success("Impact row added.");
      setImpactForm({ raised: "", actionTaken: "", changed: "", caseId: "" });
      await loadHub(searchMinutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add impact row.");
    }
  }

  async function createAnnouncement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/public-hub/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announcementForm),
      });
      toast.success("Announcement posted.");
      setAnnouncementForm({ title: "", body: "" });
      await loadHub(searchMinutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post announcement.");
    }
  }

  async function uploadMinutes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!minutesForm.file) {
      toast.error("Please attach a PDF.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("title", minutesForm.title);
      formData.append("description", minutesForm.description);
      formData.append("file", minutesForm.file);
      await api("/api/public-hub/minutes", {
        method: "POST",
        body: formData,
      });
      toast.success("Minutes uploaded.");
      setMinutesForm({ title: "", description: "", file: null });
      await loadHub(searchMinutes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload minutes.");
    }
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userForm),
      });
      toast.success("User account created.");
      setUserForm({ name: "", email: "", password: "", role: "staff", department: "" });
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create user.");
    }
  }

  async function toggleUser(userId: string) {
    try {
      await api(`/api/users/${userId}/toggle`, { method: "PATCH" });
      toast.success("User status updated.");
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update user.");
    }
  }

  async function logout() {
    await fetch(toApiUrl("/api/auth/logout"), { method: "POST", credentials: "include" });
    router.replace("/login");
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading NeoConnect...</div>;
  }

  const canManageCases = user.role === "secretariat" || user.role === "case_manager" || user.role === "admin";
  const canManageHub = user.role === "secretariat" || user.role === "admin";
  const canSeeAnalytics = user.role === "secretariat" || user.role === "admin";
  const canManageUsers = user.role === "admin";

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 rounded-[1.75rem] border border-white/60 bg-white/75 p-6 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-700">NeoConnect</div>
          <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {user.name}</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium capitalize">{user.role.replace("_", " ")}</span> in {user.department}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {user.role.replace("_", " ")}
          </Badge>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
          <Button variant="ghost" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="submit">
            <Plus className="mr-2 h-4 w-4" />
            Submit
          </TabsTrigger>
          <TabsTrigger value="cases">
            <Shield className="mr-2 h-4 w-4" />
            Cases
          </TabsTrigger>
          <TabsTrigger value="polls">
            <Vote className="mr-2 h-4 w-4" />
            Polls
          </TabsTrigger>
          <TabsTrigger value="hub">
            <FileText className="mr-2 h-4 w-4" />
            Public Hub
          </TabsTrigger>
          {canSeeAnalytics && (
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
          )}
          {canManageUsers && (
            <TabsTrigger value="admin">
              <UserCog className="mr-2 h-4 w-4" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Cases in view" value={cases.length} subtitle="The items currently available to you." />
            <StatCard title="Open cases" value={openCases.length} subtitle="Anything not yet resolved." />
            <StatCard title="Escalated" value={escalatedCases.length} subtitle="7-working-day rule triggered." />
            <StatCard title="Active polls" value={polls.length} subtitle="One vote per staff member enforced." />
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recent cases</CardTitle>
                <CardDescription>Tracking IDs, assignees, and status stay visible so nothing gets lost.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {cases.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-start justify-between rounded-xl border p-4 text-left transition hover:bg-slate-50"
                    onClick={() => openCase(item)}
                  >
                    <div>
                      <div className="font-medium">{item.trackingId}</div>
                      <div className="text-sm text-muted-foreground">{item.title}</div>
                    </div>
                    <Badge variant={statusBadgeVariant(item.status) as any}>{item.status}</Badge>
                  </button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Staff-facing transparency</CardTitle>
                <CardDescription>Announcements, quarterly digests, impacts, and meeting minutes stay visible to all staff.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {hub.announcements.slice(0, 3).map((announcement) => (
                  <div key={announcement.id} className="rounded-xl border p-4">
                    <div className="font-medium">{announcement.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{announcement.body}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="submit">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Feedback & Complaint Submission</CardTitle>
              <CardDescription>
                Every submission gets a unique tracking ID in the `NEO-YYYY-001` format and can optionally hide the submitter’s identity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={submitCase}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" value={submissionForm.title} onChange={(event) => setSubmissionForm((current) => ({ ...current, title: event.target.value }))} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value={submissionForm.department} onChange={(event) => setSubmissionForm((current) => ({ ...current, department: event.target.value }))} required />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={submissionForm.description} onChange={(event) => setSubmissionForm((current) => ({ ...current, description: event.target.value }))} required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Category</Label>
                    <Select value={submissionForm.category} onValueChange={(value) => setSubmissionForm((current) => ({ ...current, category: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASE_CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Severity</Label>
                    <Select value={submissionForm.severity} onValueChange={(value) => setSubmissionForm((current) => ({ ...current, severity: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CASE_SEVERITIES.map((severity) => <SelectItem key={severity} value={severity}>{severity}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={submissionForm.location} onChange={(event) => setSubmissionForm((current) => ({ ...current, location: event.target.value }))} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="attachment">Attachment</Label>
                    <Input id="attachment" type="file" accept="image/*,application/pdf" onChange={(event) => setSubmissionForm((current) => ({ ...current, attachment: event.target.files?.[0] ?? null }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border bg-slate-50 p-4">
                  <div>
                    <div className="font-medium">Submit anonymously</div>
                    <div className="text-sm text-muted-foreground">Your name will be hidden from the case view, but your account can still track the case.</div>
                  </div>
                  <Switch checked={submissionForm.anonymous} onCheckedChange={(checked) => setSubmissionForm((current) => ({ ...current, anonymous: checked }))} />
                </div>
                <Button type="submit">Submit complaint or feedback</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cases">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <Card>
              <CardHeader>
                <CardTitle>{user.role === "secretariat" ? "Secretariat inbox" : user.role === "case_manager" ? "Assigned cases" : "Your submitted cases"}</CardTitle>
                <CardDescription>
                  {user.role === "secretariat"
                    ? "Review every incoming case, assign a Case Manager, and monitor escalations."
                    : user.role === "case_manager"
                      ? "Update statuses, add notes, and close the cases assigned to you."
                      : "Track your submissions and see how management is responding."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.trackingId}</div>
                          <div className="text-xs text-muted-foreground">{item.title}</div>
                        </TableCell>
                        <TableCell>{item.department}</TableCell>
                        <TableCell><Badge variant={statusBadgeVariant(item.status) as any}>{item.status}</Badge></TableCell>
                        <TableCell>{item.caseManagerName ?? "Unassigned"}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => openCase(item)}>Open</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Escalation guardrails</CardTitle>
                <CardDescription>Items that go too long without an owner response are surfaced quickly so follow-up does not stall.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {escalatedCases.length === 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">No current escalations.</div>}
                {escalatedCases.map((item) => (
                  <div key={item.id} className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-center gap-2 font-medium text-rose-800">
                      <AlertTriangle className="h-4 w-4" />
                      {item.trackingId}
                    </div>
                    <div className="mt-1 text-sm text-rose-700">{item.title}</div>
                    <div className="mt-2 text-xs text-rose-700">Escalated on {item.escalatedAt ? formatDate(item.escalatedAt) : "Pending timestamp"}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="polls">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Staff polling</CardTitle>
                <CardDescription>Each staff member can vote once per poll, and results appear immediately after voting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {polls.map((poll) => (
                  <div key={poll.id} className="rounded-xl border p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">{poll.question}</div>
                        <div className="text-xs text-muted-foreground">Created by {poll.createdByName} on {formatDate(poll.createdAt)}</div>
                      </div>
                      <Badge variant="outline">{poll.totalVotes} votes</Badge>
                    </div>
                    <div className="grid gap-2">
                      {poll.options.map((option, index) => (
                        <button
                          key={`${poll.id}-${option.label}`}
                          type="button"
                          className={cn("flex items-center justify-between rounded-lg border px-3 py-2 text-left transition hover:bg-slate-50", poll.myVote === index && "border-cyan-500 bg-cyan-50")}
                          onClick={() => vote(poll.id, index)}
                          disabled={poll.myVote !== null}
                        >
                          <span>{option.label}</span>
                          <span className="text-sm text-muted-foreground">{option.votes}</span>
                        </button>
                      ))}
                    </div>
                    {poll.myVote !== null && (
                      <div className="mt-4 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={poll.options}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar dataKey="votes" fill="#0891b2" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
            {canManageHub && (
              <Card>
                <CardHeader>
                  <CardTitle>Create poll</CardTitle>
                  <CardDescription>Secretariat and Admin can publish pulse checks and feedback polls.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={createPoll}>
                    <div className="grid gap-2">
                      <Label htmlFor="question">Question</Label>
                      <Input id="question" value={pollForm.question} onChange={(event) => setPollForm((current) => ({ ...current, question: event.target.value }))} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="options">Options (one per line)</Label>
                      <Textarea id="options" value={pollForm.optionsText} onChange={(event) => setPollForm((current) => ({ ...current, optionsText: event.target.value }))} />
                    </div>
                    <Button type="submit">Create poll</Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="hub">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Announcements</CardTitle>
                <CardDescription>Visible to all staff as company updates and notices.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  {hub.announcements.map((announcement) => (
                    <div key={announcement.id} className="rounded-xl border p-4">
                      <div className="font-medium">{announcement.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{announcement.body}</div>
                    </div>
                  ))}
                </div>
                {canManageHub && (
                  <form className="grid gap-3 rounded-xl border bg-slate-50 p-4" onSubmit={createAnnouncement}>
                    <div className="font-medium">Post announcement</div>
                    <Input placeholder="Announcement title" value={announcementForm.title} onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))} />
                    <Textarea placeholder="Announcement details" value={announcementForm.body} onChange={(event) => setAnnouncementForm((current) => ({ ...current, body: event.target.value }))} />
                    <Button type="submit">Publish update</Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Quarterly Digest</CardTitle>
                  <CardDescription>Blog-style summaries showing how resolved cases were handled.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hub.digests.map((digest) => (
                    <div key={digest.id} className="rounded-xl border p-4">
                      <div className="font-medium">{digest.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{digest.summary}</div>
                    </div>
                  ))}
                  {canManageHub && (
                    <form className="grid gap-3 rounded-xl border bg-slate-50 p-4" onSubmit={createDigest}>
                      <Input placeholder="Digest title" value={digestForm.title} onChange={(event) => setDigestForm((current) => ({ ...current, title: event.target.value }))} />
                      <Textarea placeholder="Resolved-case summary" value={digestForm.summary} onChange={(event) => setDigestForm((current) => ({ ...current, summary: event.target.value }))} />
                      <Input placeholder="Optional case ID" value={digestForm.caseId} onChange={(event) => setDigestForm((current) => ({ ...current, caseId: event.target.value }))} />
                      <Button type="submit">Publish digest entry</Button>
                    </form>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Impact Tracking</CardTitle>
                  <CardDescription>Shows what was raised, what action was taken, and what changed.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raised</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Changed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hub.impacts.map((impact) => (
                        <TableRow key={impact.id}>
                          <TableCell>{impact.raised}</TableCell>
                          <TableCell>{impact.action_taken}</TableCell>
                          <TableCell>{impact.changed}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {canManageHub && (
                    <form className="grid gap-3 rounded-xl border bg-slate-50 p-4" onSubmit={createImpact}>
                      <Input placeholder="What was raised?" value={impactForm.raised} onChange={(event) => setImpactForm((current) => ({ ...current, raised: event.target.value }))} />
                      <Input placeholder="What action was taken?" value={impactForm.actionTaken} onChange={(event) => setImpactForm((current) => ({ ...current, actionTaken: event.target.value }))} />
                      <Input placeholder="What changed?" value={impactForm.changed} onChange={(event) => setImpactForm((current) => ({ ...current, changed: event.target.value }))} />
                      <Button type="submit">Add impact row</Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Minutes Archive</CardTitle>
                <CardDescription>Searchable list of uploaded meeting PDFs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Search minutes..." value={searchMinutes} onChange={(event) => setSearchMinutes(event.target.value)} />
                  <Button variant="outline" onClick={() => loadHub(searchMinutes)}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {hub.minutes.map((minute) => (
                    <a key={minute.id} href={minute.file_path} target="_blank" rel="noreferrer" className="rounded-xl border p-4 transition hover:bg-slate-50">
                      <div className="flex items-center gap-2 font-medium">
                        <FileText className="h-4 w-4 text-cyan-700" />
                        {minute.title}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{minute.description}</div>
                      <div className="mt-2 text-xs text-muted-foreground">{minute.original_name} • uploaded by {minute.uploaded_by_name}</div>
                    </a>
                  ))}
                </div>
                {canManageHub && (
                  <form className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:max-w-xl" onSubmit={uploadMinutes}>
                    <div className="font-medium">Upload meeting minutes</div>
                    <Input placeholder="Minutes title" value={minutesForm.title} onChange={(event) => setMinutesForm((current) => ({ ...current, title: event.target.value }))} />
                    <Textarea placeholder="Short description" value={minutesForm.description} onChange={(event) => setMinutesForm((current) => ({ ...current, description: event.target.value }))} />
                    <Input type="file" accept="application/pdf" onChange={(event) => setMinutesForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} />
                    <Button type="submit">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload PDF
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {canSeeAnalytics && analytics && (
          <TabsContent value="analytics">
            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Departments with open cases</CardTitle>
                  <CardDescription>Bar chart heatmap showing where issues are concentrated.</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.openByDepartment}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#0f766e" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Case status mix</CardTitle>
                  <CardDescription>Quick breakdown by status.</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={analytics.byStatus} dataKey="total" nameKey="label" outerRadius={100}>
                        {analytics.byStatus.map((entry, index) => (
                          <Cell key={entry.label} fill={["#0891b2", "#0f766e", "#22c55e", "#f59e0b", "#ef4444", "#7c3aed"][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Counts by category</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Hotspot flags</CardTitle>
                  <CardDescription>Highlighted when 5 or more cases from the same department share the same category.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.hotspots.length === 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">No hotspots flagged yet.</div>}
                  {analytics.hotspots.map((hotspot) => (
                    <div key={`${hotspot.department}-${hotspot.category}`} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 font-medium text-amber-900">
                        <Flag className="h-4 w-4" />
                        {hotspot.department} - {hotspot.category}
                      </div>
                      <div className="text-sm text-amber-800">{hotspot.total} recurring cases detected.</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {canManageUsers && (
          <TabsContent value="admin">
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Create user account</CardTitle>
                  <CardDescription>Admin manages user accounts and security access.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-3" onSubmit={createUser}>
                    <Input placeholder="Full name" value={userForm.name} onChange={(event) => setUserForm((current) => ({ ...current, name: event.target.value }))} />
                    <Input placeholder="Email" value={userForm.email} onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))} />
                    <Input type="password" placeholder="Password" value={userForm.password} onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))} />
                    <Select value={userForm.role} onValueChange={(value) => setUserForm((current) => ({ ...current, role: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="secretariat">Secretariat</SelectItem>
                        <SelectItem value="case_manager">Case Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Department" value={userForm.department} onChange={(event) => setUserForm((current) => ({ ...current, department: event.target.value }))} />
                    <Button type="submit">Create account</Button>
                  </form>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Account controls</CardTitle>
                  <CardDescription>Activate or deactivate users without deleting their history.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((managedUser) => (
                        <TableRow key={managedUser.id}>
                          <TableCell>
                            <div className="font-medium">{managedUser.name}</div>
                            <div className="text-xs text-muted-foreground">{managedUser.email}</div>
                          </TableCell>
                          <TableCell className="capitalize">{managedUser.role.replace("_", " ")}</TableCell>
                          <TableCell>{managedUser.department}</TableCell>
                          <TableCell>
                            <Badge variant={managedUser.active ? "secondary" : "destructive"}>{managedUser.active ? "Active" : "Disabled"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => toggleUser(managedUser.id)}>
                              {managedUser.active ? "Disable" : "Enable"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={Boolean(selectedCase)} onOpenChange={(open) => !open && setSelectedCase(null)}>
        <DialogContent>
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {selectedCase.trackingId}
                  <Badge variant={statusBadgeVariant(selectedCase.status) as any}>{selectedCase.status}</Badge>
                </DialogTitle>
                <DialogDescription>{selectedCase.title}</DialogDescription>
              </DialogHeader>
              {caseDetailLoading ? (
                <div className="py-8 text-center text-muted-foreground">Loading case details...</div>
              ) : (
                <div className="grid gap-6 md:grid-cols-[1fr_0.95fr]">
                  <div className="space-y-4">
                    <div className="rounded-xl border p-4">
                      <div className="text-sm font-medium text-slate-900">Summary</div>
                      <div className="mt-2 text-sm text-muted-foreground">{selectedCase.description}</div>
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div><span className="font-medium">Department:</span> {selectedCase.department}</div>
                        <div><span className="font-medium">Category:</span> {selectedCase.category}</div>
                        <div><span className="font-medium">Severity:</span> {selectedCase.severity}</div>
                        <div><span className="font-medium">Location:</span> {selectedCase.location}</div>
                        <div><span className="font-medium">Submitted by:</span> {selectedCase.submitterName ?? "Unknown"}</div>
                        <div><span className="font-medium">Owner:</span> {selectedCase.caseManagerName ?? "Unassigned"}</div>
                      </div>
                      {selectedCase.attachmentPath && (
                        <a href={selectedCase.attachmentPath} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-medium text-cyan-700 underline">
                          Open attachment: {selectedCase.attachmentName}
                        </a>
                      )}
                    </div>

                    {canManageCases && (user.role !== "staff") && (
                      <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
                        <div className="flex items-center gap-2 font-medium">
                          <Bell className="h-4 w-4" />
                          Case actions
                        </div>
                        {(user.role === "secretariat" || user.role === "admin") && (
                          <div className="grid gap-2">
                            <Label>Assign to Case Manager</Label>
                            <div className="flex gap-2">
                              <Select value={assignToId} onValueChange={setAssignToId}>
                                <SelectTrigger><SelectValue placeholder="Choose case manager" /></SelectTrigger>
                                <SelectContent>
                                  {caseManagers.map((manager) => (
                                    <SelectItem key={manager.id} value={String(manager.id)}>
                                      {manager.name} ({manager.department})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button type="button" onClick={assignCase}>Assign</Button>
                            </div>
                          </div>
                        )}
                        <div className="grid gap-2">
                          <Label>Status update</Label>
                          <Select value={noteForm.status} onValueChange={(value) => setNoteForm((current) => ({ ...current, status: value }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CASE_STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Textarea placeholder="Add a case note or response..." value={noteForm.body} onChange={(event) => setNoteForm((current) => ({ ...current, body: event.target.value }))} />
                          <Button type="button" onClick={addNote}>Save note and update status</Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="font-medium">Case timeline</div>
                    {selectedCaseNotes.length === 0 && <div className="rounded-xl border p-4 text-sm text-muted-foreground">No notes added yet.</div>}
                    {selectedCaseNotes.map((note) => (
                      <div key={note.id} className="rounded-xl border p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">{note.author_name}</div>
                          {note.status_after && <Badge variant="outline">{note.status_after}</Badge>}
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">{note.body}</div>
                        <div className="mt-2 text-xs text-muted-foreground">{formatDate(note.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
