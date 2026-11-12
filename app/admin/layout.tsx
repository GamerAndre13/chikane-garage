import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex" style={{ backgroundColor: "var(--background-alt)" }}>
      <AdminSidebar />
      <div className="min-w-0 flex-1 p-4 pb-16 sm:p-6 lg:p-8" style={{ color: "var(--foreground)" }}>
        {children}
      </div>
    </div>
  );
}
