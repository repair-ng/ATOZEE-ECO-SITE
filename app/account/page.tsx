import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNaira } from "@/lib/site-config";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?returnTo=/account");

  const [orders, quotes] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.quoteRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-10">
      <div>
        <h1 className="mb-1 text-2xl font-bold">
          {user.firstName} {user.lastName}
        </h1>
        <p className="text-slate-600">{user.email}</p>
        {user.phone && <p className="text-slate-600">{user.phone}</p>}
        {(user.address || user.city || user.state) && (
          <p className="text-slate-600">
            {[user.address, user.city, user.state].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="part-plate">{o.id.slice(0, 8).toUpperCase()}</span>
                <span>{formatNaira(Number(o.amount))}</span>
                <span className="capitalize">{o.status}</span>
                <span className="text-slate-500">{o.createdAt.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Quote requests</h2>
        {quotes.length === 0 ? (
          <p className="text-sm text-slate-500">No quote requests yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {quotes.map((q) => (
              <li key={q.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="part-plate">{q.id.slice(0, 8).toUpperCase()}</span>
                <span className="capitalize">{q.deliveryMethod}</span>
                <span className="capitalize">{q.status}</span>
                <span className="text-slate-500">{q.createdAt.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
