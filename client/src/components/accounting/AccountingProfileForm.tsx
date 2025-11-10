import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Building2, Calendar, DollarSign, MapPin } from "lucide-react";
import type { AccountingProfile } from "@db/schema";

interface AccountingProfileFormProps {
  clientId: number;
}

export function AccountingProfileForm({ clientId }: AccountingProfileFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [entityType, setEntityType] = useState<string>("");
  const [fiscalYearEnd, setFiscalYearEnd] = useState<string>("");
  const [formationState, setFormationState] = useState<string>("");
  const [formationDate, setFormationDate] = useState<string>("");
  const [ein, setEin] = useState<string>("");
  const [accountingMethod, setAccountingMethod] = useState<string>("accrual");
  const [notes, setNotes] = useState<string>("");

  // Fetch existing profile
  const { data: profileData, isLoading } = useQuery<{ success: boolean; data: AccountingProfile }>({
    queryKey: [`/api/accounting-profiles/${clientId}`],
    queryFn: async () => {
      const response = await fetch(`/api/accounting-profiles/${clientId}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) {
          // No profile exists yet, return null
          return { success: true, data: null as any };
        }
        throw new Error("Failed to fetch accounting profile");
      }
      return response.json();
    },
  });

  const profile = profileData?.data;

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setEntityType(profile.entityType || "");
      setFiscalYearEnd(profile.fiscalYearEnd || "");
      setFormationState(profile.formationState || "");
      setFormationDate(profile.formationDate ? new Date(profile.formationDate).toISOString().split('T')[0] : "");
      setEin(profile.ein || "");
      setAccountingMethod(profile.accountingMethod || "accrual");
      setNotes(profile.notes || "");
    }
  }, [profile]);

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/accounting-profiles/${clientId}/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save accounting profile");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Accounting profile ${data.action}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/accounting-profiles/${clientId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      clientId,
      entityType: entityType || undefined,
      fiscalYearEnd: fiscalYearEnd || undefined,
      formationState: formationState || undefined,
      formationDate: formationDate || undefined,
      ein: ein || undefined,
      accountingMethod,
      notes: notes || undefined,
    };

    upsertMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Accounting Profile
          </CardTitle>
          <CardDescription>
            Entity information, fiscal details, and tax classification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entity Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Entity Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entityType">Entity Type *</Label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger id="entityType">
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sole_prop">Sole Proprietorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="llc">LLC (Disregarded)</SelectItem>
                    <SelectItem value="llc_partnership">LLC (Partnership)</SelectItem>
                    <SelectItem value="llc_s_corp">LLC (S-Corp)</SelectItem>
                    <SelectItem value="s_corp">S-Corporation</SelectItem>
                    <SelectItem value="c_corp">C-Corporation</SelectItem>
                    <SelectItem value="nonprofit">Nonprofit (501c3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formationState">Formation State</Label>
                <Input
                  id="formationState"
                  value={formationState}
                  onChange={(e) => setFormationState(e.target.value.toUpperCase())}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="formationDate">Formation Date</Label>
                <Input
                  id="formationDate"
                  type="date"
                  value={formationDate}
                  onChange={(e) => setFormationDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ein">EIN (Employer ID Number)</Label>
                <Input
                  id="ein"
                  value={ein}
                  onChange={(e) => setEin(e.target.value)}
                  placeholder="12-3456789"
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          {/* Fiscal Details Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fiscal Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fiscalYearEnd">Fiscal Year-End *</Label>
                <Input
                  id="fiscalYearEnd"
                  value={fiscalYearEnd}
                  onChange={(e) => setFiscalYearEnd(e.target.value)}
                  placeholder="12/31"
                  maxLength={5}
                />
                <p className="text-xs text-gray-500">Format: MM/DD (e.g., 12/31 for Dec 31)</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountingMethod">Accounting Method</Label>
                <Select value={accountingMethod} onValueChange={setAccountingMethod}>
                  <SelectTrigger id="accountingMethod">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Basis</SelectItem>
                    <SelectItem value="accrual">Accrual Basis</SelectItem>
                    <SelectItem value="hybrid">Hybrid Method</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional information about this client's accounting setup..."
              rows={3}
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button type="submit" disabled={upsertMutation.isPending || !entityType || !fiscalYearEnd}>
              {upsertMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {profile ? "Update Profile" : "Create Profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
