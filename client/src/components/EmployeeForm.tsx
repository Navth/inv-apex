import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface EmployeeFormData {
  emp_id: string;
  name: string;
  civil_id: string;
  designation: string;
  category: "Direct" | "Indirect";
  project: string;
  basic_salary: string;
  other_allowance: string;
  food_allowance_type: "per_day" | "fixed" | "none";
  food_allowance_value: string;
  doj: string;
  internal_department_doj: string;
  five_year_calc_date: string;
  working_hours: string;
  indemnity_rate: string;
  leave_balance: string;
  bank_ac_no: string;
}

interface EmployeeFormProps {
  initialData?: Partial<EmployeeFormData>;
  onSubmit?: (data: EmployeeFormData) => void;
  onCancel?: () => void;
}

export default function EmployeeForm({ initialData, onSubmit, onCancel }: EmployeeFormProps) {
  const [formData, setFormData] = useState<EmployeeFormData>({
    emp_id: initialData?.emp_id || "",
    name: initialData?.name || "",
    civil_id: initialData?.civil_id || "",
    designation: initialData?.designation || "",
    category: initialData?.category || "Direct",
    project: initialData?.project || "",
    basic_salary: initialData?.basic_salary ?? "",
    other_allowance: initialData?.other_allowance ?? "",
    food_allowance_type: initialData?.food_allowance_type || "none",
    food_allowance_value: initialData?.food_allowance_value ?? "",
    doj: initialData?.doj || "",
    internal_department_doj: initialData?.internal_department_doj || "",
    five_year_calc_date: initialData?.five_year_calc_date || "",
    working_hours: initialData?.working_hours ?? "8",
    indemnity_rate: initialData?.indemnity_rate ?? "",
    leave_balance: initialData?.leave_balance ?? "30",
    bank_ac_no: initialData?.bank_ac_no ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(formData);
  };

  const updateField = (field: keyof EmployeeFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emp_id" className="text-sm font-medium">
              Employee ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="emp_id"
              value={formData.emp_id}
              onChange={(e) => updateField("emp_id", e.target.value)}
              placeholder="e.g., 101"
              required
              data-testid="input-emp-id"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="civil_id" className="text-sm font-medium">
              Civil ID
            </Label>
            <Input
              id="civil_id"
              value={formData.civil_id}
              onChange={(e) => updateField("civil_id", e.target.value)}
              placeholder="e.g., 283063009021"
              data-testid="input-civil-id"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., John Smith"
              required
              data-testid="input-name"
              className="h-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Employment Details</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="designation" className="text-sm font-medium">
              Designation <span className="text-destructive">*</span>
            </Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => updateField("designation", e.target.value)}
              placeholder="e.g., Site Engineer"
              required
              data-testid="input-designation"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => updateField("category", value)}
            >
              <SelectTrigger id="category" className="h-10" data-testid="select-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Direct">Direct</SelectItem>
                <SelectItem value="Indirect">Indirect</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project" className="text-sm font-medium">
              Department <span className="text-destructive">*</span>
            </Label>
            <Input
              id="project"
              value={formData.project}
              onChange={(e) => updateField("project", e.target.value)}
              placeholder="e.g., Engineering"
              required
              data-testid="input-project"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="doj" className="text-sm font-medium">
              Date of Joining <span className="text-destructive">*</span>
            </Label>
            <Input
              id="doj"
              type="date"
              value={formData.doj}
              onChange={(e) => updateField("doj", e.target.value)}
              required
              data-testid="input-doj"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="internal_department_doj" className="text-sm font-medium">
              DOJ to Internal Departments
            </Label>
            <Input
              id="internal_department_doj"
              type="date"
              value={formData.internal_department_doj}
              onChange={(e) => updateField("internal_department_doj", e.target.value)}
              data-testid="input-internal-doj"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="working_hours" className="text-sm font-medium">
              Working Hours (per day)
            </Label>
            <Input
              id="working_hours"
              type="number"
              min="0"
              value={formData.working_hours}
              onChange={(e) => updateField("working_hours", e.target.value)}
              placeholder="e.g., 8"
              data-testid="input-working-hours"
              className="h-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Salary Information</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="basic_salary" className="text-sm font-medium">
              Basic Salary <span className="text-destructive">*</span>
            </Label>
            <Input
              id="basic_salary"
              type="number"
              value={formData.basic_salary}
              onChange={(e) => updateField("basic_salary", e.target.value)}
              placeholder="e.g., 4500"
              required
              data-testid="input-salary"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="other_allowance" className="text-sm font-medium">
              Other Allowance
            </Label>
            <Input
              id="other_allowance"
              type="number"
              value={formData.other_allowance}
              onChange={(e) => updateField("other_allowance", e.target.value)}
              placeholder="e.g., 25"
              data-testid="input-other-allowance"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="leave_balance" className="text-sm font-medium">
              Leave Balance
            </Label>
            <Input
              id="leave_balance"
              type="number"
              value={formData.leave_balance}
              onChange={(e) => updateField("leave_balance", e.target.value)}
              placeholder="e.g., 30"
              data-testid="input-leave-balance"
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="five_year_calc_date" className="text-sm font-medium">
              5 Year Calculation Date
            </Label>
            <Input
              id="five_year_calc_date"
              type="date"
              value={formData.five_year_calc_date}
              onChange={(e) => updateField("five_year_calc_date", e.target.value)}
              data-testid="input-five-year-date"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="indemnity_rate" className="text-sm font-medium">
              Indemnity Rate (per day)
            </Label>
            <Input
              id="indemnity_rate"
              type="number"
              value={formData.indemnity_rate}
              onChange={(e) => updateField("indemnity_rate", e.target.value)}
              placeholder="e.g., 15"
              data-testid="input-indemnity-rate"
              className="h-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Food Allowance Type</Label>
          <RadioGroup
            value={formData.food_allowance_type}
            onValueChange={(value) => updateField("food_allowance_type", value)}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="per_day" id="per_day" data-testid="radio-per-day" />
              <Label htmlFor="per_day" className="font-normal cursor-pointer">Per Day</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" data-testid="radio-fixed" />
              <Label htmlFor="fixed" className="font-normal cursor-pointer">Fixed</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="none" data-testid="radio-none" />
              <Label htmlFor="none" className="font-normal cursor-pointer">None</Label>
            </div>
          </RadioGroup>
        </div>

        {formData.food_allowance_type !== "none" && (
          <div className="space-y-2">
            <Label htmlFor="food_allowance_value" className="text-sm font-medium">
              Food Allowance Value
            </Label>
            <Input
              id="food_allowance_value"
              type="number"
              value={formData.food_allowance_value}
              onChange={(e) => updateField("food_allowance_value", e.target.value)}
              placeholder="e.g., 10"
              data-testid="input-food-allowance"
              className="h-10"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Bank Details</h3>
        <div className="space-y-2">
          <Label htmlFor="bank_ac_no" className="text-sm font-medium">
            Bank Account Number
          </Label>
          <Input
            id="bank_ac_no"
            value={formData.bank_ac_no}
            onChange={(e) => updateField("bank_ac_no", e.target.value)}
            placeholder="e.g., 1234567890"
            data-testid="input-bank-account"
            className="h-10"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          Save Employee
        </Button>
      </div>
    </form>
  );
}
