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
    PostgrestVersion: "14.17"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      address: {
        Row: {
          city: string | null
          country_code: string | null
          location_id: number
          postal_code: string | null
          region: string | null
          street_one: string | null
          street_two: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          location_id: number
          postal_code?: string | null
          region?: string | null
          street_one?: string | null
          street_two?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          location_id?: number
          postal_code?: string | null
          region?: string | null
          street_one?: string | null
          street_two?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "address_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
        ]
      }
      allowed_signup_domains: {
        Row: {
          domain: string
        }
        Insert: {
          domain: string
        }
        Update: {
          domain?: string
        }
        Relationships: []
      }
      area: {
        Row: {
          area_id: number
          floor: string | null
          location_id: number
          name: string
          noise_policy: string | null
          phone_policy_id: number | null
          time_limit_minutes: number | null
          wheelchair_accessible: boolean | null
        }
        Insert: {
          area_id?: never
          floor?: string | null
          location_id: number
          name: string
          noise_policy?: string | null
          phone_policy_id?: number | null
          time_limit_minutes?: number | null
          wheelchair_accessible?: boolean | null
        }
        Update: {
          area_id?: never
          floor?: string | null
          location_id?: number
          name?: string
          noise_policy?: string | null
          phone_policy_id?: number | null
          time_limit_minutes?: number | null
          wheelchair_accessible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "area_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "area_phone_policy_id_fkey"
            columns: ["phone_policy_id"]
            isOneToOne: false
            referencedRelation: "phone_policy"
            referencedColumns: ["phone_policy_id"]
          },
        ]
      }
      backend_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      campus: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      capacity: {
        Row: {
          capacity_id: number
          label: string
        }
        Insert: {
          capacity_id: number
          label: string
        }
        Update: {
          capacity_id?: number
          label?: string
        }
        Relationships: []
      }
      crowd_level: {
        Row: {
          crowd_level_id: number
          label: string
        }
        Insert: {
          crowd_level_id: number
          label: string
        }
        Update: {
          crowd_level_id?: number
          label?: string
        }
        Relationships: []
      }
      day: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      day_hours: {
        Row: {
          close_time: string
          day: string
          location_id: number
          open_time: string
        }
        Insert: {
          close_time: string
          day: string
          location_id: number
          open_time: string
        }
        Update: {
          close_time?: string
          day?: string
          location_id?: number
          open_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "day_hours_day_fkey"
            columns: ["day"]
            isOneToOne: false
            referencedRelation: "day"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "day_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
        ]
      }
      flag: {
        Row: {
          flag_id: number
          photo_id: number | null
          post_id: number | null
          reason: string
          reported_user_id: string | null
          review_id: number | null
          status: string
          user_id: string
        }
        Insert: {
          flag_id?: never
          photo_id?: number | null
          post_id?: number | null
          reason: string
          reported_user_id?: string | null
          review_id?: number | null
          status?: string
          user_id?: string
        }
        Update: {
          flag_id?: never
          photo_id?: number | null
          post_id?: number | null
          reason?: string
          reported_user_id?: string | null
          review_id?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flag_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "post_photo"
            referencedColumns: ["photo_id"]
          },
          {
            foreignKeyName: "flag_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "flag_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_vote_summary"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "flag_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flag_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "review"
            referencedColumns: ["review_id"]
          },
          {
            foreignKeyName: "flag_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      follow: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id?: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      location: {
        Row: {
          campus: string | null
          geo_location: unknown
          google_place_id: string | null
          latitude: number
          location_id: number
          location_type: string
          longitude: number
          name: string
          osm_id: number | null
          osm_type: string | null
          price_range_id: number | null
        }
        Insert: {
          campus?: string | null
          geo_location?: unknown
          google_place_id?: string | null
          latitude: number
          location_id?: never
          location_type: string
          longitude: number
          name: string
          osm_id?: number | null
          osm_type?: string | null
          price_range_id?: number | null
        }
        Update: {
          campus?: string | null
          geo_location?: unknown
          google_place_id?: string | null
          latitude?: number
          location_id?: never
          location_type?: string
          longitude?: number
          name?: string
          osm_id?: number | null
          osm_type?: string | null
          price_range_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_campus_fkey"
            columns: ["campus"]
            isOneToOne: false
            referencedRelation: "campus"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "location_location_type_fkey"
            columns: ["location_type"]
            isOneToOne: false
            referencedRelation: "location_type"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "location_price_range_id_fkey"
            columns: ["price_range_id"]
            isOneToOne: false
            referencedRelation: "price_range"
            referencedColumns: ["price_range_id"]
          },
        ]
      }
      location_type: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      noise_level: {
        Row: {
          label: string
          noise_level_id: number
        }
        Insert: {
          label: string
          noise_level_id: number
        }
        Update: {
          label?: string
          noise_level_id?: number
        }
        Relationships: []
      }
      outlet_level: {
        Row: {
          label: string
          outlet_level_id: number
        }
        Insert: {
          label: string
          outlet_level_id: number
        }
        Update: {
          label?: string
          outlet_level_id?: number
        }
        Relationships: []
      }
      overall_ratings: {
        Row: {
          average_rating: number | null
          comfort_rating: number | null
          noise_rating: number | null
          review_count: number
          seating_id: number
          wifi_rating: number | null
        }
        Insert: {
          average_rating?: number | null
          comfort_rating?: number | null
          noise_rating?: number | null
          review_count?: number
          seating_id: number
          wifi_rating?: number | null
        }
        Update: {
          average_rating?: number | null
          comfort_rating?: number | null
          noise_rating?: number | null
          review_count?: number
          seating_id?: number
          wifi_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "overall_ratings_seating_id_fkey"
            columns: ["seating_id"]
            isOneToOne: true
            referencedRelation: "seating_area"
            referencedColumns: ["seating_id"]
          },
        ]
      }
      phone_policy: {
        Row: {
          label: string
          phone_policy_id: number
        }
        Insert: {
          label: string
          phone_policy_id: number
        }
        Update: {
          label?: string
          phone_policy_id?: number
        }
        Relationships: []
      }
      post: {
        Row: {
          caption: string | null
          created_at: string
          crowd_level_id: number
          location_id: number
          noise_level_id: number | null
          post_id: number
          seating_id: number | null
          user_id: string
          wifi_mbps: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          crowd_level_id: number
          location_id: number
          noise_level_id?: number | null
          post_id?: never
          seating_id?: number | null
          user_id?: string
          wifi_mbps?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          crowd_level_id?: number
          location_id?: number
          noise_level_id?: number | null
          post_id?: never
          seating_id?: number | null
          user_id?: string
          wifi_mbps?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_crowd_level_id_fkey"
            columns: ["crowd_level_id"]
            isOneToOne: false
            referencedRelation: "crowd_level"
            referencedColumns: ["crowd_level_id"]
          },
          {
            foreignKeyName: "post_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "post_noise_level_id_fkey"
            columns: ["noise_level_id"]
            isOneToOne: false
            referencedRelation: "noise_level"
            referencedColumns: ["noise_level_id"]
          },
          {
            foreignKeyName: "post_seating_id_location_id_fkey"
            columns: ["seating_id", "location_id"]
            isOneToOne: false
            referencedRelation: "seating_area"
            referencedColumns: ["seating_id", "location_id"]
          },
          {
            foreignKeyName: "post_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_photo: {
        Row: {
          created_at: string
          photo_id: number
          post_id: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          photo_id?: never
          post_id: number
          storage_path: string
        }
        Update: {
          created_at?: string
          photo_id?: never
          post_id?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_photo_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "post_photo_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_vote_summary"
            referencedColumns: ["post_id"]
          },
        ]
      }
      price_range: {
        Row: {
          label: string
          price_range_id: number
        }
        Insert: {
          label: string
          price_range_id: number
        }
        Update: {
          label?: string
          price_range_id?: number
        }
        Relationships: []
      }
      review: {
        Row: {
          comfort_rating: number | null
          comment: string | null
          created_at: string
          noise_rating: number | null
          overall_rating: number
          review_id: number
          seating_id: number
          user_id: string
          wifi_rating: number | null
        }
        Insert: {
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string
          noise_rating?: number | null
          overall_rating: number
          review_id?: never
          seating_id: number
          user_id?: string
          wifi_rating?: number | null
        }
        Update: {
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string
          noise_rating?: number | null
          overall_rating?: number
          review_id?: never
          seating_id?: number
          user_id?: string
          wifi_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_seating_id_fkey"
            columns: ["seating_id"]
            isOneToOne: false
            referencedRelation: "seating_area"
            referencedColumns: ["seating_id"]
          },
          {
            foreignKeyName: "review_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      review_photo: {
        Row: {
          created_at: string
          photo_id: number
          review_id: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          photo_id?: never
          review_id: number
          storage_path: string
        }
        Update: {
          created_at?: string
          photo_id?: never
          review_id?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_photo_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "review"
            referencedColumns: ["review_id"]
          },
        ]
      }
      saved_spot: {
        Row: {
          created_at: string
          location_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          location_id: number
          user_id?: string
        }
        Update: {
          created_at?: string
          location_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_spot_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "saved_spot_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      seat_type: {
        Row: {
          name: string
        }
        Insert: {
          name: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      seating_area: {
        Row: {
          area_id: number | null
          capacity_id: number
          location_id: number
          name: string
          near_window: boolean
          outlet_level_id: number
          reservable: boolean
          seat_type: string
          seating_id: number
        }
        Insert: {
          area_id?: number | null
          capacity_id: number
          location_id: number
          name: string
          near_window?: boolean
          outlet_level_id: number
          reservable?: boolean
          seat_type: string
          seating_id?: never
        }
        Update: {
          area_id?: number | null
          capacity_id?: number
          location_id?: number
          name?: string
          near_window?: boolean
          outlet_level_id?: number
          reservable?: boolean
          seat_type?: string
          seating_id?: never
        }
        Relationships: [
          {
            foreignKeyName: "seating_area_area_id_location_id_fkey"
            columns: ["area_id", "location_id"]
            isOneToOne: false
            referencedRelation: "area"
            referencedColumns: ["area_id", "location_id"]
          },
          {
            foreignKeyName: "seating_area_capacity_id_fkey"
            columns: ["capacity_id"]
            isOneToOne: false
            referencedRelation: "capacity"
            referencedColumns: ["capacity_id"]
          },
          {
            foreignKeyName: "seating_area_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
          {
            foreignKeyName: "seating_area_outlet_level_id_fkey"
            columns: ["outlet_level_id"]
            isOneToOne: false
            referencedRelation: "outlet_level"
            referencedColumns: ["outlet_level_id"]
          },
          {
            foreignKeyName: "seating_area_seat_type_fkey"
            columns: ["seat_type"]
            isOneToOne: false
            referencedRelation: "seat_type"
            referencedColumns: ["name"]
          },
        ]
      }
      user_preferences: {
        Row: {
          notify_saved_updates: boolean
          preferred_amenities: string[]
          preferred_noise: number | null
          user_id: string
        }
        Insert: {
          notify_saved_updates?: boolean
          preferred_amenities?: string[]
          preferred_noise?: number | null
          user_id?: string
        }
        Update: {
          notify_saved_updates?: boolean
          preferred_amenities?: string[]
          preferred_noise?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_preferred_noise_fkey"
            columns: ["preferred_noise"]
            isOneToOne: false
            referencedRelation: "noise_level"
            referencedColumns: ["noise_level_id"]
          },
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          name: string
          user_id: string
          user_type: string
        }
        Insert: {
          created_at?: string
          email: string
          name: string
          user_id: string
          user_type?: string
        }
        Update: {
          created_at?: string
          email?: string
          name?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      vote: {
        Row: {
          created_at: string
          post_id: number
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          post_id: number
          updated_at?: string
          user_id?: string
          value: number
        }
        Update: {
          created_at?: string
          post_id?: number
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "vote_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "vote_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_vote_summary"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "vote_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      open_flags: {
        Row: {
          flag_id: number | null
          photo_id: number | null
          post_id: number | null
          reason: string | null
          report_count: number | null
          reported_user_id: string | null
          reporter_id: string | null
          review_id: number | null
          status: string | null
        }
        Insert: {
          flag_id?: number | null
          photo_id?: number | null
          post_id?: number | null
          reason?: string | null
          report_count?: never
          reported_user_id?: string | null
          reporter_id?: string | null
          review_id?: number | null
          status?: string | null
        }
        Update: {
          flag_id?: number | null
          photo_id?: number | null
          post_id?: number | null
          reason?: string | null
          report_count?: never
          reported_user_id?: string | null
          reporter_id?: string | null
          review_id?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flag_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "post_photo"
            referencedColumns: ["photo_id"]
          },
          {
            foreignKeyName: "flag_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "flag_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_vote_summary"
            referencedColumns: ["post_id"]
          },
          {
            foreignKeyName: "flag_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "flag_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "review"
            referencedColumns: ["review_id"]
          },
          {
            foreignKeyName: "flag_user_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      post_vote_summary: {
        Row: {
          downvotes: number | null
          location_id: number | null
          my_vote: number | null
          post_id: number | null
          upvotes: number | null
          vote_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["location_id"]
          },
        ]
      }
    }
    Functions: {
      attach_review_photos: {
        Args: { p_photo_paths: string[]; p_review_id: number }
        Returns: undefined
      }
      backend_setting: { Args: { p_key: string }; Returns: string }
      cast_vote: {
        Args: { p_post_id: number; p_value: number }
        Returns: undefined
      }
      check_school_email: { Args: { event: Json }; Returns: Json }
      create_post: {
        Args: {
          p_caption: string
          p_crowd_level_id: number
          p_location_id: number
          p_noise_level_id: number
          p_photo_paths: string[]
          p_seating_id: number
          p_wifi_mbps: number
        }
        Returns: number
      }
      get_campus_feed: {
        Args: {
          p_before_created_at?: string
          p_before_post_id?: number
          p_limit?: number
          p_saved_only?: boolean
        }
        Returns: {
          author_name: string
          caption: string
          created_at: string
          crowd_level: string
          crowd_level_id: number
          location_id: number
          location_name: string
          noise_level: string
          noise_level_id: number
          photo_path: string
          post_id: number
          user_id: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      nearby_locations: {
        Args: {
          after_latitude?: number
          after_location_id?: number
          after_longitude?: number
          campus_filter?: string
          lat: number
          location_type_filter?: string
          lon: number
          name_filter?: string
          page_size?: number
          price_range_filter?: number
          radius_m: number
        }
        Returns: {
          campus: string | null
          geo_location: unknown
          google_place_id: string | null
          latitude: number
          location_id: number
          location_type: string
          longitude: number
          name: string
          osm_id: number | null
          osm_type: string | null
          price_range_id: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "location"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      refresh_overall_ratings: {
        Args: { p_seating_id: number }
        Returns: undefined
      }
      search_locations: {
        Args: {
          lat?: number
          lon?: number
          query: string
          result_limit?: number
        }
        Returns: {
          campus: string | null
          geo_location: unknown
          google_place_id: string | null
          latitude: number
          location_id: number
          location_type: string
          longitude: number
          name: string
          osm_id: number | null
          osm_type: string | null
          price_range_id: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "location"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_osm_places: { Args: { places: Json }; Returns: number[] }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
