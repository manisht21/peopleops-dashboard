-- Fix profiles table RLS policy to prevent email exposure
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));

-- Fix user_roles table RLS policy to prevent role exposure
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own role or admins can view all"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));