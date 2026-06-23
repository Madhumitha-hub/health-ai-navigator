export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          disease: string
          doctor_id: string
          id: string
          message: string
          patient_id: string | null
          prediction_id: string | null
          risk_category: string
          risk_level: string
          risk_score: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disease: string
          doctor_id: string
          id?: string
          message: string
          patient_id?: string | null
          prediction_id?: string | null
          risk_category: string
          risk_level: string
          risk_score: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disease?: string
          doctor_id?: string
          id?: string
          message?: string
          patient_id?: string | null
          prediction_id?: string | null
          risk_category?: string
          risk_level?: string
          risk_score?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
        }
        Relationships: []
      }
      datasets: {
        Row: {
          created_at: string
          disease_type: string | null
          feature_count: number | null
          id: string
          name: string
          notes: string | null
          row_count: number | null
          source: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          disease_type?: string | null
          feature_count?: number | null
          id?: string
          name: string
          notes?: string | null
          row_count?: number | null
          source?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          disease_type?: string | null
          feature_count?: number | null
          id?: string
          name?: string
          notes?: string | null
          row_count?: number | null
          source?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datasets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_notes: {
        Row: {
          created_at: string
          doctor_id: string
          doctor_name: string | null
          id: string
          note: string
          patient_id: string
          prediction_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          doctor_name?: string | null
          id?: string
          note: string
          patient_id: string
          prediction_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          doctor_name?: string | null
          id?: string
          note?: string
          patient_id?: string
          prediction_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_notes_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          band: string
          components: Json
          created_at: string
          doctor_id: string
          id: string
          patient_id: string
          score: number
        }
        Insert: {
          band: string
          components?: Json
          created_at?: string
          doctor_id: string
          id?: string
          patient_id: string
          score: number
        }
        Update: {
          band?: string
          components?: Json
          created_at?: string
          doctor_id?: string
          id?: string
          patient_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      model_metrics: {
        Row: {
          accuracy: number | null
          auc_roc: number | null
          confusion_matrix: Json | null
          created_at: string
          dataset_size: number | null
          disease_type: string | null
          f1_score: number | null
          id: string
          model_name: string
          precision_score: number | null
          recall: number | null
          training_date: string | null
        }
        Insert: {
          accuracy?: number | null
          auc_roc?: number | null
          confusion_matrix?: Json | null
          created_at?: string
          dataset_size?: number | null
          disease_type?: string | null
          f1_score?: number | null
          id?: string
          model_name: string
          precision_score?: number | null
          recall?: number | null
          training_date?: string | null
        }
        Update: {
          accuracy?: number | null
          auc_roc?: number | null
          confusion_matrix?: Json | null
          created_at?: string
          dataset_size?: number | null
          disease_type?: string | null
          f1_score?: number | null
          id?: string
          model_name?: string
          precision_score?: number | null
          recall?: number | null
          training_date?: string | null
        }
        Relationships: []
      }
      models: {
        Row: {
          accuracy: number | null
          algorithm: string
          confusion_matrix: Json | null
          created_at: string
          cv_score: number | null
          disease_type: string
          f1_score: number | null
          feature_importance: Json | null
          id: string
          is_best: boolean
          precision_score: number | null
          recall: number | null
          roc_auc: number | null
          trained_at: string
          updated_at: string
          version: string
        }
        Insert: {
          accuracy?: number | null
          algorithm: string
          confusion_matrix?: Json | null
          created_at?: string
          cv_score?: number | null
          disease_type: string
          f1_score?: number | null
          feature_importance?: Json | null
          id?: string
          is_best?: boolean
          precision_score?: number | null
          recall?: number | null
          roc_auc?: number | null
          trained_at?: string
          updated_at?: string
          version?: string
        }
        Update: {
          accuracy?: number | null
          algorithm?: string
          confusion_matrix?: Json | null
          created_at?: string
          cv_score?: number | null
          disease_type?: string
          f1_score?: number | null
          feature_importance?: Json | null
          id?: string
          is_best?: boolean
          precision_score?: number | null
          recall?: number | null
          roc_auc?: number | null
          trained_at?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      patients: {
        Row: {
          age: number | null
          contact: string | null
          created_at: string
          created_by: string
          gender: string | null
          id: string
          medical_history: string | null
          name: string
        }
        Insert: {
          age?: number | null
          contact?: string | null
          created_at?: string
          created_by: string
          gender?: string | null
          id?: string
          medical_history?: string | null
          name: string
        }
        Update: {
          age?: number | null
          contact?: string | null
          created_at?: string
          created_by?: string
          gender?: string | null
          id?: string
          medical_history?: string | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prediction_audit: {
        Row: {
          api_base_url: string
          api_error: string | null
          api_latency_ms: number | null
          api_status_code: number | null
          created_at: string
          disease: string
          id: string
          model_version: string | null
          request_payload: Json
          request_payload_hash: string
          risk_level: string | null
          risk_score: number | null
          user_id: string | null
        }
        Insert: {
          api_base_url: string
          api_error?: string | null
          api_latency_ms?: number | null
          api_status_code?: number | null
          created_at?: string
          disease: string
          id?: string
          model_version?: string | null
          request_payload: Json
          request_payload_hash: string
          risk_level?: string | null
          risk_score?: number | null
          user_id?: string | null
        }
        Update: {
          api_base_url?: string
          api_error?: string | null
          api_latency_ms?: number | null
          api_status_code?: number | null
          created_at?: string
          disease?: string
          id?: string
          model_version?: string | null
          request_payload?: Json
          request_payload_hash?: string
          risk_level?: string | null
          risk_score?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      predictions: {
        Row: {
          confidence: number | null
          created_at: string
          disease_type: string
          doctor_id: string | null
          id: string
          input_features: Json
          model_used: string | null
          patient_id: string | null
          prediction_result: string | null
          risk_level: string | null
          risk_score: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          disease_type: string
          doctor_id?: string | null
          id?: string
          input_features?: Json
          model_used?: string | null
          patient_id?: string | null
          prediction_result?: string | null
          risk_level?: string | null
          risk_score?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          disease_type?: string
          doctor_id?: string | null
          id?: string
          input_features?: Json
          model_used?: string | null
          patient_id?: string | null
          prediction_result?: string | null
          risk_level?: string | null
          risk_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "predictions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          institution: string | null
          role: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          institution?: string | null
          role?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          institution?: string | null
          role?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          date_range_end: string | null
          date_range_start: string | null
          generated_at: string
          generated_by: string
          id: string
          parameters: Json | null
          patient_id: string | null
          title: string | null
          type: string
        }
        Insert: {
          date_range_end?: string | null
          date_range_start?: string | null
          generated_at?: string
          generated_by: string
          id?: string
          parameters?: Json | null
          patient_id?: string | null
          title?: string | null
          type: string
        }
        Update: {
          date_range_end?: string | null
          date_range_start?: string | null
          generated_at?: string
          generated_by?: string
          id?: string
          parameters?: Json | null
          patient_id?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_prediction_audit: {
        Args: {
          _api_base_url: string
          _api_error: string
          _api_latency_ms: number
          _api_status_code: number
          _disease: string
          _model_version: string
          _request_payload: Json
          _request_payload_hash: string
          _risk_level: string
          _risk_score: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "doctor" | "patient" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["doctor", "patient", "admin"],
    },
  },
} as const
