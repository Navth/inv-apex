import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface DashboardTileProps {
  title: string;
  icon: LucideIcon;
  onClick?: () => void;
  description?: string;
}

export default function DashboardTile({ title, icon: Icon, onClick, description }: DashboardTileProps) {
  return (
    <Card
      className="min-h-32 p-6 hover-elevate active-elevate-2 cursor-pointer transition-shadow"
      onClick={onClick}
      data-testid={`tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex flex-col h-full">
        <Icon className="h-12 w-12 text-primary mb-4" />
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </Card>
  );
}
