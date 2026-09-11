-- Supabase Setup SQL for Bedriftsportal

-- Create profiles table linked to auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow company members to read profiles of other members in the same company
CREATE POLICY "Company members can view profiles of people in their company"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM company_members WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create a profile automatically when a user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Since we can't run this directly on Supabase via frontend API, the owner needs to run this in their Supabase SQL editor.
ALTER TABLE company_members ADD COLUMN user_email TEXT;

-- Task 1: Add user_email to company_members
-- ALTER TABLE company_members ADD COLUMN user_email TEXT;

-- Update create_company RPC to include user_email
CREATE OR REPLACE FUNCTION public.create_company(company_name TEXT, new_join_code TEXT, user_email TEXT)
RETURNS json AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO public.companies (name, join_code)
  VALUES (company_name, new_join_code)
  RETURNING id INTO new_company_id;

  INSERT INTO public.company_members (company_id, user_id, role, user_email)
  VALUES (new_company_id, auth.uid(), 'admin', user_email);

  RETURN json_build_object('company_id', new_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update join_company RPC to include user_email
CREATE OR REPLACE FUNCTION public.join_company(code TEXT, user_email TEXT)
RETURNS json AS $$
DECLARE
  target_company_id UUID;
BEGIN
  SELECT id INTO target_company_id FROM public.companies WHERE join_code = code LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Ugyldig kode';
  END IF;

  INSERT INTO public.company_members (company_id, user_id, role, user_email)
  VALUES (target_company_id, auth.uid(), 'employee', user_email);

  RETURN json_build_object('company_id', target_company_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
