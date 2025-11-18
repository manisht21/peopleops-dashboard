-- Fix RLS policies for leaves and profiles to ensure proper joins

-- Drop existing policies on leaves
DROP POLICY IF EXISTS "Users can view own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Users can create own leaves" ON public.leaves;
DROP POLICY IF EXISTS "Only admins can update leaves" ON public.leaves;
DROP POLICY IF EXISTS "Only admins can delete leaves" ON public.leaves;

-- Create comprehensive leave policies
CREATE POLICY "Users can view own leaves or admins view all"
  ON public.leaves
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can insert own leaves"
  ON public.leaves
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update leaves"
  ON public.leaves
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete leaves"
  ON public.leaves
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update profiles policies to ensure joins work
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;

CREATE POLICY "Profiles viewable by owner or admin"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.leaves
      WHERE leaves.user_id = profiles.id
      AND (leaves.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );