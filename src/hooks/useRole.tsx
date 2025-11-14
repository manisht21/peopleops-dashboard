import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type UserRole = "admin" | "user" | null;

export const useRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    if (!user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setRole(data?.role || "user");
    } catch (error) {
      console.error("Error fetching role:", error);
      setRole("user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();

    // Refresh role on tab focus (to catch backend changes)
    const handleFocus = () => fetchRole();
    window.addEventListener("focus", handleFocus);

    return () => window.removeEventListener("focus", handleFocus);
  }, [user?.id]);

  const isAdmin = role === "admin";

  return { role, isAdmin, loading, refetchRole: fetchRole };
};
