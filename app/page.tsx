"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "Verified" | "Needs review" | "Outdated";
type Community = {
  id: string;
  name: string;
  category: string;
  town: string;
  county: string;
  status: Status;
  contact: string;
  source: string;
  verified: string;
  x: number;
  y: number;
};

type ReviewItem = {
  id: string;
  sourceType: "Community update" | "Search AI candidate";
  community: string;
  summary: string;
  submittedBy: string;
  submitted: string;
  confidence?: string;
  sourceUrl?: string;
  remote?: boolean;
  status?: string;
};

type Tab =
  | "Overview"
  | "Community map"
  | "Directory"
  | "Review queue"
  | "Submission tracker"
  | "Search AI"
  | "Community assistant"
  | "Architecture";

const initialCommunities: Community[] = [
  {
    id: "COM-001",
    name: "Maynooth Community Garden",
    category: "Gardening & outdoors",
    town: "Maynooth",
    county: "Kildare",
    status: "Verified",
    contact: "hello@maynoothgarden.ie",
    source: "Community confirmation",
    verified: "20 Jul 2026",
    x: 31,
    y: 43,
  },
  {
    id: "COM-002",
    name: "Leixlip Library Conversation Circle",
    category: "Language & learning",
    town: "Leixlip",
    county: "Kildare",
    status: "Verified",
    contact: "leixliplib@kildarecoco.ie",
    source: "Official website",
    verified: "18 Jul 2026",
    x: 58,
    y: 27,
  },
  {
    id: "COM-003",
    name: "Celbridge Men's Shed",
    category: "Social & practical",
    town: "Celbridge",
    county: "Kildare",
    status: "Needs review",
    contact: "Contact missing",
    source: "Public directory",
    verified: "02 Feb 2026",
    x: 54,
    y: 59,
  },
  {
    id: "COM-004",
    name: "Naas Family Resource Centre",
    category: "Family support",
    town: "Naas",
    county: "Kildare",
    status: "Verified",
    contact: "info@naasfrc.ie",
    source: "Organisation website",
    verified: "22 Jul 2026",
    x: 67,
    y: 75,
  },
  {
    id: "COM-005",
    name: "Kildare Arts Collective",
    category: "Arts & culture",
    town: "Kildare Town",
    county: "Kildare",
    status: "Outdated",
    contact: "hello@kildarearts.example",
    source: "Community submission",
    verified: "14 Nov 2025",
    x: 21,
    y: 72,
  },
];

const initialQueue: ReviewItem[] = [
  {
    id: "CH-1042",
    sourceType: "Community update",
    community: "Maynooth Community Garden",
    summary:
      "Add event: Summer Gardening Afternoon · 30 Jul 2026 · 2:00 pm · Maynooth Community Centre",
    submittedBy: "Registered community organiser",
    submitted: "Today, 16:42",
  },
  {
    id: "AI-2081",
    sourceType: "Search AI candidate",
    community: "North Kildare Walking Group",
    summary:
      "New candidate community with a public activity page and recent walking schedule.",
    submittedBy: "Local Community Search AI",
    submitted: "Today, 15:18",
    confidence: "3 supporting public sources",
    sourceUrl: "Source links available",
  },
  {
    id: "AI-2079",
    sourceType: "Search AI candidate",
    community: "Maynooth International Café",
    summary:
      "Possible duplicate of an existing language and social activity record.",
    submittedBy: "Local Community Search AI",
    submitted: "Yesterday, 12:05",
    confidence: "2 supporting public sources",
    sourceUrl: "Source links available",
  },
];

const navigation: { label: Tab; short: string }[] = [
  { label: "Overview", short: "01" },
  { label: "Community map", short: "02" },
  { label: "Directory", short: "03" },
  { label: "Review queue", short: "04" },
  { label: "Submission tracker", short: "05" },
  { label: "Search AI", short: "06" },
  { label: "Community assistant", short: "07" },
  { label: "Architecture", short: "08" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`status status-${status.toLowerCase().replace(" ", "-")}`}>
      <span aria-hidden="true" />
      {status}
    </span>
  );
}

function Metric({
  label,
  value,
  note,
  tone = "ink",
}: {
  label: string;
  value: number | string;
  note: string;
  tone?: "ink" | "green" | "orange" | "red";
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [communities, setCommunities] =
    useState<Community[]>(initialCommunities);
  const [queue, setQueue] = useState<ReviewItem[]>(initialQueue);
  const [trackedSubmissions, setTrackedSubmissions] = useState<ReviewItem[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community>(
    initialCommunities[0],
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | Status>("All");
  const [reviewed, setReviewed] = useState<
    { id: string; decision: string; name: string }[]
  >([]);

  useEffect(() => {
    if (!API_URL) {
      return;
    }

    let stopped = false;

    async function loadPendingSubmissions() {
      try {
        const [response, communitiesResponse, trackerResponse] = await Promise.all([
          fetch(`${API_URL}/submissions?status=pending`, { cache: "no-store" }),
          fetch(`${API_URL}/communities`, { cache: "no-store" }),
          fetch(`${API_URL}/submissions?status=all`, { cache: "no-store" }),
        ]);
        if (!response.ok || !communitiesResponse.ok || !trackerResponse.ok) {
          return;
        }

        const remoteItems = (await response.json()) as ReviewItem[];
        const remoteCommunities = (await communitiesResponse.json()) as Array<{
          id: string; name: string; status: string; town: string;
          category: string; contact: string;
        }>;
        const trackerItems = (await trackerResponse.json()) as ReviewItem[];
        if (stopped) {
          return;
        }

        setQueue((current) => {
          const localItems = current.filter((item) => !item.remote);
          return [
            ...remoteItems.map((item) => ({ ...item, remote: true })),
            ...localItems,
          ];
        });
        setCommunities(
          remoteCommunities.map((community, index) => ({
            id: community.id,
            name: community.name,
            category: community.category,
            town: community.town,
            county: "Kildare",
            status:
              community.status === "outdated"
                ? "Outdated"
                : community.status === "needs_review"
                  ? "Needs review"
                  : "Verified",
            contact: community.contact,
            source: community.id.startsWith("COM-") ? "Approved community record" : "Community confirmation",
            verified: "Today",
            x: 20 + ((index * 17) % 58),
            y: 22 + ((index * 23) % 60),
          })),
        );
        setTrackedSubmissions(trackerItems);
      } catch {
        // The hosted prototype keeps its sample data when no local API is running.
      }
    }

    loadPendingSubmissions();
    const timer = window.setInterval(loadPendingSubmissions, 3000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  const filteredCommunities = useMemo(() => {
    const clean = query.trim().toLowerCase();
    return communities.filter((community) => {
      const matchesText =
        !clean ||
        `${community.name} ${community.category} ${community.town}`
          .toLowerCase()
          .includes(clean);
      const matchesStatus =
        statusFilter === "All" || community.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [communities, query, statusFilter]);

  const verified = communities.filter((c) => c.status === "Verified").length;
  const attention = communities.length - verified;

  async function decide(
    item: ReviewItem,
    decision: "Approve" | "Clarify" | "Reject",
  ) {
    if (item.remote && API_URL) {
      const response = await fetch(`${API_URL}/submissions/${item.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: decision.toLowerCase() }),
      });
      if (!response.ok) {
        window.alert("The local backend could not save this decision.");
        return;
      }
    }

    setQueue((current) => current.filter((entry) => entry.id !== item.id));
    setReviewed((current) => [
      { id: item.id, decision, name: item.community },
      ...current,
    ]);

    if (decision === "Approve" && item.id.startsWith("NEW-")) {
      const parts = item.summary.split(" · ");
      setCommunities((current) =>
        current.some(
          (community) =>
            community.name.toLowerCase() === item.community.toLowerCase(),
        )
          ? current
          : [
              ...current,
              {
                id: `COM-${item.id.replace("NEW-", "")}`,
                name: item.community,
                category: parts[1] || "Community activity",
                town: parts[2] || "Location to confirm",
                county: "Kildare",
                status: "Verified",
                contact: "Submitted through Telegram",
                source: `Approved Telegram submission ${item.id}`,
                verified: "Today",
                x: 38,
                y: 46,
              },
            ],
      );
      setSelectedCommunity({
        id: `COM-${item.id.replace("NEW-", "")}`,
        name: item.community,
        category: parts[1] || "Community activity",
        town: parts[2] || "Location to confirm",
        county: "Kildare",
        status: "Verified",
        contact: "Submitted through Telegram",
        source: `Approved Telegram submission ${item.id}`,
        verified: "Today",
        x: 38,
        y: 46,
      });
      setActiveTab("Directory");
    }

    if (
      decision === "Approve" &&
      item.sourceType === "Search AI candidate" &&
      !communities.some((community) => community.name === item.community)
    ) {
      setCommunities((current) => [
        ...current,
        {
          id: `COM-${String(current.length + 1).padStart(3, "0")}`,
          name: item.community,
          category: "Social & wellbeing",
          town: "Maynooth",
          county: "Kildare",
          status: "Verified",
          contact: "Contact requires community confirmation",
          source: "Liaison-approved candidate",
          verified: "Today",
          x: 42,
          y: 35,
        },
      ]);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            C
          </div>
          <div>
            <strong>Co.Here</strong>
            <span>Community intelligence</span>
          </div>
        </div>

        <nav aria-label="Prototype sections">
          {navigation.map((item) => (
            <button
              key={item.label}
              className={activeTab === item.label ? "nav-item active" : "nav-item"}
              onClick={() => setActiveTab(item.label)}
            >
              <span>{item.short}</span>
              {item.label}
              {item.label === "Review queue" && queue.length > 0 ? (
                <b>{queue.length}</b>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="prototype-note">
          <span>Interactive prototype</span>
          <p>Sample data · external integrations simulated</p>
        </div>

        <div className="profile">
          <div>FS</div>
          <p>
            <strong>HIH Staff</strong>
            <span>Community Liaison</span>
          </p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p>Helping Irish Hosts / Co.Here</p>
            <h1>{activeTab}</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="ghost-button"
              onClick={() => setActiveTab("Architecture")}
            >
              How it connects
            </button>
            <button
              className="primary-button"
              onClick={() => setActiveTab("Review queue")}
            >
              Review {queue.length} items
            </button>
          </div>
        </header>

        {activeTab === "Overview" && (
          <Overview
            communities={communities}
            queue={queue}
            trackedSubmissions={trackedSubmissions}
            verified={verified}
            attention={attention}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "Community map" && (
          <CommunityMap
            communities={filteredCommunities}
            selected={selectedCommunity}
            onSelect={setSelectedCommunity}
            query={query}
            setQuery={setQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            openRecord={() => setActiveTab("Directory")}
          />
        )}

        {activeTab === "Directory" && (
          <Directory
            communities={filteredCommunities}
            query={query}
            setQuery={setQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onSelect={(community) => {
              setSelectedCommunity(community);
              setActiveTab("Community map");
            }}
          />
        )}

        {activeTab === "Review queue" && (
          <ReviewQueue queue={queue} reviewed={reviewed} decide={decide} />
        )}

        {activeTab === "Submission tracker" && (
          <SubmissionTracker submissions={trackedSubmissions} />
        )}

        {activeTab === "Search AI" && (
          <SearchAI
            queue={queue}
            addToQueue={(item) =>
              setQueue((current) =>
                current.some((entry) => entry.id === item.id)
                  ? current
                  : [item, ...current],
              )
            }
            openQueue={() => setActiveTab("Review queue")}
          />
        )}

        {activeTab === "Community assistant" && (
          <CommunityAssistant
            addToQueue={(item) =>
              setQueue((current) =>
                current.some((entry) => entry.id === item.id)
                  ? current
                  : [item, ...current],
              )
            }
            openQueue={() => setActiveTab("Review queue")}
          />
        )}

        {activeTab === "Architecture" && <Architecture />}
      </section>
    </main>
  );
}

function Overview({
  communities,
  queue,
  trackedSubmissions,
  verified,
  attention,
  setActiveTab,
}: {
  communities: Community[];
  queue: ReviewItem[];
  trackedSubmissions: ReviewItem[];
  verified: number;
  attention: number;
  setActiveTab: (tab: Tab) => void;
}) {
  const publishedFromTelegram = trackedSubmissions.filter(
    (item) => item.status === "approved",
  );
  return (
    <div className="page-stack">
      <section className="intro-row">
        <div>
          <span className="eyebrow">Living community information</span>
          <h2>Know what is trusted, what changed, and what needs attention.</h2>
          <p>
            One staff workspace for discovering, reviewing and maintaining
            community information before it is used for matching.
          </p>
        </div>
        <div className="trust-rule">
          <span>Trust rule</span>
          <strong>Human approval before publication</strong>
          <p>AI and community updates enter the same accountable review process.</p>
        </div>
      </section>

      <section className="metric-grid">
        <Metric
          label="Community records"
          value={communities.length}
          note="Across the current prototype area"
        />
        <Metric
          label="Verified"
          value={verified}
          note={`${Math.round((verified / communities.length) * 100)}% of records`}
          tone="green"
        />
        <Metric
          label="Needs attention"
          value={attention}
          note="Outdated or incomplete"
          tone="orange"
        />
        <Metric
          label="Review queue"
          value={queue.length}
          note="Human decisions required"
          tone="red"
        />
      </section>

      <section className="published-proof panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Publication proof</span>
            <h3>Recently approved from Telegram</h3>
            <p>These records completed the full bot → review → Directory journey.</p>
          </div>
          <span className="proof-count">{publishedFromTelegram.length} published</span>
        </div>
        {publishedFromTelegram.length === 0 ? (
          <div className="proof-empty">
            <span>↗</span>
            <div><strong>No Telegram records approved yet</strong><p>Approve a confirmed bot submission and the publication proof will appear here.</p></div>
          </div>
        ) : (
          <div className="proof-list">
            {publishedFromTelegram.slice(0, 4).map((item) => (
              <article className="proof-row" key={item.id}>
                <span className="proof-telegram">↗ Telegram</span>
                <div><strong>{item.community}</strong><small>{item.summary}</small></div>
                <span className="reference">{item.id}</span>
                <span className="proof-verified">● Verified</span>
                <span className="proof-directory">✓ Added to Directory</span>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="overview-grid">
        <article className="panel span-two">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Today’s priority</span>
              <h3>Review incoming information</h3>
            </div>
            <button onClick={() => setActiveTab("Review queue")}>Open queue →</button>
          </div>
          <div className="task-list">
            {queue.slice(0, 3).map((item) => (
              <div key={item.id} className="task-row">
                <span
                  className={
                    item.sourceType === "Search AI candidate"
                      ? "source-icon ai"
                      : "source-icon chat"
                  }
                >
                  {item.sourceType === "Search AI candidate" ? "AI" : "WA"}
                </span>
                <div>
                  <strong>{item.community}</strong>
                  <p>{item.summary}</p>
                </div>
                <span className="reference">{item.id}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Data health</span>
              <h3>Quality at a glance</h3>
            </div>
          </div>
          <div className="health-ring" aria-label={`${verified} verified records`}>
            <div>
              <strong>{Math.round((verified / communities.length) * 100)}%</strong>
              <span>verified</span>
            </div>
          </div>
          <div className="health-legend">
            <p>
              <span className="dot green" /> Complete and recently confirmed
            </p>
            <p>
              <span className="dot orange" /> Requires checking
            </p>
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Entry channel</span>
              <h3>Community assistant</h3>
            </div>
          </div>
          <p className="panel-copy">
            A familiar messaging route for organisers to submit an update or ask
            for approved information.
          </p>
          <button
            className="wide-action"
            onClick={() => setActiveTab("Community assistant")}
          >
            Try the assistant
            <span>WhatsApp flow simulation →</span>
          </button>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Discovery tool</span>
              <h3>Local Community Search AI</h3>
            </div>
          </div>
          <p className="panel-copy">
            Finds source-supported candidate records. A person still decides what
            enters the trusted record.
          </p>
          <button
            className="wide-action"
            onClick={() => setActiveTab("Search AI")}
          >
            Run a sample search
            <span>Eight parallel search branches →</span>
          </button>
        </article>
      </section>
    </div>
  );
}

function SubmissionTracker({ submissions }: { submissions: ReviewItem[] }) {
  const pending = submissions.filter((item) => item.status === "pending").length;
  const approved = submissions.filter((item) => item.status === "approved").length;
  const clarification = submissions.filter(
    (item) => item.status === "needs_clarification",
  ).length;

  return (
    <div className="page-stack submission-tracker">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Telegram submission control centre</span>
          <h2>Every submission, decision and publication status.</h2>
          <p>
            Confirm that information received through Telegram reached Co.Here,
            see its current review status and verify when it entered the trusted
            Directory.
          </p>
        </div>
        <span className="tracker-live">● Live · refreshes every 3 seconds</span>
      </section>

      <section className="metric-grid tracker-metrics">
        <Metric label="All submissions" value={submissions.length} note="Received through the local workflow" />
        <Metric label="Pending review" value={pending} note="Waiting for a Liaison decision" tone="orange" />
        <Metric label="Approved" value={approved} note="Decision completed" tone="green" />
        <Metric label="Clarification" value={clarification} note="Returned to the organiser" tone="red" />
      </section>

      <section className="tracker-panel">
        <div className="tracker-head">
          <span>Reference</span><span>Community</span><span>Source</span>
          <span>Submitted</span><span>Status</span><span>Directory</span>
        </div>
        {submissions.length === 0 ? (
          <div className="empty-state">
            <strong>No Telegram submissions yet</strong>
            <p>Confirm a submission in the bot and it will appear here automatically.</p>
          </div>
        ) : submissions.map((item) => {
          const status = item.status || "pending";
          return (
            <article className="tracker-row" key={item.id}>
              <span className="reference">{item.id}</span>
              <div><strong>{item.community}</strong><small>{item.summary}</small></div>
              <span className="tracker-source">Telegram</span>
              <span>{item.submitted}</span>
              <span className={`tracker-status tracker-${status}`}>
                {status.replaceAll("_", " ")}
              </span>
              <span className={status === "approved" ? "directory-yes" : "directory-wait"}>
                {status === "approved" ? "✓ Published" : "Not published"}
              </span>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Filters({
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
}: {
  query: string;
  setQuery: (value: string) => void;
  statusFilter: "All" | Status;
  setStatusFilter: (value: "All" | Status) => void;
}) {
  return (
    <div className="filters">
      <label className="search-field">
        <span aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, activity or town"
          aria-label="Search communities"
        />
      </label>
      <label className="select-field">
        Status
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "All" | Status)
          }
        >
          <option>All</option>
          <option>Verified</option>
          <option>Needs review</option>
          <option>Outdated</option>
        </select>
      </label>
    </div>
  );
}

function CommunityMap({
  communities,
  selected,
  onSelect,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  openRecord,
}: {
  communities: Community[];
  selected: Community;
  onSelect: (community: Community) => void;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: "All" | Status;
  setStatusFilter: (value: "All" | Status) => void;
  openRecord: () => void;
}) {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Geographic overview</span>
          <h2>Community knowledge map</h2>
          <p>
            Explore approved records and identify areas where information needs
            attention.
          </p>
        </div>
        <div className="map-key">
          <span>
            <i className="pin-key verified" /> Verified
          </span>
          <span>
            <i className="pin-key review" /> Needs review
          </span>
          <span>
            <i className="pin-key outdated" /> Outdated
          </span>
        </div>
      </section>
      <Filters
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
      <section className="map-layout">
        <div className="map-canvas" aria-label="Prototype community map">
          <div className="river" />
          <div className="road road-one" />
          <div className="road road-two" />
          <span className="place place-one">Maynooth</span>
          <span className="place place-two">Leixlip</span>
          <span className="place place-three">Naas</span>
          <span className="place place-four">Kildare</span>
          {communities.map((community) => (
            <button
              key={community.id}
              className={`map-pin ${community.status
                .toLowerCase()
                .replace(" ", "-")} ${
                selected.id === community.id ? "selected" : ""
              }`}
              style={{ left: `${community.x}%`, top: `${community.y}%` }}
              onClick={() => onSelect(community)}
              aria-label={`View ${community.name}`}
            >
              <span />
            </button>
          ))}
          <div className="map-attribution">
            Prototype map canvas · production proposal: MapLibre + OpenStreetMap
          </div>
        </div>
        <aside className="map-detail">
          <span className="reference">{selected.id}</span>
          <StatusPill status={selected.status} />
          <h3>{selected.name}</h3>
          <p className="category">{selected.category}</p>
          <dl>
            <div>
              <dt>Location</dt>
              <dd>
                {selected.town}, {selected.county}
              </dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>{selected.contact}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{selected.source}</dd>
            </div>
            <div>
              <dt>Last verified</dt>
              <dd>{selected.verified}</dd>
            </div>
          </dl>
          <button className="primary-button full" onClick={openRecord}>
            Open directory record
          </button>
        </aside>
      </section>
    </div>
  );
}

function Directory({
  communities,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  onSelect,
}: {
  communities: Community[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: "All" | Status;
  setStatusFilter: (value: "All" | Status) => void;
  onSelect: (community: Community) => void;
}) {
  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Central record</span>
          <h2>Community directory</h2>
          <p>
            Search, filter and open the latest trusted community information.
          </p>
        </div>
        <span className="record-count">{communities.length} records shown</span>
      </section>
      <Filters
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />
      <section className="directory-table" aria-label="Community directory">
        <div className="table-head">
          <span>Community</span>
          <span>Location</span>
          <span>Last verified</span>
          <span>Status</span>
          <span />
        </div>
        {communities.map((community) => (
          <button
            className="table-row"
            key={community.id}
            onClick={() => onSelect(community)}
          >
            <span>
              <strong>{community.name}</strong>
              <small>{community.category}</small>
            </span>
            <span>
              {community.town}
              <small>{community.county}</small>
            </span>
            <span>{community.verified}</span>
            <span>
              <StatusPill status={community.status} />
            </span>
            <span aria-hidden="true">→</span>
          </button>
        ))}
        {communities.length === 0 ? (
          <div className="empty-state">
            <strong>No records match these filters.</strong>
            <p>Try changing the name or status.</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ReviewQueue({
  queue,
  reviewed,
  decide,
}: {
  queue: ReviewItem[];
  reviewed: { id: string; decision: string; name: string }[];
  decide: (item: ReviewItem, decision: "Approve" | "Clarify" | "Reject") => void;
}) {
  const [activeId, setActiveId] = useState(queue[0]?.id ?? "");
  const selected = queue.find((item) => item.id === activeId) ?? queue[0];

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Human verification gate</span>
          <h2>Data review queue</h2>
          <p>
            Compare incoming information with the existing record before deciding
            what becomes trusted.
          </p>
        </div>
        <div className="rule-badge">Nothing publishes automatically</div>
      </section>

      {queue.length > 0 && selected ? (
        <section className="review-layout">
          <aside className="queue-list">
            <div className="queue-list-heading">
              <strong>{queue.length} awaiting review</strong>
              <span>Priority order</span>
            </div>
            {queue.map((item) => (
              <button
                key={item.id}
                className={selected.id === item.id ? "queue-card active" : "queue-card"}
                onClick={() => setActiveId(item.id)}
              >
                <div>
                  <span
                    className={
                      item.sourceType === "Search AI candidate"
                        ? "source-icon ai"
                        : "source-icon chat"
                    }
                  >
                    {item.sourceType === "Search AI candidate" ? "AI" : "WA"}
                  </span>
                  <span className="reference">{item.id}</span>
                </div>
                <strong>{item.community}</strong>
                <p>{item.sourceType}</p>
                <small>{item.submitted}</small>
              </button>
            ))}
          </aside>
          <article className="review-detail">
            <header>
              <div>
                <span className="eyebrow">{selected.sourceType}</span>
                <h3>{selected.community}</h3>
                <p>
                  {selected.id} · {selected.submitted}
                </p>
              </div>
              <span className="pending-pill">Pending review</span>
            </header>

            <section className="comparison">
              <div>
                <span>Current approved record</span>
                <strong>{selected.community}</strong>
                <p>
                  Existing information remains public until a reviewer approves a
                  change.
                </p>
                <dl>
                  <div>
                    <dt>Status</dt>
                    <dd>Active</dd>
                  </div>
                  <div>
                    <dt>Last verified</dt>
                    <dd>20 Jul 2026</dd>
                  </div>
                </dl>
              </div>
              <div className="proposed">
                <span>Proposed information</span>
                <strong>{selected.summary}</strong>
                <p>Submitted by: {selected.submittedBy}</p>
                {selected.confidence ? <b>{selected.confidence}</b> : null}
                {selected.sourceUrl ? <small>{selected.sourceUrl}</small> : null}
              </div>
            </section>

            <section className="review-checks">
              <h4>Reviewer checks</h4>
              <label>
                <input type="checkbox" defaultChecked /> Source is identifiable
              </label>
              <label>
                <input type="checkbox" /> Information is sufficiently recent
              </label>
              <label>
                <input type="checkbox" /> Community identity or consent confirmed
              </label>
              <label>
                <input type="checkbox" /> Duplicate risk has been checked
              </label>
            </section>

            <footer className="decision-bar">
              <button
                className="reject-button"
                onClick={() => decide(selected, "Reject")}
              >
                Reject
              </button>
              <button
                className="ghost-button"
                onClick={() => decide(selected, "Clarify")}
              >
                Request clarification
              </button>
              <button
                className="approve-button"
                onClick={() => decide(selected, "Approve")}
              >
                Approve record
              </button>
            </footer>
          </article>
        </section>
      ) : (
        <section className="completion-state">
          <div>✓</div>
          <h3>The review queue is clear.</h3>
          <p>New Search AI candidates and organiser updates will appear here.</p>
          {reviewed.length > 0 ? (
            <div className="decision-history">
              {reviewed.map((item) => (
                <span key={item.id}>
                  {item.id} · {item.name} · <b>{item.decision}</b>
                </span>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function SearchAI({
  queue,
  addToQueue,
  openQueue,
}: {
  queue: ReviewItem[];
  addToQueue: (item: ReviewItem) => void;
  openQueue: () => void;
}) {
  const [location, setLocation] = useState("Maynooth, County Kildare");
  const [stage, setStage] = useState<"idle" | "searching" | "complete">("idle");

  const candidate: ReviewItem = {
    id: "AI-2084",
    sourceType: "Search AI candidate",
    community: "Maynooth Saturday Social Club",
    summary:
      "New candidate: weekly low-pressure social activity. Address and public contact require confirmation.",
    submittedBy: "Local Community Search AI",
    submitted: "Just now",
    confidence: "3 supporting public sources",
    sourceUrl: "Official page · public event listing · recent social post",
  };

  function runSearch() {
    setStage("searching");
    window.setTimeout(() => setStage("complete"), 900);
  }

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Tool-assisted discovery</span>
          <h2>Local Community Search AI</h2>
          <p>
            Discover and organise source-supported candidates for human review.
          </p>
        </div>
        <div className="rule-badge ai-rule">
          AI proposes candidates · people approve records
        </div>
      </section>

      <section className="search-workbench">
        <div className="search-config">
          <span className="step-number">Step 1</span>
          <h3>Choose the search area</h3>
          <label>
            Location
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </label>
          <label>
            Existing records
            <button className="upload-placeholder">
              <span>＋</span>
              Upload CSV or spreadsheet
              <small>Optional · used for duplicate comparison</small>
            </button>
          </label>
          <button className="primary-button full" onClick={runSearch}>
            Run sample search
          </button>
          <p className="simulation-label">
            Prototype simulation — no live web search is performed.
          </p>
        </div>

        <div className="search-process">
          <span className="step-number">Step 2</span>
          <h3>Eight parallel search branches</h3>
          <div className="branch-grid">
            {[
              "Integration services",
              "Employment support",
              "Families & youth",
              "Sports & wellbeing",
              "Arts & creativity",
              "Culture & faith",
              "Public community pages",
              "Local events",
            ].map((branch, index) => (
              <div
                key={branch}
                className={stage === "searching" ? "branch searching" : "branch"}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {branch}
              </div>
            ))}
          </div>
          <div className="process-arrow">↓</div>
          <div className="merge-step">
            <strong>Merge · standardise · compare · deduplicate</strong>
            <span>Sources remain attached to each candidate.</span>
          </div>
        </div>
      </section>

      {stage === "searching" ? (
        <section className="searching-state">
          <span className="spinner" />
          <div>
            <strong>Searching public information for {location}</strong>
            <p>Checking eight categories and comparing candidate records…</p>
          </div>
        </section>
      ) : null}

      {stage === "complete" ? (
        <section className="candidate-result">
          <div className="candidate-result-head">
            <div>
              <span className="eyebrow">Step 3 · Candidate result</span>
              <h3>{candidate.community}</h3>
            </div>
            <span className="candidate-badge">Not yet verified</span>
          </div>
          <div className="candidate-columns">
            <div>
              <span>Extracted information</span>
              <p>{candidate.summary}</p>
            </div>
            <div>
              <span>Traceable evidence</span>
              <p>{candidate.sourceUrl}</p>
              <b>{candidate.confidence}</b>
            </div>
            <div>
              <span>Required next step</span>
              <p>Send to the Community Liaison’s Review Queue.</p>
            </div>
          </div>
          <div className="candidate-actions">
            <button
              className="primary-button"
              onClick={() => {
                addToQueue(candidate);
                openQueue();
              }}
            >
              {queue.some((item) => item.id === candidate.id)
                ? "Open review queue"
                : "Send candidate to review"}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function CommunityAssistant({
  addToQueue,
  openQueue,
}: {
  addToQueue: (item: ReviewItem) => void;
  openQueue: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "event" | "status">("menu");
  const [submitted, setSubmitted] = useState(false);
  const [event, setEvent] = useState({
    community: "Maynooth Community Garden",
    eventName: "Summer Gardening Afternoon",
    date: "30 July 2026",
    time: "2:00 pm",
    venue: "Maynooth Community Centre",
    link: "https://example.org/maynooth-garden",
  });

  const ticket: ReviewItem = {
    id: "CH-1088",
    sourceType: "Community update",
    community: event.community,
    summary: `Add event: ${event.eventName} · ${event.date} · ${event.time} · ${event.venue}`,
    submittedBy: "Registered community organiser",
    submitted: "Just now",
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Two-way community channel</span>
          <h2>WhatsApp assistant simulation</h2>
          <p>
            Test how an organiser submits an update and receives a trackable
            response.
          </p>
        </div>
        <div className="rule-badge">WhatsApp ↔ n8n ↔ FastAPI</div>
      </section>

      <section className="assistant-layout">
        <div className="phone-frame">
          <header>
            <div className="wa-avatar">C</div>
            <p>
              <strong>Co.Here Community Assistant</strong>
              <span>Prototype · usually replies instantly</span>
            </p>
          </header>
          <div className="chat-body">
            <div className="bot-bubble">
              <strong>Hello! How can I help?</strong>
              <p>
                You can read approved information or send an update for Liaison
                review.
              </p>
              <time>16:34</time>
            </div>

            {mode !== "menu" ? (
              <div className="user-bubble">
                {mode === "event"
                  ? "Submit an update or add an event"
                  : "Check my submission status"}
                <time>16:35 ✓✓</time>
              </div>
            ) : null}

            {mode === "event" && !submitted ? (
              <div className="bot-bubble">
                <strong>Let’s prepare the event update.</strong>
                <p>
                  Complete the details beside this conversation. I will show a
                  final summary before anything is submitted.
                </p>
                <time>16:35</time>
              </div>
            ) : null}

            {mode === "status" ? (
              <>
                <div className="bot-bubble">
                  <strong>Submission CH-1042</strong>
                  <p>
                    Status: <b>Pending review</b>
                    <br />
                    Maynooth Community Garden · event update
                  </p>
                  <time>16:35</time>
                </div>
              </>
            ) : null}

            {submitted ? (
              <>
                <div className="user-bubble summary-bubble">
                  <strong>Confirmed event update</strong>
                  <p>
                    {event.eventName}
                    <br />
                    {event.date} · {event.time}
                    <br />
                    {event.venue}
                  </p>
                  <time>16:39 ✓✓</time>
                </div>
                <div className="bot-bubble success-bubble">
                  <strong>Thank you — reference CH-1088</strong>
                  <p>
                    Your update is Pending review. A Community Liaison will check
                    it before it appears in the public record.
                  </p>
                  <time>16:39</time>
                </div>
              </>
            ) : null}
          </div>
          <div className="persistent-menu">
            <button onClick={() => setMode("event")}>
              Submit an update or add an event
            </button>
            <button onClick={() => setMode("status")}>
              Check my submission status
            </button>
            <button onClick={() => setMode("menu")}>Main menu</button>
          </div>
        </div>

        <div className="assistant-workspace">
          {mode === "menu" ? (
            <div className="assistant-explainer">
              <span className="step-number">Choose a demonstration</span>
              <h3>The menu remains visible.</h3>
              <p>
                When an organiser selects an option, their choice appears as a
                message on their side of the conversation. The bot then continues
                the guided flow without deleting the earlier context.
              </p>
              <div className="flow-strip">
                <span>Organiser</span>
                <b>→</b>
                <span>WhatsApp</span>
                <b>→</b>
                <span>n8n</span>
                <b>→</b>
                <span>FastAPI</span>
              </div>
            </div>
          ) : null}

          {mode === "event" && !submitted ? (
            <form
              className="event-form"
              onSubmit={(formEvent) => {
                formEvent.preventDefault();
                setSubmitted(true);
                addToQueue(ticket);
              }}
            >
              <span className="step-number">Guided event update</span>
              <h3>Review the information before submission</h3>
              {Object.entries(event).map(([key, value]) => (
                <label key={key}>
                  {key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (letter) => letter.toUpperCase())}
                  <input
                    value={value}
                    onChange={(changeEvent) =>
                      setEvent((current) => ({
                        ...current,
                        [key]: changeEvent.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <div className="consent-check">
                <input id="confirm" type="checkbox" required />
                <label htmlFor="confirm">
                  I confirm that these details can be submitted to Co.Here for
                  review.
                </label>
              </div>
              <button className="primary-button full" type="submit">
                Confirm and create pending submission
              </button>
            </form>
          ) : null}

          {mode === "status" ? (
            <div className="status-explainer">
              <span className="step-number">Two-way information request</span>
              <h3>The reply comes from Co.Here’s records.</h3>
              <div className="data-path">
                <span>WhatsApp question</span>
                <b>→</b>
                <span>n8n identifies request</span>
                <b>→</b>
                <span>FastAPI reads permitted status</span>
                <b>→</b>
                <span>Short WhatsApp reply</span>
              </div>
              <p>
                If confirmed information is unavailable, the assistant should
                offer human help instead of guessing.
              </p>
            </div>
          ) : null}

          {submitted ? (
            <div className="ticket-created">
              <div>✓</div>
              <span className="eyebrow">Pending submission created</span>
              <h3>CH-1088 is now waiting for human review.</h3>
              <p>
                The proposed event has not changed the public community record.
              </p>
              <button className="primary-button" onClick={openQueue}>
                Open Liaison Review Queue
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Architecture() {
  const [journey, setJourney] = useState<"core" | "ai" | "whatsapp">("core");

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">Proposed production blueprint</span>
          <h2>How the software connects</h2>
          <p>
            Technology choices and responsibilities are separated so the
            architecture is understandable and technically accountable.
          </p>
        </div>
        <div className="rule-badge">Proposed · technical validation required</div>
      </section>

      <div className="journey-tabs">
        <button
          className={journey === "core" ? "active" : ""}
          onClick={() => setJourney("core")}
        >
          Core website
        </button>
        <button
          className={journey === "ai" ? "active" : ""}
          onClick={() => setJourney("ai")}
        >
          Search AI journey
        </button>
        <button
          className={journey === "whatsapp" ? "active" : ""}
          onClick={() => setJourney("whatsapp")}
        >
          WhatsApp journey
        </button>
      </div>

      {journey === "core" ? (
        <section className="architecture-flow">
          <ArchitectureNode
            number="01"
            title="Frontend — staff website"
            tech="HTML5 · CSS3 · TypeScript · Next.js · React"
            purpose="Builds the screens staff use: map, directory, review queue and dashboard."
            tone="blue"
          />
          <FlowArrow label="HTTPS / JSON request" />
          <ArchitectureNode
            number="02"
            title="Backend API"
            tech="Python · FastAPI · REST / JSON"
            purpose="Validates requests, applies permissions and review rules, and connects services."
            tone="teal"
          />
          <FlowArrow label="SQL query" />
          <ArchitectureNode
            number="03"
            title="Central data layer"
            tech="PostgreSQL · PostGIS · secure file storage"
            purpose="Stores communities, events, locations, sources, submissions and review history."
            tone="green"
          />
          <FlowArrow label="Approved records only" />
          <ArchitectureNode
            number="04"
            title="Deployment and security"
            tech="Docker · cloud platform · HTTPS/TLS · authentication service"
            purpose="Runs the service online, protects connections and controls staff access."
            tone="orange"
          />
        </section>
      ) : null}

      {journey === "ai" ? (
        <section className="horizontal-journey">
          {[
            ["01", "Staff website", "Staff enters a location."],
            ["02", "FastAPI", "Creates a controlled search request."],
            ["03", "Stack AI", "Eight branches discover public information."],
            ["04", "Candidate records", "Results are merged, structured and deduplicated."],
            ["05", "Review Queue", "A Liaison checks sources and decides."],
            ["06", "Database", "Only approved information becomes trusted."],
          ].map((item, index) => (
            <div className="journey-part" key={item[0]}>
              <div>
                <span>{item[0]}</span>
                <strong>{item[1]}</strong>
                <p>{item[2]}</p>
              </div>
              {index < 5 ? <b aria-hidden="true">→</b> : null}
            </div>
          ))}
        </section>
      ) : null}

      {journey === "whatsapp" ? (
        <section className="horizontal-journey whatsapp-journey">
          {[
            ["01", "Organiser", "Sends an update or question."],
            ["02", "WhatsApp Cloud API", "Receives and delivers messages."],
            ["03", "n8n", "Runs the guided workflow and moves data."],
            ["04", "FastAPI", "Validates the request and applies rules."],
            ["05", "Pending submission", "Stores the proposal without publishing it."],
            ["06", "Liaison review", "Approves, clarifies or rejects."],
          ].map((item, index) => (
            <div className="journey-part" key={item[0]}>
              <div>
                <span>{item[0]}</span>
                <strong>{item[1]}</strong>
                <p>{item[2]}</p>
              </div>
              {index < 5 ? <b aria-hidden="true">→</b> : null}
            </div>
          ))}
        </section>
      ) : null}

      <section className="architecture-notes">
        <article>
          <span>Prototype status</span>
          <h3>What works here</h3>
          <p>
            Navigation, filtering, map markers, candidate search simulation,
            organiser submission, reference creation and Liaison decisions.
          </p>
        </article>
        <article>
          <span>External services</span>
          <h3>What is simulated</h3>
          <p>
            Live Stack AI searching, WhatsApp Cloud API, n8n workflows,
            authentication, map tiles and persistent production storage.
          </p>
        </article>
        <article>
          <span>Trust boundary</span>
          <h3>What remains human</h3>
          <p>
            Source judgement, community confirmation, consent decisions and
            approval of any public record.
          </p>
        </article>
      </section>
    </div>
  );
}

function ArchitectureNode({
  number,
  title,
  tech,
  purpose,
  tone,
}: {
  number: string;
  title: string;
  tech: string;
  purpose: string;
  tone: string;
}) {
  return (
    <article className={`architecture-node node-${tone}`}>
      <span>{number}</span>
      <div>
        <h3>{title}</h3>
        <strong>Technology / standard</strong>
        <p>{tech}</p>
      </div>
      <div>
        <strong>What it does</strong>
        <p>{purpose}</p>
      </div>
    </article>
  );
}

function FlowArrow({ label }: { label: string }) {
  return (
    <div className="flow-arrow">
      <span>↓</span>
      <small>{label}</small>
    </div>
  );
}
