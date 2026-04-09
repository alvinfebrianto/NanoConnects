import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  sanitizeInput,
  validateEmail,
  validatePassword,
  validateRequired,
  validateUserType,
} from "@/lib/security";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    userType: "sme" | "influencer"
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_SELECT_FIELDS =
  "id,name,email,user_type,avatar_url,bio,phone,email_verified,status,last_login_at,created_at,updated_at" as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(USER_SELECT_FIELDS)
        .eq("id", userId)
        .single();

      if (error?.code === "PGRST116") {
        return;
      }

      if (error) {
        console.error("Error fetching user:", error);
        return;
      }

      setUser(data as User);
    } catch (error) {
      console.error("Error in fetchUser:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await fetchUser(session.user.id);
      }
    } catch (error) {
      console.error("Error checking user:", error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUser(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkUser, fetchUser]);

  async function login(email: string, password: string) {
    const emailError = validateAuthInput(email, password);
    if (emailError) {
      throw new Error(emailError);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  }

  async function register(
    name: string,
    email: string,
    password: string,
    userType: "sme" | "influencer"
  ) {
    const nameValidation = validateRequired(name, "Nama");
    if (!nameValidation.valid) {
      throw new Error(nameValidation.error);
    }

    const sanitizedName = sanitizeInput(name.trim());
    if (sanitizedName.length < 2) {
      throw new Error("Nama minimal 2 karakter");
    }

    const emailError = validateAuthInput(email, password);
    if (emailError) {
      throw new Error(emailError);
    }

    if (!validateUserType(userType)) {
      throw new Error("Tipe pengguna tidak valid");
    }

    const { error: signUpError, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: sanitizedName, user_type: userType },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      throw signUpError;
    }

    if (!data.session) {
      throw new Error(
        "Silakan verifikasi email Anda untuk menyelesaikan pendaftaran."
      );
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function validateAuthInput(
  email: string,
  password: string
): string | undefined {
  const emailValidation = validateRequired(email, "Email");
  if (!emailValidation.valid) {
    return emailValidation.error;
  }

  if (!validateEmail(email)) {
    return "Masukkan alamat email yang valid";
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return passwordValidation.error;
  }

  return undefined;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context && process.env.NODE_ENV === "development") {
    return {
      user: null,
      isLoading: false,
      login: async () => undefined,
      register: async () => undefined,
      logout: async () => undefined,
    };
  }
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
