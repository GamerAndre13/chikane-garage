import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--background-alt)" }}>
      <AdminSidebar />
      <div className="flex-1 p-8" style={{ color: "var(--foreground)" }}>
        {children}
      </div>
    </div>
  );
}