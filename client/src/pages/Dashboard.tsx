import DashboardTile from "@/components/DashboardTile";
import DashboardStats from "@/components/DashboardStats";
import { Upload, Users, DollarSign, FileText } from "lucide-react";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const tiles = [
    {
      title: "Upload Attendance",
      icon: Upload,
      description: "Import monthly attendance data",
      path: "/attendance",
    },
    {
      title: "Manage Employees",
      icon: Users,
      description: "View and edit employee records",
      path: "/employees",
    },
    {
      title: "Generate Salary",
      icon: DollarSign,
      description: "Calculate and approve payroll",
      path: "/payroll",
    },
    {
      title: "View Reports",
      icon: FileText,
      description: "Download salary sheets",
      path: "/reports",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Apex Inventory</h1>
      </div>

      <DashboardStats />

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiles.map((tile) => (
            <DashboardTile
              key={tile.title}
              title={tile.title}
              icon={tile.icon}
              description={tile.description}
              onClick={() => setLocation(tile.path)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
