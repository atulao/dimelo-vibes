-- Update has_org_access function to also check organization ownership
CREATE OR REPLACE FUNCTION public.has_org_access(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id 
    AND (ur.organization_id = _org_id OR ur.role = 'admin')
  ) OR EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = _org_id
    AND o.owner_id = _user_id
  )
$$;