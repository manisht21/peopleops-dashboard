import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";

interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string | null;
  profiles: {
    name: string;
    email: string;
  };
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const Attendance = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const { toast } = useToast();
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!roleLoading) {
      fetchAttendanceRecords();
      if (isAdmin) {
        fetchEmployees();
      }
    }
  }, [roleLoading, isAdmin]);

  const fetchAttendanceRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("attendance")
        .select(`
          id,
          user_id,
          clock_in,
          clock_out,
          notes,
          profiles!attendance_user_id_fkey (
            name,
            email
          )
        `)
        .order("clock_in", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("name");

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClockIn = async () => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can mark attendance",
        variant: "destructive",
      });
      return;
    }

    if (!selectedEmployee) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("attendance")
        .insert({
          user_id: selectedEmployee,
          marked_by: user.id,
          notes: notes || null,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Clock in recorded successfully",
      });

      setSelectedEmployee("");
      setNotes("");
      fetchAttendanceRecords();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClockOut = async (recordId: string) => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only admins can mark attendance",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("attendance")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", recordId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Clock out recorded successfully",
      });

      fetchAttendanceRecords();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">
            Track and manage employee attendance
          </p>
        </div>

        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Mark Attendance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} ({employee.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this attendance entry"
                />
              </div>

              <Button onClick={handleClockIn} className="w-full">
                <Clock className="mr-2 h-4 w-4" />
                Clock In
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceRecords.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No attendance records found
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Notes</TableHead>
                    {isAdmin && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.map((record) => {
                    const clockIn = new Date(record.clock_in);
                    const clockOut = record.clock_out ? new Date(record.clock_out) : null;
                    const duration = clockOut
                      ? Math.round((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) * 10) / 10
                      : null;

                    return (
                      <TableRow key={record.id}>
                        <TableCell>{record.profiles.name}</TableCell>
                        <TableCell>{format(clockIn, "PPp")}</TableCell>
                        <TableCell>
                          {clockOut ? (
                            <span className="flex items-center text-green-600">
                              <CheckCircle className="mr-1 h-4 w-4" />
                              {format(clockOut, "PPp")}
                            </span>
                          ) : (
                            <span className="flex items-center text-orange-600">
                              <AlertCircle className="mr-1 h-4 w-4" />
                              Not clocked out
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{duration ? `${duration} hours` : "-"}</TableCell>
                        <TableCell>{record.notes || "-"}</TableCell>
                        {isAdmin && (
                          <TableCell>
                            {!record.clock_out && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleClockOut(record.id)}
                              >
                                Clock Out
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
