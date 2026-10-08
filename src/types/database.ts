
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "activities": {
                  Row: {
                    "category": string | null,"created_at": string,"created_by": string | null,"default_duration_min": number | null,"description": string | null,"id": string,"is_active": boolean,"kind": string,"name": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: string | null,"created_at"?: string,"created_by"?: string | null,"default_duration_min"?: number | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"name": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "category"?: string | null,"created_at"?: string,"created_by"?: string | null,"default_duration_min"?: number | null,"description"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"name"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activities_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance": {
                  Row: {
                    "attendance_date": string,"check_in": string | null,"check_out": string | null,"created_at": string,"created_by": string | null,"id": string,"remarks": string | null,"status": string,"student_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attendance_date": string,"check_in"?: string | null,"check_out"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"remarks"?: string | null,"status": string,"student_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "attendance_date"?: string,"check_in"?: string | null,"check_out"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"remarks"?: string | null,"status"?: string,"student_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"changed_at": string,"changed_by": string | null,"id": number,"new_data": Json | null,"old_data": Json | null,"record_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"record_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"changed_at"?: string,"changed_by"?: string | null,"id"?: never,"new_data"?: Json | null,"old_data"?: Json | null,"record_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"parents": {
                  Row: {
                    "address": string | null,"alternate_phone": string | null,"created_at": string,"created_by": string | null,"email": string | null,"full_name": string,"id": string,"phone": string | null,"profile_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"alternate_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name": string,"id"?: string,"phone"?: string | null,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"alternate_phone"?: string | null,"created_at"?: string,"created_by"?: string | null,"email"?: string | null,"full_name"?: string,"id"?: string,"phone"?: string | null,"profile_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "parents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "parents_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string | null,"full_name": string,"id": string,"is_active": boolean,"phone": string | null,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id": string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"phone"?: string | null,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"progress_updates": {
                  Row: {
                    "area": string,"attention_areas": string | null,"created_at": string,"created_by": string | null,"id": string,"improvements": string | null,"level": number | null,"observations": string,"recommendations": string | null,"record_date": string,"shared_with_parent": boolean,"student_id": string,"trend": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area": string,"attention_areas"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"improvements"?: string | null,"level"?: number | null,"observations": string,"recommendations"?: string | null,"record_date"?: string,"shared_with_parent"?: boolean,"student_id": string,"trend"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "area"?: string,"attention_areas"?: string | null,"created_at"?: string,"created_by"?: string | null,"id"?: string,"improvements"?: string | null,"level"?: number | null,"observations"?: string,"recommendations"?: string | null,"record_date"?: string,"shared_with_parent"?: boolean,"student_id"?: string,"trend"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "progress_updates_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_updates_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_updates_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"staff_details": {
                  Row: {
                    "created_at": string,"designation": string | null,"joined_on": string | null,"profile_id": string,"qualification": string | null,"specialization": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"designation"?: string | null,"joined_on"?: string | null,"profile_id": string,"qualification"?: string | null,"specialization"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"designation"?: string | null,"joined_on"?: string | null,"profile_id"?: string,"qualification"?: string | null,"specialization"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_details_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_activities": {
                  Row: {
                    "activity_id": string | null,"category": string | null,"completed_at": string | null,"created_at": string,"created_by": string | null,"duration_min": number | null,"goal": string | null,"id": string,"kind": string,"performance_rating": number | null,"scheduled_date": string,"scheduled_time": string | null,"staff_remarks": string | null,"status": string,"student_id": string,"title": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "activity_id"?: string | null,"category"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"duration_min"?: number | null,"goal"?: string | null,"id"?: string,"kind"?: string,"performance_rating"?: number | null,"scheduled_date": string,"scheduled_time"?: string | null,"staff_remarks"?: string | null,"status"?: string,"student_id": string,"title": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "activity_id"?: string | null,"category"?: string | null,"completed_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"duration_min"?: number | null,"goal"?: string | null,"id"?: string,"kind"?: string,"performance_rating"?: number | null,"scheduled_date"?: string,"scheduled_time"?: string | null,"staff_remarks"?: string | null,"status"?: string,"student_id"?: string,"title"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_activities_activity_id_fkey"
      columns: ["activity_id"]
isOneToOne: false
      referencedRelation: "activities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_activities_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_activities_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_activities_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"student_parents": {
                  Row: {
                    "created_at": string,"id": string,"is_primary_contact": boolean,"parent_id": string,"relationship": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_primary_contact"?: boolean,"parent_id": string,"relationship": string,"student_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_primary_contact"?: boolean,"parent_id"?: string,"relationship"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_parents_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "parents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_parents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"student_staff_assignments": {
                  Row: {
                    "assigned_by": string | null,"assignment_role": string | null,"created_at": string,"ends_on": string | null,"id": string,"notes": string | null,"staff_id": string,"starts_on": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_by"?: string | null,"assignment_role"?: string | null,"created_at"?: string,"ends_on"?: string | null,"id"?: string,"notes"?: string | null,"staff_id": string,"starts_on"?: string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "assigned_by"?: string | null,"assignment_role"?: string | null,"created_at"?: string,"ends_on"?: string | null,"id"?: string,"notes"?: string | null,"staff_id"?: string,"starts_on"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_staff_assignments_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_staff_assignments_staff_id_fkey"
      columns: ["staff_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "student_staff_assignments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "address": string | null,"admission_number": string,"blood_group": string | null,"created_at": string,"created_by": string | null,"date_of_birth": string | null,"diagnosis": string | null,"discharged_on": string | null,"enrollment_date": string,"full_name": string,"gender": string | null,"id": string,"medical_notes": string | null,"notes": string | null,"photo_path": string | null,"school_name": string | null,"status": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"admission_number": string,"blood_group"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"diagnosis"?: string | null,"discharged_on"?: string | null,"enrollment_date"?: string,"full_name": string,"gender"?: string | null,"id"?: string,"medical_notes"?: string | null,"notes"?: string | null,"photo_path"?: string | null,"school_name"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"admission_number"?: string,"blood_group"?: string | null,"created_at"?: string,"created_by"?: string | null,"date_of_birth"?: string | null,"diagnosis"?: string | null,"discharged_on"?: string | null,"enrollment_date"?: string,"full_name"?: string,"gender"?: string | null,"id"?: string,"medical_notes"?: string | null,"notes"?: string | null,"photo_path"?: string | null,"school_name"?: string | null,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "students_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "app_role": "admin"|"staff"|"parent"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "app_role": ["admin", "staff", "parent"]
          }
        }
} as const
