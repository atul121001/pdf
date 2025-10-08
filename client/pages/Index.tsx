import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer } from "recharts";
import { initRUM, getRumBuffer } from "@/lib/rum";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { PDFGenerationRequest } from "@shared/api";

interface RumState {
  TTFB?: number;
  FCP?: number;
  LCP?: number;
  CLS?: number;
  FID?: number;
}

function useRUM() {
  const [state, setState] = useState<RumState>({});
  const [events, setEvents] = useState(() => getRumBuffer());

  useEffect(() => {
    initRUM();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      setState((s) => ({ ...s, [detail.name]: detail.value }));
      setEvents((prev) => [...prev, detail]);
    };
    addEventListener("rum:metric", handler as EventListener);
    return () => removeEventListener("rum:metric", handler as EventListener);
  }, []);

  return { state, events };
}

function generateSeries(days = 180) {
  const res: Array<{
    date: string;
    revenue: number;
    users: number;
    orders: number;
  }> = [];
  const start = new Date();
  start.setDate(start.getDate() - days);
  let rev = 1000,
    users = 200,
    orders = 80;
  for (let i = 0; i < days; i++) {
    start.setDate(start.getDate() + 1);
    rev += Math.sin(i / 7) * 60 + (Math.random() - 0.5) * 120;
    users += Math.cos(i / 9) * 8 + (Math.random() - 0.5) * 16;
    orders += Math.sin(i / 5) * 4 + (Math.random() - 0.5) * 10;
    res.push({
      date: start.toISOString().slice(0, 10),
      revenue: Math.max(100, Math.round(rev)),
      users: Math.max(0, Math.round(users)),
      orders: Math.max(0, Math.round(orders)),
    });
  }
  return res;
}

function generateTableRows(n = 800) {
  const statuses = ["paid", "pending", "failed"] as const;
  const names = [
    "Alex",
    "Sam",
    "Jordan",
    "Taylor",
    "Riley",
    "Casey",
    "Avery",
    "Jamie",
    "Cameron",
    "Drew",
  ];
  return Array.from({ length: n }).map((_, i) => {
    const name = names[Math.floor(Math.random() * names.length)];
    const amount = +(Math.random() * 1500 + 20).toFixed(2);
    const dt = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 120);
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const email = `${name.toLowerCase()}${i}@example.com`;
    return {
      id: i + 1,
      customer: name + " " + String.fromCharCode(65 + ((i * 7) % 26)),
      email,
      amount,
      status,
      date: dt.toISOString().slice(0, 10),
    };
  });
}

function DashboardContent({
  description,
  series,
  rows,
  rum,
  rumEvents,
}: {
  description: string;
  series: Array<{
    date: string;
    revenue: number;
    users: number;
    orders: number;
  }>;
  rows: Array<{
    id: number;
    customer: string;
    email: string;
    amount: number;
    status: string;
    date: string;
  }>;
  rum: RumState;
  rumEvents: { name: string; value: number }[];
}) {
  const kpis = useMemo(() => {
    const totalRevenue = series.reduce((a, b) => a + b.revenue, 0);
    const totalOrders = series.reduce((a, b) => a + b.orders, 0);
    const avgUsers = Math.round(
      series.reduce((a, b) => a + b.users, 0) / series.length,
    );
    return { totalRevenue, totalOrders, avgUsers };
  }, [series]);

  return (
    <main
      role="document"
      aria-label="Dashboard content"
      style={{ fontSize: "12px", lineHeight: 1.3 }}
    >
      <p role="doc-subtitle" style={{ color: "#6B7280" }}>
        {description}
      </p>

      {/* KPI Cards */}
      <section
        role="region"
        aria-label="Key Performance Indicators"
        className="charts grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        {["Revenue", "Orders", "Active Users"].map((label, idx) => {
          const value =
            label === "Revenue"
              ? `$${(kpis.totalRevenue / 1000).toFixed(1)}k`
              : label === "Orders"
                ? kpis.totalOrders.toLocaleString()
                : kpis.avgUsers.toLocaleString();
          const chartData =
            label === "Revenue"
              ? series.slice(-60)
              : label === "Orders"
                ? series.slice(-30)
                : series.slice(-45);
          const chartType = label === "Orders" ? "bar" : "area";
          const gradientId = label + "Grad";

          return (
            <article
              key={label}
              role="article"
              aria-labelledby={label.toLowerCase().replace(" ", "-")}
              style={{
                borderRadius: "1rem",
                border: "1px solid #ccc",
                padding: "16px",
              }}
            >
              <h2
                id={label.toLowerCase().replace(" ", "-")}
                role="heading"
                aria-level={2}
                style={{ fontSize: "14px", color: "#6B7280" }}
              >
                {label}
              </h2>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginTop: "8px",
                }}
              >
                {value}
              </div>
              <div style={{ height: "100px", width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "area" ? (
                    <AreaChart data={chartData} role="graphics-document">
                      <defs>
                        <linearGradient
                          id={gradientId}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3B82F6"
                            stopOpacity={0.5}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3B82F6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey={label === "Revenue" ? "revenue" : "users"}
                        stroke="#3B82F6"
                        fill={`url(#${gradientId})`}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} role="graphics-document">
                      <Bar
                        dataKey="orders"
                        fill="#F97316"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </article>
          );
        })}
      </section>

      {/* Transactions Table */}
      <section
        role="region"
        aria-label="Transactions Table"
        style={{
          border: "1px solid #ccc",
          borderRadius: "1rem",
          padding: "16px",
          marginTop: "16px",
        }}
      >
        <h2
          role="heading"
          aria-level={2}
          style={{ fontWeight: "600", marginBottom: "12px" }}
        >
          Transactions
        </h2>
        <div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            {/* <caption className="sr-only">Transactions data</caption> */}
            <thead
              style={{
                position: "sticky",
                top: 0,
                backgroundColor: "#F3F4F6",
                color: "#6B7280",
              }}
            >
              <tr>
                {["ID", "Customer", "Email", "Amount", "Status", "Date"].map(
                  (h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{
                        textAlign: h === "Amount" ? "right" : "left",
                        padding: "8px",
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  id={`transaction-row-${r.id}`}
                  style={{
                    backgroundColor: r.id % 2 === 1 ? "#F9FAFB" : "white",
                  }}
                >
                  <td style={{ padding: "8px" }}>{r.id}</td>
                  <td style={{ padding: "8px" }}>{r.customer}</td>
                  <td style={{ padding: "8px", color: "#6B7280" }}>
                    {r.email}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    ${r.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: "8px" }}>
                    <span
                      style={{
                        color:
                          r.status === "paid"
                            ? "#16A34A"
                            : r.status === "pending"
                              ? "#D97706"
                              : "#DC2626",
                      }}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px" }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default function Index() {
  const series = useMemo(() => generateSeries(210), []);
  const rows = useMemo(() => generateTableRows(10), []);
  const { state: rum, events: rumEvents } = useRUM();

  const exportPDF = async () => {
    try {
      const contentElement = document.querySelector(
        ".p-4.md\\:p-6",
      ) as HTMLElement;
      if (!contentElement) return alert("Content not found for PDF export");

      const clonedContent = contentElement.cloneNode(true) as HTMLElement;
      clonedContent
        .querySelectorAll(".print\\:hidden")
        .forEach((el) => el.remove());

      const htmlContent = clonedContent.innerHTML;
      const cssContent = `
        body { font-size: 12px; line-height: 1.3; }
        table { border-collapse: collapse; }
        .grid { display: block !important; }
        .recharts-wrapper { max-width: 100%; }
        .print\\:hidden { display: none !important; }
      `;

      const pdfRequest: PDFGenerationRequest = {
        html: htmlContent,
        css: cssContent,
        title: "RUM Dashboard Report",
        format: "A4",
        orientation: "portrait",
      };

      const buttonElement = document.querySelector(
        "button",
      ) as HTMLButtonElement;
      if (buttonElement) {
        buttonElement.textContent = "Generating PDF...";
        buttonElement.disabled = true;
      }

      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pdfRequest),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RUM_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (buttonElement) {
        buttonElement.textContent = "Export PDF";
        buttonElement.disabled = false;
      }
    } catch (error) {
      console.error(error);
      alert(
        `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      const buttonElement = document.querySelector(
        "button",
      ) as HTMLButtonElement;
      if (buttonElement) {
        buttonElement.textContent = "Export PDF";
        buttonElement.disabled = false;
      }
    }
  };

  return (
    <div className="p-4 md:p-6">
      <Tabs defaultValue="overview">
        <div className="flex items-center justify-between mb-4 gap-2 print:hidden">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          <Button onClick={exportPDF} className="shrink-0">
            <FileDown className="mr-2" /> Export PDF
          </Button>
        </div>

        <TabsContent value="overview">
          <DashboardContent
            description="Overview: Key business KPIs with revenue, orders, users, and trends."
            series={series}
            rows={rows}
            rum={rum}
            rumEvents={rumEvents}
          />
        </TabsContent>

        <TabsContent value="performance">
          <DashboardContent
            description="Performance: In-depth charts with colored fills for visual comparison."
            series={series}
            rows={rows}
            rum={rum}
            rumEvents={rumEvents}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
