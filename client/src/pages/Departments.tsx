import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus } from "lucide-react";
import type { Dept } from "@shared/schema";
import { deptApi } from "@/api/dept";

export default function Departments() {
  const { toast } = useToast();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadDepts() {
    setLoading(true);
    try {
      const data = await deptApi.getAll();
      setDepts(data ?? []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load departments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDepts();
  }, []);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) {
      toast({ title: "Invalid", description: "Department name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await deptApi.create(name);
      toast({ title: "Success", description: "Department added" });
      setNewName("");
      setIsAddOpen(false);
      await loadDepts();
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to add department",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Departments</h1>
        <p className="text-muted-foreground">
          Manage departments. Employees are assigned to a department; attendance can be uploaded per department per month.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Departments
            </CardTitle>
            <CardDescription>Add or view departments used for employees and attendance uploads.</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : depts.length === 0 ? (
            <p className="text-muted-foreground">No departments yet. Add one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {depts.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between py-2 px-3 rounded-md border bg-card"
                >
                  <span className="font-medium">{d.name}</span>
                  <span className="text-muted-foreground text-sm">ID: {d.id}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department</DialogTitle>
            <DialogDescription>Enter a name for the new department. It will be available for employees and attendance uploads.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name</Label>
              <Input
                id="dept-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Engineering"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
