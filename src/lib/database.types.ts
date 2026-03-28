export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password_hash: string;
          user_type: "sme" | "influencer" | "admin";
          avatar_url: string | null;
          bio: string | null;
          phone: string | null;
          email_verified: boolean;
          status: "active" | "inactive" | "suspended";
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password_hash?: string;
          user_type: "sme" | "influencer" | "admin";
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          email_verified?: boolean;
          status?: "active" | "inactive" | "suspended";
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password_hash?: string;
          user_type?: "sme" | "influencer" | "admin";
          avatar_url?: string | null;
          bio?: string | null;
          phone?: string | null;
          email_verified?: boolean;
          status?: "active" | "inactive" | "suspended";
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      influencers: {
        Row: {
          id: string;
          user_id: string;
          followers_count: number;
          engagement_rate: number;
          niche: string;
          price_per_post: number;
          instagram_handle: string | null;
          tiktok_handle: string | null;
          youtube_handle: string | null;
          twitter_handle: string | null;
          location: string;
          languages: string[];
          content_categories: string[];
          is_available: boolean;
          avg_delivery_days: number;
          portfolio_url: string | null;
          verification_status: "pending" | "verified" | "rejected";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          followers_count?: number;
          engagement_rate?: number;
          niche?: string;
          price_per_post?: number;
          instagram_handle?: string | null;
          tiktok_handle?: string | null;
          youtube_handle?: string | null;
          twitter_handle?: string | null;
          location?: string;
          languages?: string[];
          content_categories?: string[];
          is_available?: boolean;
          avg_delivery_days?: number;
          portfolio_url?: string | null;
          verification_status?: "pending" | "verified" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          followers_count?: number;
          engagement_rate?: number;
          niche?: string;
          price_per_post?: number;
          instagram_handle?: string | null;
          tiktok_handle?: string | null;
          youtube_handle?: string | null;
          twitter_handle?: string | null;
          location?: string;
          languages?: string[];
          content_categories?: string[];
          is_available?: boolean;
          avg_delivery_days?: number;
          portfolio_url?: string | null;
          verification_status?: "pending" | "verified" | "rejected";
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          influencer_id: string;
          sme_id: string;
          order_status:
            | "pending"
            | "in_progress"
            | "completed"
            | "cancelled"
            | "disputed";
          payment_status: "pending" | "paid" | "refunded" | "failed";
          total_price: number;
          platform_fee: number;
          title: string;
          description: string | null;
          requirements: string | null;
          deliverables: string[];
          delivery_date: string | null;
          completed_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          influencer_id: string;
          sme_id: string;
          order_status?:
            | "pending"
            | "in_progress"
            | "completed"
            | "cancelled"
            | "disputed";
          payment_status?: "pending" | "paid" | "refunded" | "failed";
          total_price: number;
          platform_fee?: number;
          title: string;
          description?: string | null;
          requirements?: string | null;
          deliverables?: string[];
          delivery_date?: string | null;
          completed_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          influencer_id?: string;
          sme_id?: string;
          order_status?:
            | "pending"
            | "in_progress"
            | "completed"
            | "cancelled"
            | "disputed";
          payment_status?: "pending" | "paid" | "refunded" | "failed";
          total_price?: number;
          platform_fee?: number;
          title?: string;
          description?: string | null;
          requirements?: string | null;
          deliverables?: string[];
          delivery_date?: string | null;
          completed_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          rating: number;
          comment: string | null;
          is_verified: boolean;
          helpful_count: number;
          reported: boolean;
          report_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          rating: number;
          comment?: string | null;
          is_verified?: boolean;
          helpful_count?: number;
          reported?: boolean;
          report_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          rating?: number;
          comment?: string | null;
          is_verified?: boolean;
          helpful_count?: number;
          reported?: boolean;
          report_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      public_user_profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          bio: string | null;
        };
      };
    };
    Functions: {
      get_homepage_stats: {
        Args: Record<PropertyKey, never>;
        Returns: {
          umkm_count: number;
          influencer_count: number;
          successful_campaign_count: number;
          satisfaction_rate: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
