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
import { Building2, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Dept } from "@shared/schema";
import { deptApi } from "@/api/dept";

export default function Departments() {
  const { toast } = useToast();
  const [depts, setDepts] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

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
      toast({ title: "Invalid", description: "Name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await deptApi.create(name);
      toast({ title: "Success", description: "Added successfully" });
      setNewName("");
      setIsAddOpen(false);
      await loadDepts();
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to add",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleCompleted(d: Dept) {
    setTogglingId(d.id);
    try {
      const newCompleted = !(d as Dept & { completed?: boolean }).completed;
      await deptApi.update(d.id, { completed: newCompleted });
      toast({
        title: "Updated",
        description: newCompleted ? "Marked as completed" : "Marked as in progress",
      });
      await loadDepts();
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Failed to update",
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  }

  async function handleConfirmRemove(id: number) {
    try {
      await deptApi.delete(id);
      toast({ title: "Removed", description: "Department / project removed" });
      setDeleteId(null);
      await loadDepts();
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Cannot remove if employees are assigned. Reassign them first.",
        variant: "destructive",
      });
    }
  }

  const isCompleted = (d: Dept) => "completed" in d && Boolean((d as { completed?: boolean }).completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Department / Projects</h1>
        <p className="text-muted-foreground">
          Manage departments and projects. Mark as completed when done; remove if no longer needed. Employees are assigned to one.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Department / Projects
            </CardTitle>
            <CardDescription>Add new, mark completed, or remove. Used for employees and attendance.</CardDescription>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department / Project
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : depts.length === 0 ? (
            <p className="text-muted-foreground">None yet. Add one to get started.</p>
          ) : (
            <ul className="space-y-2">
              {depts.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center justify-between gap-4 py-3 px-4 rounded-md border bg-card ${isCompleted(d) ? "opacity-75" : ""}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-medium truncate">{d.name}</span>
                    {isCompleted(d) && (
                      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Completed</span>
                      <Switch
                        checked={isCompleted(d)}
                        onCheckedChange={() => handleToggleCompleted(d)}
                        disabled={togglingId === d.id}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(d.id)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this department / project?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. If any employees are assigned to it, you must reassign them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId != null && handleConfirmRemove(deleteId)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Department / Project</DialogTitle>
            <DialogDescription>Enter a name. It will be available for employees and attendance.</DialogDescription>
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
