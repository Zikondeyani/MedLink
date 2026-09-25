/* ============================================================
   MedLink — database types (hand-maintained, generated-style)
   Mirrors supabase/migrations/20260925120000_auth_roles.sql so the
   Supabase client is fully typed. Re-generate with the Supabase CLI
   once more migrations land:

     npx supabase gen types typescript --project-id <ref> \
       --schema public > src/lib/database.types.ts
   ============================================================ */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** Account role — decided by HOW the account was created. */
export type UserRole = "customer" | "supplier" | "admin";

/** Active accounts can sign in; suspended accounts cannot. */
export type AccountStatus = "active" | "suspended";

export type KycStatus = "pending" | "approved" | "rejected";

// NB: these are type aliases (not interfaces) on purpose — the Supabase client
// generic requires table rows to be assignable to Record<string, unknown>, and
// only object *type literals* get an implicit index signature.

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  status: AccountStatus;
  /** Marketplace tenant id for an approved supplier account. */
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierApplicationRow = {
  id: string;
  ref: string;
  applicant_id: string | null;
  business_name: string;
  business_type: string;
  category_focus: string;
  website: string | null;
  contact_email: string;
  phone: string;
  city: string;
  area: string;
  registration_number: string;
  director_name: string;
  director_id_type: string;
  director_id_number: string;
  operating_account: Json | null;
  documents: Json;
  status: KycStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
};

export type ApplicationStatusRow = {
  ref: string;
  business_name: string;
  status: KycStatus;
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
};

type ProfileInsert = {
  id: string;
  email: string;
  full_name?: string;
  phone?: string | null;
  role?: UserRole;
  status?: AccountStatus;
  supplier_id?: string | null;
};

type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "created_at" | "updated_at">>;

type SupplierApplicationInsert = {
  id?: string;
  ref?: string;
  applicant_id?: string | null;
  business_name: string;
  business_type: string;
  category_focus: string;
  website?: string | null;
  contact_email: string;
  phone: string;
  city: string;
  area: string;
  registration_number: string;
  director_name: string;
  director_id_type: string;
  director_id_number: string;
  operating_account?: Json | null;
  documents?: Json;
  status?: KycStatus;
};

type SupplierApplicationUpdate = Partial<Omit<SupplierApplicationRow, "id" | "ref" | "submitted_at">>;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      supplier_applications: {
        Row: SupplierApplicationRow;
        Insert: SupplierApplicationInsert;
        Update: SupplierApplicationUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      current_profile: { Args: Record<string, never>; Returns: ProfileRow };
      application_status_by_ref: {
        Args: { application_ref: string };
        Returns: ApplicationStatusRow[];
      };
      admin_set_account_role: {
        Args: { target: string; new_role: UserRole };
        Returns: ProfileRow;
      };
      admin_set_account_status: {
        Args: { target: string; new_status: AccountStatus };
        Returns: ProfileRow;
      };
      admin_review_supplier_application: {
        Args: {
          application_id: string;
          decision: KycStatus;
          note?: string | null;
          tenant_id?: string | null;
        };
        Returns: SupplierApplicationRow;
      };
    };
    Enums: {
      user_role: UserRole;
      account_status: AccountStatus;
      kyc_status: KycStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
